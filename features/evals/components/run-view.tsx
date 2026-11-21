import Link from "next/link"

import { CaseResults } from "@/features/evals/components/case-results"
import { SummaryTable } from "@/features/evals/components/summary-table"
import { QUALITY_THRESHOLD } from "@/features/evals/status"
import { type RunReport } from "@/features/evals/types"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  })
}

export function NoRuns() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No eval runs yet</EmptyTitle>
          <EmptyDescription>
            Run <code>pnpm eval</code>, then commit the files it writes to
            evals/results.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}

export function RunView({
  report,
  runs,
}: {
  report: RunReport
  runs: RunReport[]
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-6">
        <section className="flex flex-col gap-2">
          <h1 className="text-xl font-medium">Evals</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Each prompt answers the same test set. Deterministic checks test
            facts and format, and a second model judges correctness, relevance
            and clarity. A case passes when its checks pass and the judge scores
            it at least {QUALITY_THRESHOLD}.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline">{formatDate(report.createdAt)} UTC</Badge>
            <Badge variant="outline">Dataset: {report.dataset}</Badge>
            <Badge variant="outline">Model: {report.model}</Badge>
            <Badge variant="outline">Judge: {report.judgeModel}</Badge>
            {report.history && (
              <Badge variant="outline">
                History: {report.history.strategy}, {report.history.budget}{" "}
                tokens
              </Badge>
            )}
            {report.knowledge && (
              <Badge variant="outline">Knowledge: {report.knowledge}</Badge>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Summary</h2>
          <SummaryTable summaries={report.summaries} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Cases</h2>
          <CaseResults summaries={report.summaries} results={report.results} />
        </section>

        {runs.length > 1 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">All runs</h2>
            <ul className="flex flex-col gap-1 text-sm">
              {runs.map((run) => (
                <li key={run.id}>
                  <Link
                    href={`/evals/${run.id}`}
                    className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline aria-[current=page]:text-foreground"
                    aria-current={run.id === report.id ? "page" : undefined}
                  >
                    {formatDate(run.createdAt)} UTC · {run.dataset} ·{" "}
                    {run.summaries.map((s) => s.promptId).join(", ")}
                    {run.knowledge
                      ? ` · knowledge: ${run.knowledge}`
                      : run.dataset !== "core" &&
                        run.history &&
                        ` · ${run.history.strategy}`}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
