import {
  firstRelevantRank,
  retrievalMetrics,
  type RetrievalCase,
} from "@/features/search/metrics"
import { search, type EmbedQuery } from "@/features/search/search"
import {
  SEARCH_METHODS,
  type ChunkStrategy,
  type SearchIndex,
  type SearchMethod,
} from "@/features/search/types"

// How deep the ranking is checked. Recall@k is reported up to this k.
const DEPTH = 10
const KS = [1, 3, 5]

export interface RetrievalSummary {
  strategy: ChunkStrategy
  method: SearchMethod
  chunks: number
  recall: Record<number, number>
  mrr: number
  mrrByKind: Record<RetrievalCase["kind"], number>
}

export interface RetrievalReport {
  id: string
  createdAt: string
  model: string
  cases: number
  summaries: RetrievalSummary[]
  // The rank of the first relevant chunk per case, per strategy and method.
  ranks: Record<string, Record<string, number | null>>
}

const round = (value: number) => Math.round(value * 1000) / 1000

export async function evaluateRetrieval({
  indexes,
  cases,
  model,
  embedQuery,
}: {
  indexes: SearchIndex[]
  cases: RetrievalCase[]
  model: string
  embedQuery: EmbedQuery
}): Promise<RetrievalReport> {
  // Each question is embedded once and reused for every index.
  const vectors = new Map<string, number[]>()
  const cachedEmbed: EmbedQuery = async (query) => {
    let vector = vectors.get(query)
    if (!vector) {
      vector = await embedQuery(query)
      vectors.set(query, vector)
    }
    return vector
  }

  const summaries: RetrievalSummary[] = []
  const ranks: RetrievalReport["ranks"] = {}

  for (const index of indexes) {
    for (const method of SEARCH_METHODS) {
      const caseRanks: (number | undefined)[] = []
      const key = `${index.strategy}/${method}`
      ranks[key] = {}
      for (const testCase of cases) {
        const hits = await search({
          index,
          query: testCase.question,
          method,
          k: DEPTH,
          embedQuery: cachedEmbed,
        })
        const rank = firstRelevantRank(
          hits.map((hit) => hit.chunk),
          testCase
        )
        caseRanks.push(rank)
        ranks[key][testCase.id] = rank ?? null
      }

      const { recall, mrr } = retrievalMetrics(caseRanks, KS)
      const byKind = (kind: RetrievalCase["kind"]) =>
        round(
          retrievalMetrics(
            caseRanks.filter((_, i) => cases[i].kind === kind),
            KS
          ).mrr
        )
      summaries.push({
        strategy: index.strategy,
        method,
        chunks: index.chunks.length,
        recall: Object.fromEntries(
          Object.entries(recall).map(([k, v]) => [k, round(v)])
        ),
        mrr: round(mrr),
        mrrByKind: {
          paraphrase: byKind("paraphrase"),
          keyword: byKind("keyword"),
        },
      })
    }
  }

  const createdAt = new Date()
  return {
    id: createdAt.toISOString().replace(/[:.]/g, "-"),
    createdAt: createdAt.toISOString(),
    model,
    cases: cases.length,
    summaries,
    ranks,
  }
}

export function toMarkdown(report: RetrievalReport) {
  const header =
    "| Chunking | Search | Chunks | Recall@1 | Recall@3 | Recall@5 | MRR | MRR, paraphrased | MRR, keyword |"
  const rows = report.summaries.map(
    (s) =>
      `| ${s.strategy} | ${s.method} | ${s.chunks} | ${s.recall[1]} | ${s.recall[3]} | ${s.recall[5]} | ${s.mrr} | ${s.mrrByKind.paraphrase} | ${s.mrrByKind.keyword} |`
  )
  const keys = Object.keys(report.ranks)
  const caseIds = Object.keys(report.ranks[keys[0]] ?? {})
  const rankTable = [
    `| Case | ${keys.join(" | ")} |`,
    `| --- | ${keys.map(() => "---").join(" | ")} |`,
    ...caseIds.map(
      (id) =>
        `| ${id} | ${keys.map((key) => report.ranks[key][id] ?? "–").join(" | ")} |`
    ),
  ]

  return `# Retrieval run ${report.id}

- **Embedding model:** ${report.model}
- **Questions:** ${report.cases}
- **Date:** ${report.createdAt}

A chunk is relevant when it contains the passage that answers the question. Recall@k is the share of questions with a relevant chunk in the top k. MRR is the mean of 1 / rank of the first relevant chunk, and 0 when none is in the top ${DEPTH}.

${header}
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}

## Rank of the first relevant chunk

– means not in the top ${DEPTH}.

${rankTable.join("\n")}
`
}
