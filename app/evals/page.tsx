import type { Metadata } from "next"

import { NoRuns, RunView } from "@/features/evals/components/run-view"
import { listReports } from "@/features/evals/load"

export const metadata: Metadata = {
  title: "Evals · Ordan AI",
}

export default async function Page() {
  const runs = await listReports()
  const latest = runs[0]

  return latest ? <RunView report={latest} runs={runs} /> : <NoRuns />
}
