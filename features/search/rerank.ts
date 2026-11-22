import { type SearchHit } from "@/features/search/types"

// Scores how well each text answers the query, higher is better. The server
// passes a cross-encoder, tests a fake.
export type ScorePairs = (query: string, texts: string[]) => Promise<number[]>

// Reorders search hits with a reranker. A search model embeds the query and
// each chunk separately and compares the vectors. A cross-encoder reads the
// query and the chunk together, so it can see which words answer which, but
// it has to run once per chunk. So the search finds candidates cheaply and
// the reranker orders only those.
export async function rerank({
  query,
  hits,
  scorePairs,
}: {
  query: string
  hits: SearchHit[]
  scorePairs: ScorePairs
}): Promise<SearchHit[]> {
  if (hits.length === 0) return []
  // The embedded text carries the page title and heading, which help the
  // reranker as much as they help the search.
  const scores = await scorePairs(
    query,
    hits.map((hit) => hit.chunk.embedText)
  )
  return hits
    .map((hit, position) => ({ hit, score: scores[position] ?? 0, position }))
    .sort((a, b) => b.score - a.score || a.position - b.position)
    .map(({ hit, score }, position) => ({
      ...hit,
      rank: position + 1,
      score: Math.round(score * 1000) / 1000,
    }))
}
