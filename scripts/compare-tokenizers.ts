// Compares token estimates with the counts the provider reported, using the
// requests from saved eval runs. No model calls: the provider's counts are
// already in the run files.
//
//   pnpm tsx scripts/compare-tokenizers.ts

import { readFile } from "node:fs/promises"

import { countTokens } from "gpt-tokenizer"

import { getDataset } from "@/features/evals/datasets"
import { type RunReport } from "@/features/evals/types"
import { buildPrompt, getPrompt } from "@/features/prompts"

// Runs whose requests can be rebuilt exactly: one-turn cases, sent in full.
const RUNS = [
  "evals/results/2026-11-19T19-59-21-707Z.json",
  "evals/results/2026-11-19T20-00-40-088Z.json",
]

const MESSAGE_OVERHEAD = 4
const chars = (text: string) => Math.ceil(text.length / 4)

function summarize(label: string, errors: number[]) {
  const mean = errors.reduce((a, b) => a + b, 0) / errors.length
  const meanAbs = errors.reduce((a, b) => a + Math.abs(b), 0) / errors.length
  const worst = Math.max(...errors.map(Math.abs))
  console.log(
    `${label.padEnd(22)} mean error ${(mean * 100).toFixed(1)}%, mean absolute ${(meanAbs * 100).toFixed(1)}%, worst ${(worst * 100).toFixed(1)}%`
  )
}

const byCount: Record<string, number[]> = { "4 characters": [], o200k: [] }

for (const file of RUNS) {
  const report = JSON.parse(await readFile(file, "utf8")) as RunReport
  const dataset = getDataset(report.dataset)!
  const date = new Date(report.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  for (const result of report.results) {
    const testCase = dataset.cases.find((c) => c.id === result.caseId)!
    const prompt = getPrompt(result.promptId)!
    const { system } = buildPrompt(prompt, { date })
    const texts = [
      system,
      ...(testCase.history ?? []).map((turn) => turn.content),
      testCase.input,
    ]
    const overhead = MESSAGE_OVERHEAD * (texts.length - 1)
    const estimate =
      texts.reduce((sum, text) => sum + chars(text), 0) + overhead
    const o200k =
      texts.reduce((sum, text) => sum + countTokens(text), 0) + overhead
    const actual = result.inputTokens
    byCount["4 characters"].push((estimate - actual) / actual)
    byCount.o200k.push((o200k - actual) / actual)
  }
}

console.log(`${byCount.o200k.length} requests, against the provider's count`)
for (const [label, errors] of Object.entries(byCount)) summarize(label, errors)
