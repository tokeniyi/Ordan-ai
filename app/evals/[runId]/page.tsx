import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { RunView } from "@/features/evals/components/run-view"
import { listReports } from "@/features/evals/load"

export const metadata: Metadata = {
  title: "Eval run · Ordan AI",
}

export const dynamicParams = false

export async function generateStaticParams() {
  const runs = await listReports()
  return runs.map((run) => ({ runId: run.id }))
}

export default async function Page({
  params,
}: {
  params: Promise<{ runId: string }>
}) {
  const { runId } = await params
  const runs = await listReports()
  const report = runs.find((run) => run.id === runId)

  if (!report) {
    notFound()
  }

  return <RunView report={report} runs={runs} />
}
