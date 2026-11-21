import { type Chunk } from "@/features/search/types"

// A retrieval test case: a question, and a short passage from the document
// that answers it. A chunk is relevant when it contains the whole passage.
export interface RetrievalCase {
  id: string
  question: string
  docId: string
  evidence: string
  // "paraphrase" questions avoid the document's words, "keyword" questions
  // reuse them. Semantic search should win the first, keyword search the
  // second.
  kind: "paraphrase" | "keyword"
}

const normalize = (text: string) =>
  text.toLowerCase().replace(/\s+/g, " ").trim()

export function isRelevant(
  chunk: Pick<Chunk, "docId" | "text">,
  testCase: Pick<RetrievalCase, "docId" | "evidence">
) {
  return (
    chunk.docId === testCase.docId &&
    normalize(chunk.text).includes(normalize(testCase.evidence))
  )
}

// The rank of the first relevant chunk, or undefined if none was returned.
export function firstRelevantRank(
  ranked: Pick<Chunk, "docId" | "text">[],
  testCase: Pick<RetrievalCase, "docId" | "evidence">
) {
  const index = ranked.findIndex((chunk) => isRelevant(chunk, testCase))
  return index === -1 ? undefined : index + 1
}

// Recall@k: the share of questions with a relevant chunk in the top k.
// MRR: the mean of 1 / rank of the first relevant chunk (0 when missing), so
// rank 1 scores 1, rank 2 scores 0.5, and so on.
export function retrievalMetrics(
  ranks: (number | undefined)[],
  ks = [1, 3, 5]
) {
  const n = Math.max(1, ranks.length)
  const recall = Object.fromEntries(
    ks.map((k) => [
      k,
      ranks.filter((r) => r !== undefined && r <= k).length / n,
    ])
  ) as Record<number, number>
  const mrr = ranks.reduce<number>((sum, r) => sum + (r ? 1 / r : 0), 0) / n
  return { recall, mrr }
}
