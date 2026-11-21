// Chunks the corpus with every strategy, embeds the chunks with the local
// embedding model, and writes one index file per strategy to data/index.
//
//   pnpm index
//
// Run it after changing the corpus, a chunker or the embedding model, and
// commit the files it writes.

import { mkdir, writeFile } from "node:fs/promises"

import {
  EMBEDDING_MAX_TOKENS,
  EMBEDDING_MODEL,
  embedTexts,
  embeddingTokenCounter,
} from "@/lib/ai/provider"
import { buildIndex } from "@/features/search/build-index"
import { loadCorpus } from "@/features/search/corpus"
import { INDEX_DIR, indexPath } from "@/features/search/index-files"
import { CHUNK_STRATEGIES } from "@/features/search/types"

async function main() {
  const docs = await loadCorpus()
  const count = await embeddingTokenCounter()
  await mkdir(INDEX_DIR, { recursive: true })

  console.log(`${docs.length} documents, embedded with ${EMBEDDING_MODEL}`)
  for (const strategy of CHUNK_STRATEGIES) {
    const started = Date.now()
    const index = await buildIndex({
      docs,
      strategy,
      model: EMBEDDING_MODEL,
      count,
      embed: embedTexts,
    })
    const tokens = index.chunks.map((chunk) => chunk.tokens)
    // The model adds two special tokens to each text.
    const over = tokens.filter((t) => t + 2 > EMBEDDING_MAX_TOKENS).length
    await writeFile(indexPath(strategy), JSON.stringify(index) + "\n")
    console.log(
      `${strategy.padEnd(19)} ${String(index.chunks.length).padStart(3)} chunks, ` +
        `${Math.round(tokens.reduce((a, b) => a + b, 0) / tokens.length)} tokens on average, ` +
        `${Math.max(...tokens)} at most, ${over} cut off, ${Date.now() - started} ms`
    )
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
