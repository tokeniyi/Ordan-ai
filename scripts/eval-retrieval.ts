// Measures retrieval on the Kestrel corpus: every chunking strategy, with
// semantic and keyword search, against the questions in
// features/search/eval/cases.ts. Embeddings run locally, so it is free.
//
//   pnpm eval:retrieval
//
// Results are written to evals/retrieval as JSON and Markdown.

import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { EMBEDDING_MODEL, embedTexts } from "@/lib/ai/provider"
import { RETRIEVAL_CASES } from "@/features/search/eval/cases"
import { evaluateRetrieval, toMarkdown } from "@/features/search/eval/run"
import { loadIndex } from "@/features/search/index-files"
import { CHUNK_STRATEGIES } from "@/features/search/types"

const OUT_DIR = "evals/retrieval"

async function main() {
  const indexes = await Promise.all(CHUNK_STRATEGIES.map((s) => loadIndex(s)))
  const report = await evaluateRetrieval({
    indexes,
    cases: RETRIEVAL_CASES,
    model: EMBEDDING_MODEL,
    embedQuery: async (query) => (await embedTexts([query]))[0],
  })

  console.table(
    report.summaries.map((s) => ({
      strategy: s.strategy,
      method: s.method,
      chunks: s.chunks,
      "recall@1": s.recall[1],
      "recall@3": s.recall[3],
      "recall@5": s.recall[5],
      MRR: s.mrr,
      "MRR paraphrase": s.mrrByKind.paraphrase,
      "MRR keyword": s.mrrByKind.keyword,
    }))
  )

  await mkdir(OUT_DIR, { recursive: true })
  const base = path.join(OUT_DIR, report.id)
  await writeFile(`${base}.json`, JSON.stringify(report, null, 2) + "\n")
  await writeFile(`${base}.md`, toMarkdown(report))
  console.log(`\nSaved ${base}.json and .md`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
