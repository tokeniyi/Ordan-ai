import { createKeywordIndex } from "@/features/search/keyword"
import { cosine, topK } from "@/features/search/vectors"
import {
  type Chunk,
  type IndexedChunk,
  type SearchHit,
  type SearchIndex,
  type SearchMethod,
} from "@/features/search/types"

// Embeds the query. The server passes the real model, tests a fake.
export type EmbedQuery = (query: string) => Promise<number[]>

// Results go to the browser, which has no use for 384 numbers per chunk.
function withoutVector(chunk: IndexedChunk): Chunk {
  const copy: Partial<IndexedChunk> = { ...chunk }
  delete copy.vector
  return copy as Chunk
}

const keywordIndexes = new WeakMap<
  SearchIndex,
  ReturnType<typeof createKeywordIndex>
>()

// An in-memory vector store: every chunk is compared with the query. That is
// fine for a few hundred chunks. Large stores use approximate indexes such as
// HNSW to avoid comparing with everything.
export async function search({
  index,
  query,
  method,
  k = 5,
  embedQuery,
}: {
  index: SearchIndex
  query: string
  method: SearchMethod
  k?: number
  embedQuery: EmbedQuery
}): Promise<SearchHit[]> {
  let scores: number[]
  if (method === "semantic") {
    const vector = await embedQuery(query)
    scores = index.chunks.map((chunk) => cosine(vector, chunk.vector))
  } else {
    let keyword = keywordIndexes.get(index)
    if (!keyword) {
      keyword = createKeywordIndex(index.chunks)
      keywordIndexes.set(index, keyword)
    }
    scores = keyword.score(query)
  }

  return topK(scores, k).map(({ score, index: position }, rank) => ({
    rank: rank + 1,
    score: Math.round(score * 1000) / 1000,
    chunk: withoutVector(index.chunks[position]),
  }))
}
