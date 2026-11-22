import { reciprocalRankFusion } from "@/features/search/fusion"
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
  const semantic = async () => {
    const vector = await embedQuery(query)
    return index.chunks.map((chunk) => cosine(vector, chunk.vector))
  }
  const keyword = () => {
    let keywordIndex = keywordIndexes.get(index)
    if (!keywordIndex) {
      keywordIndex = createKeywordIndex(index.chunks)
      keywordIndexes.set(index, keywordIndex)
    }
    return keywordIndex.score(query)
  }

  let ranked: { score: number; index: number }[]
  if (method === "hybrid") {
    // Every chunk the two methods score above zero takes part, not only
    // their top k, so a chunk ranked 12th by both can still come out on top.
    const all = index.chunks.length
    const rankings = [await semantic(), keyword()].map((scores) =>
      topK(scores, all).map((hit) => hit.index)
    )
    ranked = reciprocalRankFusion(rankings).slice(0, k)
  } else {
    ranked = topK(method === "semantic" ? await semantic() : keyword(), k)
  }

  return ranked.map(({ score, index: position }, rank) => ({
    rank: rank + 1,
    score: Math.round(score * 1000) / 1000,
    chunk: withoutVector(index.chunks[position]),
  }))
}
