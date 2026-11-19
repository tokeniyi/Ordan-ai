import "server-only"

import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

import { summarize } from "@/features/evals/summarize"
import { type RunReport } from "@/features/evals/types"

const RESULTS_DIR = path.join(process.cwd(), "evals", "results")

// Reads the saved runs, newest first. Runs are read at build time, so the
// page shows the runs committed to the repo.
export async function listReports(): Promise<RunReport[]> {
  let files: string[]
  try {
    files = await readdir(RESULTS_DIR)
  } catch {
    return []
  }

  const reports = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => {
        const text = await readFile(path.join(RESULTS_DIR, file), "utf8")
        const report = JSON.parse(text) as RunReport
        // Recompute the summaries, so older runs use the current pass rule.
        const prompts = report.summaries.map((summary) => ({
          id: summary.promptId,
          version: summary.promptVersion,
        }))
        return { ...report, summaries: summarize(prompts, report.results) }
      })
  )

  return reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getReport(id: string) {
  const reports = await listReports()
  return reports.find((report) => report.id === id)
}
