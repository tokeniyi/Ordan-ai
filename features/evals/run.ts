import { generateText, type ModelMessage } from "ai"

import { getModel } from "@/lib/ai/provider"
import { cacheKey, type EvalCache } from "@/features/evals/cache"
import { runChecks } from "@/features/evals/checks"
import { MAX_OUTPUT_TOKENS, MAX_RETRIES } from "@/features/evals/config"
import { isRateLimitError } from "@/features/evals/errors"
import {
  JUDGE_SYSTEM_PROMPT,
  judgeAnswer,
  RAG_JUDGE_SYSTEM_PROMPT,
} from "@/features/evals/judge"
import { summarize } from "@/features/evals/summarize"
import {
  type CaseContext,
  type CaseRag,
  type CaseResult,
  type Dataset,
  type EvalCase,
  type HistorySettings,
  type JudgeScores,
  type RunReport,
} from "@/features/evals/types"
import { DEFAULT_STRATEGY, HISTORY_BUDGET } from "@/features/history/config"
import { prepareContext } from "@/features/history/prepare"
import { summarizeConversation } from "@/features/history/summarize"
import {
  estimateModelMessageTokens,
  messageText,
} from "@/features/history/tokens"
import { type HistoryMessage } from "@/features/history/types"
import { buildPrompt } from "@/features/prompts"
import { type PromptDefinition } from "@/features/prompts/types"
import { checkCitations, stripCitations } from "@/features/rag/citations"
import { retrieveKestrel } from "@/features/rag/kestrel"
import { withSources } from "@/features/rag/prompt"
import { type KnowledgeBase, type RagSource } from "@/features/rag/types"
import { firstRelevantRank } from "@/features/search/metrics"

export interface Answer {
  text: string
  latencyMs: number
  inputTokens: number
  outputTokens: number
  costUsd: number
}

export interface GenerateInput {
  model: string
  system: string
  examples: ModelMessage[]
  temperature?: number
  // Earlier turns that survived the history handling. Empty for one-turn
  // cases.
  history: ModelMessage[]
  input: string
}

export interface SummarizeInput {
  model: string
  previous?: string
  messages: HistoryMessage[]
}

export interface Summary {
  text: string
  inputTokens: number
  outputTokens: number
  costUsd: number
}

// The model calls the runner makes. Tests pass fakes instead.
export interface EvalCalls {
  generate: (input: GenerateInput) => Promise<Answer>
  judge: typeof judgeAnswer
  summarize: (input: SummarizeInput) => Promise<Summary>
  // Finds the sources for a question. Runs locally, so it is not cached.
  retrieve: (query: string) => Promise<RagSource[]>
}

async function generateAnswer({
  model,
  system,
  examples,
  temperature,
  history,
  input,
}: GenerateInput): Promise<Answer> {
  const started = Date.now()
  const result = await generateText({
    model: getModel(model),
    system,
    messages: [...examples, ...history, { role: "user", content: input }],
    temperature,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maxRetries: MAX_RETRIES,
  })
  return {
    text: result.text,
    latencyMs: Date.now() - started,
    inputTokens: result.usage.inputTokens ?? 0,
    outputTokens: result.usage.outputTokens ?? 0,
    costUsd: costOf(result.usage),
  }
}

async function summarizeHistory({
  model,
  previous,
  messages,
}: SummarizeInput): Promise<Summary> {
  const result = await summarizeConversation({
    modelId: model,
    previous,
    messages,
  })
  return {
    text: result.text,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    costUsd: costOf({ raw: result.raw }),
  }
}

const defaultCalls: EvalCalls = {
  generate: generateAnswer,
  judge: judgeAnswer,
  summarize: summarizeHistory,
  retrieve: async (query) => (await retrieveKestrel(query)).sources,
}

interface RunContext {
  calls: EvalCalls
  history: HistorySettings
  knowledge: KnowledgeBase
  model: string
  judgeModel: string
  judge: boolean
  cache?: EvalCache
  // Set once a call hits the rate limit. No new calls start after that.
  stopped: { reason?: string }
  count: { made: number; cached: number }
}

// Runs tasks with at most `limit` in flight at once.
async function pool<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>
) {
  const results: R[] = new Array(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const index = next++
      results[index] = await task(items[index])
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  )
  return results
}

// Kilo reports the cost of each call in the raw usage object.
function costOf(usage: { raw?: unknown }) {
  const cost = (usage.raw as { cost?: unknown } | undefined)?.cost
  return typeof cost === "number" ? cost : 0
}

// Returns the cached value for `key`, or calls `compute` and caches it.
// Refuses to start a call once the run has been stopped.
async function cached<T>(
  context: RunContext,
  key: string,
  compute: () => Promise<T>
): Promise<T> {
  const hit = await context.cache?.get<T>(key)
  if (hit !== undefined) {
    context.count.cached++
    return hit
  }

  if (context.stopped.reason) {
    throw new Error(`Skipped: ${context.stopped.reason}`)
  }

  context.count.made++
  try {
    const value = await compute()
    await context.cache?.set(key, value)
    return value
  } catch (error) {
    if (isRateLimitError(error)) {
      context.stopped.reason = "the provider's rate limit was reached"
    }
    throw error
  }
}

async function runCase(
  context: RunContext,
  prompt: PromptDefinition,
  testCase: EvalCase
): Promise<CaseResult> {
  const base = {
    caseId: testCase.id,
    category: testCase.category,
    input: testCase.input,
    promptId: prompt.id,
  }

  const built = buildPrompt(prompt)
  const { examples, temperature } = built

  let system = built.system
  let history: ModelMessage[] = []
  let caseContext: CaseContext | undefined
  let summaryCost = 0
  let sources: RagSource[] | undefined

  let answer: Answer
  try {
    // As in the chat route: sources for the newest question go into the
    // system prompt before the history is fitted to the budget.
    if (context.knowledge !== "none") {
      sources = await context.calls.retrieve(testCase.input)
      system = withSources(system, sources)
    }

    if (testCase.history?.length) {
      ;({ system, history, caseContext, summaryCost } = await prepareHistory(
        context,
        testCase,
        system,
        examples
      ))
    }

    answer = await cached(
      context,
      cacheKey({
        kind: "answer",
        model: context.model,
        system,
        examples,
        temperature,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        // Left out for one-turn cases, so their cache keys are unchanged.
        ...(history.length > 0 && { history }),
        input: testCase.input,
      }),
      () =>
        context.calls.generate({
          model: context.model,
          system,
          examples,
          temperature,
          history,
          input: testCase.input,
        })
    )
  } catch (error) {
    return {
      ...base,
      answer: "",
      checks: [],
      checksPassed: false,
      latencyMs: 0,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      error: `Generation failed: ${error instanceof Error ? error.message : String(error)}`,
    }
  }

  const checks = runChecks(testCase.checks ?? [], answer.text)
  const rag = sources && ragResult(testCase, sources, answer.text)
  const result: CaseResult = {
    ...base,
    answer: answer.text,
    checks,
    checksPassed: checks.every((check) => check.passed),
    latencyMs: answer.latencyMs,
    inputTokens: answer.inputTokens,
    outputTokens: answer.outputTokens,
    costUsd: answer.costUsd + summaryCost,
    ...(caseContext && { context: caseContext }),
    ...(rag && { rag }),
  }

  if (!context.judge) {
    return result
  }

  try {
    const scores = await cached<JudgeScores>(
      context,
      cacheKey({
        kind: "judge",
        model: context.judgeModel,
        system: JUDGE_SYSTEM_PROMPT,
        input: testCase.input,
        reference: testCase.reference,
        answer: answer.text,
        // Left out without sources, so earlier cache keys are unchanged.
        ...(sources && {
          ragSystem: RAG_JUDGE_SYSTEM_PROMPT,
          sources: sources.map((source) => [source.n, source.text]),
        }),
      }),
      () =>
        context.calls.judge({
          modelId: context.judgeModel,
          testCase,
          answer: answer.text,
          sources,
        })
    )
    result.judge = scores
    result.quality = Math.round(
      ((scores.correctness + scores.relevance + scores.clarity) / 15) * 100
    )
  } catch (error) {
    result.error = `Judging failed: ${error instanceof Error ? error.message : String(error)}`
  }

  return result
}

// Runs a multi-turn case's history through the same code as the chat, so the
// eval measures what the chat does. Summaries are cached like answers.
async function prepareHistory(
  context: RunContext,
  testCase: EvalCase,
  system: string,
  examples: ModelMessage[]
) {
  const messages: HistoryMessage[] = [
    ...(testCase.history ?? []),
    { role: "user" as const, content: testCase.input },
  ].map((turn, index) => ({
    id: `${testCase.id}-${index}`,
    role: turn.role,
    parts: [
      {
        type: "text" as const,
        // Earlier answers in knowledge cases were written with sources, and
        // the chat strips their citations, so the eval does too.
        text:
          context.knowledge !== "none" && turn.role === "assistant"
            ? stripCitations(turn.content)
            : turn.content,
      },
    ],
  }))

  const usage = { input: 0, output: 0, cost: 0 }
  const prepared = await prepareContext({
    system,
    messages,
    strategy: context.history.strategy,
    budget: context.history.budget,
    fixedTokens: estimateModelMessageTokens(examples),
    summarize: async ({ previous, messages: evicted }) => {
      const summary = await cached(
        context,
        cacheKey({
          kind: "summary",
          model: context.model,
          previous,
          messages: evicted.map((m) => [m.role, messageText(m)]),
        }),
        () =>
          context.calls.summarize({
            model: context.model,
            previous,
            messages: evicted,
          })
      )
      usage.input += summary.inputTokens
      usage.output += summary.outputTokens
      usage.cost += summary.costUsd
      return summary.text
    },
  })

  // A summary that failed because of the rate limit must not be scored as a
  // window run. Stop the case, and the run, instead.
  if (context.stopped.reason) {
    throw new Error(`Skipped: ${context.stopped.reason}`)
  }

  return {
    system: prepared.system,
    // The last message is the input, which is sent separately.
    history: prepared.messages
      .slice(0, -1)
      .map((message): ModelMessage =>
        message.role === "user"
          ? { role: "user", content: messageText(message) }
          : { role: "assistant", content: messageText(message) }
      ),
    caseContext: {
      totalMessages: prepared.info.totalMessages,
      sentMessages: prepared.info.sentMessages,
      summarized: Boolean(prepared.info.summarized),
      summaryFailed: Boolean(prepared.info.summaryFailed),
      summaryInputTokens: usage.input,
      summaryOutputTokens: usage.output,
    },
    summaryCost: usage.cost,
  }
}

// Where the case's evidence ranked among the sources, and what the answer
// cited.
export function ragResult(
  testCase: EvalCase,
  sources: RagSource[],
  answer: string
): CaseRag {
  const { cited, invalid } = checkCitations(answer, sources.length)
  const evidenceRank = testCase.retrieval
    ? firstRelevantRank(sources, testCase.retrieval)
    : undefined
  return {
    sources: sources.map(({ n, chunkId, score }) => ({ n, chunkId, score })),
    hasEvidence: Boolean(testCase.retrieval),
    ...(evidenceRank !== undefined && { evidenceRank }),
    cited,
    invalidCitations: invalid,
  }
}

export async function runEval({
  dataset,
  prompts,
  model,
  judgeModel,
  judge = true,
  history,
  knowledge,
  concurrency,
  cache,
  calls = defaultCalls,
  onResult,
}: {
  dataset: Dataset
  prompts: PromptDefinition[]
  model: string
  judgeModel: string
  judge?: boolean
  // How multi-turn cases handle their history. Defaults to the chat's.
  history?: Partial<HistorySettings>
  // The documents to answer from. Defaults to the dataset's, or none.
  knowledge?: KnowledgeBase
  concurrency: number
  cache?: EvalCache
  calls?: EvalCalls
  onResult?: (result: CaseResult) => void
}): Promise<
  RunReport & { calls: RunContext["count"]; stoppedReason?: string }
> {
  const createdAt = new Date()
  const settings: HistorySettings = {
    strategy: history?.strategy ?? DEFAULT_STRATEGY,
    budget: history?.budget ?? dataset.historyBudget ?? HISTORY_BUDGET,
  }
  const context: RunContext = {
    history: settings,
    knowledge: knowledge ?? dataset.knowledge ?? "none",
    model,
    judgeModel,
    judge,
    cache,
    calls,
    stopped: {},
    count: { made: 0, cached: 0 },
  }

  const jobs = prompts.flatMap((prompt) =>
    dataset.cases.map((testCase) => ({ prompt, testCase }))
  )

  const results = await pool(jobs, concurrency, async (job) => {
    const result = await runCase(context, job.prompt, job.testCase)
    onResult?.(result)
    return result
  })

  return {
    id: createdAt.toISOString().replace(/[:.]/g, "-"),
    createdAt: createdAt.toISOString(),
    dataset: dataset.id,
    model,
    judgeModel: judge ? judgeModel : "none",
    history: settings,
    ...((dataset.knowledge || knowledge) && { knowledge: context.knowledge }),
    summaries: summarize(prompts, results),
    results,
    calls: context.count,
    stoppedReason: context.stopped.reason,
  }
}
