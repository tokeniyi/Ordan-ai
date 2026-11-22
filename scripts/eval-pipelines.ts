// Measures the phase 6 retrieval pipelines (planning, HyDE, multi-query,
// hybrid search, reranking) on the retrieval questions. Search and reranking
// run locally. Planning and expansion call a model, and those replies are
// cached in evals/.cache, so a run cut short by the rate limit resumes.
//
//   pnpm eval:pipelines
//   pnpm eval:pipelines --pipelines basic,plan-rerank
//
// Results are written to evals/retrieval as JSON and Markdown.

import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import nextEnv from "@next/env"

nextEnv.loadEnvConfig(process.cwd())

const OUT_DIR = "evals/retrieval"

// --pipelines plan,plan-rerank runs only those pipelines.
const only = process.argv
  .find((arg, i, all) => all[i - 1] === "--pipelines")
  ?.split(",")

async function main() {
  const { embedTexts, hasApiKey, rerankScores } =
    await import("@/lib/ai/provider")
  const { cacheKey } = await import("@/features/evals/cache")
  const { CACHE_DIR, EVAL_MODEL, MAX_RETRIES } =
    await import("@/features/evals/config")
  const { isRateLimitError } = await import("@/features/evals/errors")
  const { fileCache } = await import("@/features/evals/file-cache")
  const { completeWith } = await import("@/features/rag/complete")
  const { RAG_STRATEGY } = await import("@/features/rag/config")
  const { evaluatePipelines, PIPELINES, toMarkdown } =
    await import("@/features/rag/eval/run")
  const { PLAN_SYSTEM_PROMPT, HYDE_SYSTEM_PROMPT } =
    await import("@/features/rag/query")
  const { NO_SEARCH_CASES, RETRIEVAL_CASES } =
    await import("@/features/search/eval/cases")
  const { loadIndex } = await import("@/features/search/index-files")

  if (!hasApiKey()) {
    throw new Error("KILO_API_KEY is not set. Add it to .env.local.")
  }

  const cache = fileCache(CACHE_DIR)
  const model = EVAL_MODEL
  const complete = completeWith(model, { maxRetries: MAX_RETRIES })
  const timings: Record<string, Map<string, number>> = {}
  let made = 0
  let reused = 0

  // Caches each reply with how long it took, so cached runs still report
  // real latency.
  const cachedComplete = async (request: {
    system: string
    prompt: string
  }) => {
    const kind =
      request.system === PLAN_SYSTEM_PROMPT
        ? "plan"
        : request.system === HYDE_SYSTEM_PROMPT
          ? "hyde"
          : "multi-query"
    const key = cacheKey({ kind: "retrieval-query", model, ...request })
    let entry = await cache.get<{ text: string; ms: number }>(key)
    if (entry) {
      reused++
    } else {
      const started = Date.now()
      const text = await complete(request)
      entry = { text, ms: Date.now() - started }
      await cache.set(key, entry)
      made++
      process.stdout.write(".")
    }
    ;(timings[kind] ??= new Map()).set(key, entry.ms)
    return entry.text
  }

  // Each text is embedded once, however many pipelines search with it.
  const vectors = new Map<string, number[]>()
  const embed = async (text: string) => {
    let vector = vectors.get(text)
    if (!vector) {
      vector = (await embedTexts([text]))[0]
      vectors.set(text, vector)
    }
    return vector
  }

  let report
  try {
    report = await evaluatePipelines({
      index: await loadIndex(RAG_STRATEGY),
      cases: RETRIEVAL_CASES,
      noSearchCases: NO_SEARCH_CASES,
      pipelines: only
        ? PIPELINES.filter((pipeline) => only.includes(pipeline.id))
        : PIPELINES,
      calls: { embed, complete: cachedComplete, scorePairs: rerankScores },
      model,
      onProgress: (message) => console.log(`\n${message}`),
    })
  } catch (error) {
    if (isRateLimitError(error)) {
      console.error(
        `\nStopped at the rate limit after ${made} new model calls. They are cached: run the same command again after the limit resets.`
      )
      process.exit(1)
    }
    throw error
  }

  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)] ?? 0
  }
  // Each distinct call once, so pipelines that share a call do not count it
  // several times.
  report.latency = Object.fromEntries(
    Object.entries(timings).map(([kind, byKey]) => {
      const values = [...byKey.values()]
      return [kind, { calls: values.length, medianMs: median(values) }]
    })
  )

  console.log(`\nModel calls: ${made} made, ${reused} reused from the cache.`)
  console.table(
    report.summaries.map((s) => ({
      pipeline: s.id,
      "recall@1": s.recall[1],
      "recall@4": s.recall[4],
      MRR: s.mrr,
      paraphrase: s.mrrByKind.paraphrase,
      keyword: s.mrrByKind.keyword,
      "follow-up": s.mrrByKind["follow-up"],
      skipped: s.skipped ?? "–",
      "wrongly skipped": s.wronglySkipped,
      "local ms": s.localMs,
    }))
  )

  await mkdir(OUT_DIR, { recursive: true })
  const base = path.join(OUT_DIR, `pipelines-${report.id}`)
  await writeFile(`${base}.json`, JSON.stringify(report, null, 2) + "\n")
  await writeFile(`${base}.md`, toMarkdown(report))
  console.log(`Saved ${base}.json and .md`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
