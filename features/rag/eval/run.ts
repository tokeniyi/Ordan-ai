import {
  BASIC_SETTINGS,
  runRetrieval,
  type RetrievalCalls,
  type RetrievalSettings,
} from "@/features/rag/pipeline"
import { type Turn } from "@/features/rag/query"
import {
  firstRelevantRank,
  retrievalMetrics,
  type RetrievalCase,
} from "@/features/search/metrics"
import { type SearchIndex } from "@/features/search/types"

// Measures the retrieval pipelines in features/rag/pipeline.ts on the
// retrieval questions, and the planner on messages that need no search.

export interface PipelineConfig {
  id: string
  label: string
  settings: RetrievalSettings
}

const s = (overrides: Partial<RetrievalSettings>) => ({
  ...BASIC_SETTINGS,
  ...overrides,
})

// Each technique alone, then together. "basic" is phase 5's retrieval.
export const PIPELINES: PipelineConfig[] = [
  { id: "basic", label: "Semantic (phase 5)", settings: s({}) },
  { id: "hybrid", label: "Hybrid", settings: s({ method: "hybrid" }) },
  { id: "rerank", label: "Semantic + rerank", settings: s({ rerank: true }) },
  {
    id: "hybrid-rerank",
    label: "Hybrid + rerank",
    settings: s({ method: "hybrid", rerank: true }),
  },
  { id: "plan", label: "Plan", settings: s({ plan: true }) },
  {
    id: "plan-hyde",
    label: "Plan + HyDE",
    settings: s({ plan: true, expand: "hyde" }),
  },
  {
    id: "plan-multi",
    label: "Plan + multi-query",
    settings: s({ plan: true, expand: "multi" }),
  },
  {
    id: "plan-rerank",
    label: "Plan + rerank",
    settings: s({ plan: true, rerank: true }),
  },
  {
    id: "rerank-fused",
    label: "Semantic + rerank, fused",
    settings: s({ rerank: true, fuseRerank: true }),
  },
  {
    id: "plan-rerank-fused",
    label: "Plan + rerank, fused",
    settings: s({ plan: true, rerank: true, fuseRerank: true }),
  },
  {
    id: "plan-hybrid-rerank",
    label: "Plan + hybrid + rerank",
    settings: s({ plan: true, method: "hybrid", rerank: true }),
  },
  {
    id: "plan-hyde-rerank",
    label: "Plan + HyDE + rerank",
    settings: s({ plan: true, expand: "hyde", rerank: true }),
  },
  {
    id: "plan-multi-hybrid-rerank",
    label: "Plan + multi-query + hybrid + rerank",
    settings: s({
      plan: true,
      expand: "multi",
      method: "hybrid",
      rerank: true,
    }),
  },
]

// Ranks are checked to this depth, as in the phase 4 retrieval eval.
const DEPTH = 10
const KS = [1, 3, 4, 5]
const KINDS: RetrievalCase["kind"][] = ["paraphrase", "keyword", "follow-up"]

export interface NoSearchCase {
  id: string
  history?: { role: "user" | "assistant"; content: string }[]
  message: string
}

export interface PipelineSummary {
  id: string
  label: string
  recall: Record<number, number>
  mrr: number
  mrrByKind: Record<RetrievalCase["kind"], number>
  // Questions the planner wrongly decided not to search.
  wronglySkipped: number
  // Messages that need no search and were not searched. Missing without a
  // planner, which searches everything.
  skipped?: number
  // Model calls per question, and the local time of search and reranking.
  modelCalls: number
  localMs: number
}

export interface PipelineReport {
  id: string
  createdAt: string
  model: string
  cases: number
  noSearchCases: number
  summaries: PipelineSummary[]
  ranks: Record<string, Record<string, number | null>>
  // What the planner searched with, per question, for reading the report.
  queries: Record<string, string>
  latency: Record<string, { calls: number; medianMs: number }>
}

const round = (value: number) => Math.round(value * 1000) / 1000

function toTurns(
  history: { role: "user" | "assistant"; content: string }[] = [],
  message: string
): Turn[] {
  return [
    ...history.map((turn) => ({ role: turn.role, text: turn.content })),
    { role: "user" as const, text: message },
  ]
}

export async function evaluatePipelines({
  index,
  cases,
  noSearchCases,
  pipelines = PIPELINES,
  calls,
  model,
  latency = {},
  onProgress,
}: {
  index: SearchIndex
  cases: RetrievalCase[]
  noSearchCases: NoSearchCase[]
  pipelines?: PipelineConfig[]
  calls: RetrievalCalls
  model: string
  // Real latencies of the model calls, by kind, filled in by the caller's
  // cache, so a cached run still reports how long the calls took.
  latency?: PipelineReport["latency"]
  onProgress?: (message: string) => void
}): Promise<PipelineReport> {
  const summaries: PipelineSummary[] = []
  const ranks: PipelineReport["ranks"] = {}
  const queries: PipelineReport["queries"] = {}

  for (const pipeline of pipelines) {
    const { settings } = pipeline
    const caseRanks: (number | undefined)[] = []
    let wronglySkipped = 0
    let localMs = 0
    let modelCalls = 0
    ranks[pipeline.id] = {}

    for (const testCase of cases) {
      const result = await runRetrieval({
        index,
        turns: toTurns(testCase.history, testCase.question),
        settings,
        calls,
      })
      if (!result.searched) wronglySkipped++
      if (settings.plan && pipeline.id === "plan") {
        queries[testCase.id] = result.query
      }
      for (const step of result.steps) {
        if (step.type === "plan" || step.type === "expand") modelCalls++
        else localMs += step.ms
      }
      const rank = firstRelevantRank(
        result.ranked.slice(0, DEPTH).map((hit) => hit.chunk),
        testCase
      )
      caseRanks.push(rank)
      ranks[pipeline.id][testCase.id] = rank ?? null
    }

    let skipped: number | undefined
    if (settings.plan) {
      skipped = 0
      for (const testCase of noSearchCases) {
        const result = await runRetrieval({
          index,
          turns: toTurns(testCase.history, testCase.message),
          settings,
          calls,
        })
        if (!result.searched) skipped++
      }
    }

    const { recall, mrr } = retrievalMetrics(caseRanks, KS)
    summaries.push({
      id: pipeline.id,
      label: pipeline.label,
      recall: Object.fromEntries(
        Object.entries(recall).map(([k, v]) => [k, round(v)])
      ),
      mrr: round(mrr),
      mrrByKind: Object.fromEntries(
        KINDS.map((kind) => [
          kind,
          round(
            retrievalMetrics(
              caseRanks.filter((_, i) => cases[i].kind === kind),
              KS
            ).mrr
          ),
        ])
      ) as PipelineSummary["mrrByKind"],
      wronglySkipped,
      ...(skipped !== undefined && { skipped }),
      modelCalls: round(modelCalls / cases.length),
      localMs: Math.round(localMs / cases.length),
    })
    onProgress?.(`${pipeline.id}: MRR ${round(mrr)}`)
  }

  const createdAt = new Date()
  return {
    id: createdAt.toISOString().replace(/[:.]/g, "-"),
    createdAt: createdAt.toISOString(),
    model,
    cases: cases.length,
    noSearchCases: noSearchCases.length,
    summaries,
    ranks,
    queries,
    latency,
  }
}

export function toMarkdown(report: PipelineReport) {
  const rows = report.summaries.map(
    (s) =>
      `| ${s.label} | ${s.recall[1]} | ${s.recall[3]} | ${s.recall[4]} | ${s.recall[5]} | ${s.mrr} | ${s.mrrByKind.paraphrase} | ${s.mrrByKind.keyword} | ${s.mrrByKind["follow-up"]} | ${s.skipped === undefined ? "–" : `${s.skipped}/${report.noSearchCases}`} | ${s.wronglySkipped} | ${s.modelCalls} | ${s.localMs} |`
  )
  const ids = report.summaries.map((s) => s.id)
  const caseIds = Object.keys(report.ranks[ids[0]] ?? {})
  const rankTable = [
    `| Case | ${ids.join(" | ")} |`,
    `| --- | ${ids.map(() => "---").join(" | ")} |`,
    ...caseIds.map(
      (id) =>
        `| ${id} | ${ids.map((p) => report.ranks[p][id] ?? "–").join(" | ")} |`
    ),
  ]
  const latency = Object.entries(report.latency).map(
    ([kind, l]) => `| ${kind} | ${l.calls} | ${l.medianMs} |`
  )
  const queries = Object.entries(report.queries).map(
    ([id, query]) => `| ${id} | ${query.replace(/\|/g, "\\|")} |`
  )

  return `# Retrieval pipelines run ${report.id}

- **Planning and expansion model:** ${report.model}
- **Questions:** ${report.cases}, plus ${report.noSearchCases} messages that need no search
- **Index:** recursive-headings
- **Date:** ${report.createdAt}

Each pipeline returns 4 sources to the chat, so recall@4 is the share of questions whose passage reaches the model. MRR is the mean of 1 / rank of the first relevant chunk, and 0 when none is in the top ${DEPTH}. "Skipped" counts the messages that need no search and were not searched. "Wrongly skipped" counts questions that needed a search and did not get one. Local ms is search and reranking, without model calls.

| Pipeline | Recall@1 | Recall@3 | Recall@4 | Recall@5 | MRR | MRR, paraphrased | MRR, keyword | MRR, follow-up | Skipped | Wrongly skipped | Model calls | Local ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}

## Model call latency

| Call | Calls | Median ms |
| --- | --- | --- |
${latency.join("\n")}

## Rank of the first relevant chunk

– means not in the top ${DEPTH}.

${rankTable.join("\n")}

## What the planner searched with

| Case | Query |
| --- | --- |
${queries.join("\n")}
`
}
