import { generateText, type ModelMessage } from "ai"

import { getModel } from "@/lib/ai/provider"
import { cacheKey, type EvalCache } from "@/features/evals/cache"
import { runChecks } from "@/features/evals/checks"
import { MAX_OUTPUT_TOKENS, MAX_RETRIES } from "@/features/evals/config"
import { isRateLimitError } from "@/features/evals/errors"
import { JUDGE_SYSTEM_PROMPT, judgeAnswer } from "@/features/evals/judge"
import { summarize } from "@/features/evals/summarize"
import {
  type CaseResult,
  type Dataset,
  type EvalCase,
  type JudgeScores,
  type RunReport,
} from "@/features/evals/types"
import { buildPrompt } from "@/features/prompts"
import { type PromptDefinition } from "@/features/prompts/types"

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
  input: string
}

// The model calls the runner makes. Tests pass fakes instead.
export interface EvalCalls {
  generate: (input: GenerateInput) => Promise<Answer>
  judge: typeof judgeAnswer
}

async function generateAnswer({
  model,
  system,
  examples,
  temperature,
  input,
}: GenerateInput): Promise<Answer> {
  const started = Date.now()
  const result = await generateText({
    model: getModel(model),
    system,
    messages: [...examples, { role: "user", content: input }],
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

const defaultCalls: EvalCalls = { generate: generateAnswer, judge: judgeAnswer }

interface RunContext {
  calls: EvalCalls
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

  const { system, examples, temperature } = buildPrompt(prompt)

  let answer: Answer
  try {
    answer = await cached(
      context,
      cacheKey({
        kind: "answer",
        model: context.model,
        system,
        examples,
        temperature,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        input: testCase.input,
      }),
      () =>
        context.calls.generate({
          model: context.model,
          system,
          examples,
          temperature,
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
  const result: CaseResult = {
    ...base,
    answer: answer.text,
    checks,
    checksPassed: checks.every((check) => check.passed),
    latencyMs: answer.latencyMs,
    inputTokens: answer.inputTokens,
    outputTokens: answer.outputTokens,
    costUsd: answer.costUsd,
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
      }),
      () =>
        context.calls.judge({
          modelId: context.judgeModel,
          testCase,
          answer: answer.text,
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

export async function runEval({
  dataset,
  prompts,
  model,
  judgeModel,
  judge = true,
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
  concurrency: number
  cache?: EvalCache
  calls?: EvalCalls
  onResult?: (result: CaseResult) => void
}): Promise<
  RunReport & { calls: RunContext["count"]; stoppedReason?: string }
> {
  const createdAt = new Date()
  const context: RunContext = {
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
    summaries: summarize(prompts, results),
    results,
    calls: context.count,
    stoppedReason: context.stopped.reason,
  }
}
