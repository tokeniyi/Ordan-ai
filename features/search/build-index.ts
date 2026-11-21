import { CHUNK_SIZE, chunkDocument } from "@/features/search/chunk/strategies"
import { compact } from "@/features/search/vectors"
import {
  type ChunkStrategy,
  type CountTokens,
  type SearchDocument,
  type SearchIndex,
} from "@/features/search/types"

// Chunks every document and embeds every chunk. The model calls are passed
// in, so tests run without downloading a model.
export async function buildIndex({
  docs,
  strategy,
  model,
  count,
  embed,
  size = CHUNK_SIZE,
  batchSize = 32,
}: {
  docs: SearchDocument[]
  strategy: ChunkStrategy
  model: string
  count: CountTokens
  embed: (texts: string[]) => Promise<number[][]>
  size?: number
  batchSize?: number
}): Promise<SearchIndex> {
  const chunks = docs.flatMap((doc) =>
    chunkDocument(doc, strategy, { size, count })
  )

  const vectors: number[][] = []
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    vectors.push(...(await embed(batch.map((chunk) => chunk.embedText))))
  }

  return {
    strategy,
    model,
    dimensions: vectors[0]?.length ?? 0,
    createdAt: new Date().toISOString(),
    chunks: chunks.map((chunk, i) => ({
      ...chunk,
      vector: compact(vectors[i]),
    })),
  }
}
