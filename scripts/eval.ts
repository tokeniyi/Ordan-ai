// Runs the evaluation from the command line.
//
//   pnpm eval
//   pnpm eval --prompts structured,baseline --no-judge
//
// Results are written to evals/results as JSON and Markdown.

import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { parseArgs } from "node:util"

import nextEnv from "@next/env"

nextEnv.loadEnvConfig(process.cwd())

const { values } = parseArgs({
  options: {
    dataset: { type: "string", default: "core" },
    prompts: { type: "string" },
    cases: { type: "string" },
    model: { type: "string" },
    judge: { type: "string" },
    history: { type: "string" },
    budget: { type: "string" },
    "no-judge": { type: "boolean", default: false },
    "no-cache": { type: "boolean", default: false },
    concurrency: { type: "string" },
    out: { type: "string", default: "evals/results" },
    help: { type: "boolean", short: "h", default: false },
  },
})

if (values.help) {
  console.log(`Usage: pnpm eval [options]

  --dataset <id>       Test set to run (default: core)
  --prompts <ids>      Comma-separated prompt ids (default: all)
  --cases <ids>        Comma-separated case ids or categories (default: all)
  --model <id>         Model that answers (default: the eval model)
  --judge <id>         Model that scores (default: the judge model)
  --history <strategy> How multi-turn cases send their history: summary,
                       window or full (default: summary, as in the chat)
  --budget <tokens>    History budget for multi-turn cases (default: the
                       dataset's, or the chat's)
  --no-judge           Skip the judge and run only deterministic checks
  --no-cache           Call the models again instead of reusing cached results
  --concurrency <n>    Calls in flight at once
  --out <dir>          Where to write results (default: evals/results)`)
  process.exit(0)
}

async function main() {
  // Imported after the env is loaded, because the provider reads the key
  // when its module loads.
  const { hasApiKey } = await import("@/lib/ai/provider")
  const { CACHE_DIR, CONCURRENCY, EVAL_MODEL, JUDGE_MODEL } =
    await import("@/features/evals/config")
  const { fileCache } = await import("@/features/evals/file-cache")
  const { getDataset } = await import("@/features/evals/datasets")
  const { runEval } = await import("@/features/evals/run")
  const { caseStatus } = await import("@/features/evals/status")
  const { toMarkdown } = await import("@/features/evals/report")
  const { PROMPTS } = await import("@/features/prompts")
  const { HISTORY_STRATEGIES } = await import("@/features/history/types")

  if (!hasApiKey()) {
    throw new Error("KILO_API_KEY is not set. Add it to .env.local.")
  }

  const dataset = getDataset(values.dataset)
  if (!dataset) {
    throw new Error(`Unknown dataset "${values.dataset}".`)
  }

  const list = (value?: string) =>
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean)

  const promptIds = list(values.prompts)
  const prompts = promptIds
    ? promptIds.map((id) => {
        const prompt = PROMPTS.find((p) => p.id === id)
        if (!prompt) throw new Error(`Unknown prompt "${id}".`)
        return prompt
      })
    : PROMPTS

  const caseFilter = list(values.cases)
  const cases = caseFilter
    ? dataset.cases.filter(
        (c) => caseFilter.includes(c.id) || caseFilter.includes(c.category)
      )
    : dataset.cases

  if (cases.length === 0) {
    throw new Error("No cases match --cases.")
  }

  const strategy = HISTORY_STRATEGIES.find((s) => s === values.history)
  if (values.history && !strategy) {
    throw new Error(
      `Unknown history strategy "${values.history}". Use ${HISTORY_STRATEGIES.join(", ")}.`
    )
  }
  const budget = values.budget ? Number(values.budget) : undefined
  if (budget !== undefined && !(budget > 0)) {
    throw new Error("--budget must be a positive number of tokens.")
  }

  const model = values.model ?? EVAL_MODEL
  const judgeModel = values.judge ?? JUDGE_MODEL
  const judge = !values["no-judge"]
  const total = prompts.length * cases.length

  console.log(
    `Running ${cases.length} cases x ${prompts.length} prompts on ${model}` +
      (judge ? `, judged by ${judgeModel}` : ", without a judge")
  )
  if (cases.some((c) => c.history?.length)) {
    console.log(
      `History: ${strategy ?? "summary"}, budget ${budget ?? dataset.historyBudget ?? "default"} tokens`
    )
  }

  let done = 0
  const report = await runEval({
    dataset: { ...dataset, cases },
    prompts,
    model,
    judgeModel,
    judge,
    history: { strategy, budget },
    concurrency: Number(values.concurrency ?? CONCURRENCY),
    cache: values["no-cache"] ? undefined : fileCache(path.resolve(CACHE_DIR)),
    onResult: (result) => {
      done++
      const status = { passed: "pass ", failed: "FAIL ", error: "ERROR" }[
        caseStatus(result)
      ]
      const quality = result.quality !== undefined ? ` q=${result.quality}` : ""
      console.log(
        `[${String(done).padStart(String(total).length)}/${total}] ${status} ${result.promptId} / ${result.caseId}${quality}`
      )
    },
  })

  const { calls, stoppedReason, ...saved } = report
  console.log(
    `\nModel calls: ${calls.made} made, ${calls.cached} reused from the cache.`
  )

  if (stoppedReason) {
    // A partial run would be misleading next to complete ones, so it is not
    // saved. What finished is cached, so the next run picks up from here.
    console.error(
      `\nStopped early because ${stoppedReason}. Nothing was saved.\n` +
        "Finished answers are cached. Run the same command again later to continue."
    )
    process.exit(1)
  }

  const dir = path.resolve(values.out)
  await mkdir(dir, { recursive: true })
  const base = path.join(dir, report.id)
  await writeFile(`${base}.json`, JSON.stringify(saved, null, 2) + "\n")
  await writeFile(`${base}.md`, toMarkdown(saved))

  console.log("")
  console.table(
    report.summaries.map((s) => ({
      prompt: s.promptId,
      passed: `${s.passed}/${s.cases}`,
      quality: s.quality,
      checks: `${s.checksPassed}/${s.checksTotal}`,
      correct: s.correctness,
      relevant: s.relevance,
      clear: s.clarity,
      "in tokens": s.avgInputTokens,
      "out tokens": s.avgOutputTokens,
      ...(s.avgSummaryTokens !== undefined && {
        "summary tokens": s.avgSummaryTokens,
      }),
      latency: `${(s.avgLatencyMs / 1000).toFixed(1)}s`,
      errors: s.errors,
    }))
  )
  console.log(`\nSaved ${path.relative(process.cwd(), base)}.json and .md`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
