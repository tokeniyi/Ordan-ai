"use client"

import {
  CheckIcon,
  FlaskConicalIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"

import { caseStatus, failureReasons } from "@/features/evals/status"
import { type CaseResult, type PromptSummary } from "@/features/evals/types"
import { CodeBlock, CodeBlockContent } from "@/components/ui/code-block"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"

const icons = {
  passed: CheckIcon,
  failed: XIcon,
  error: TriangleAlertIcon,
}

function CaseRow({ result }: { result: CaseResult }) {
  const status = caseStatus(result)
  const Icon = icons[status]
  const reasons = failureReasons(result)

  return (
    <TraceCollapsible defaultOpen={status !== "passed"}>
      <TraceCollapsibleTrigger>
        <TraceLine status={status === "passed" ? undefined : "error"}>
          <TraceIcon>
            <Icon />
          </TraceIcon>
          <TraceTitle>{result.caseId}</TraceTitle>
          <TraceDescription>
            {result.quality !== undefined ? `quality ${result.quality}` : ""}
          </TraceDescription>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        <div className="flex flex-col gap-3 py-1 text-sm">
          <p className="text-foreground">{result.input}</p>
          {reasons.length > 0 && (
            <ul className="list-disc pl-5 text-destructive">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
          {result.judge && (
            <p>
              <span className="text-foreground">
                Judge: correct {result.judge.correctness}, relevant{" "}
                {result.judge.relevance}, clear {result.judge.clarity}.
              </span>{" "}
              {result.judge.reason}
            </p>
          )}
          {result.answer && (
            <CodeBlock size="sm">
              <CodeBlockContent wrap className="max-h-72">
                {result.answer}
              </CodeBlockContent>
            </CodeBlock>
          )}
        </div>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  )
}

// The shadcn/ui Test Results pattern: one collapsible suite per prompt, with
// a line per case. Failed cases open by default.
export function CaseResults({
  summaries,
  results,
}: {
  summaries: PromptSummary[]
  results: CaseResult[]
}) {
  return (
    <Trace>
      {summaries.map((summary) => {
        const own = results.filter((r) => r.promptId === summary.promptId)
        const failed = summary.cases - summary.passed

        return (
          <TraceCollapsible key={summary.promptId} defaultOpen={failed > 0}>
            <TraceCollapsibleTrigger>
              <TraceLine status={failed > 0 ? "error" : undefined}>
                <TraceIcon>
                  <FlaskConicalIcon />
                </TraceIcon>
                <TraceTitle>
                  {summary.promptId} v{summary.promptVersion}, {summary.cases}{" "}
                  cases{failed > 0 ? `, ${failed} failed` : ""}
                </TraceTitle>
              </TraceLine>
            </TraceCollapsibleTrigger>
            <TraceCollapsibleContent keepMounted>
              <Trace>
                {own.map((result) => (
                  <CaseRow key={result.caseId} result={result} />
                ))}
              </Trace>
            </TraceCollapsibleContent>
          </TraceCollapsible>
        )
      })}
    </Trace>
  )
}
