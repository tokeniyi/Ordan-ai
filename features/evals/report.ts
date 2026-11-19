import {
  caseStatus,
  failureReasons,
  QUALITY_THRESHOLD,
} from "@/features/evals/status"
import { type RunReport } from "@/features/evals/types"

function table(rows: (string | number)[][]) {
  const [header, ...body] = rows
  return [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...body.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n")
}

// A readable version of a run, saved next to the JSON.
export function toMarkdown(report: RunReport) {
  const hasSummary = report.summaries.some(
    (s) => s.avgSummaryTokens !== undefined
  )
  const summary = table([
    [
      "Prompt",
      "Passed",
      "Quality",
      "Checks",
      "Correct",
      "Relevant",
      "Clear",
      "Avg input tokens",
      "Avg output tokens",
      ...(hasSummary ? ["Avg summary tokens"] : []),
      "Avg latency",
      "Cost",
      "Errors",
    ],
    ...report.summaries.map((s) => [
      `${s.promptId} v${s.promptVersion}`,
      `${s.passed}/${s.cases}`,
      s.quality,
      `${s.checksPassed}/${s.checksTotal}`,
      s.correctness,
      s.relevance,
      s.clarity,
      s.avgInputTokens ?? "–",
      s.avgOutputTokens,
      ...(hasSummary ? [s.avgSummaryTokens ?? 0] : []),
      `${(s.avgLatencyMs / 1000).toFixed(1)}s`,
      `$${s.totalCostUsd}`,
      s.errors,
    ]),
  ])

  const failures = report.results.filter(
    (result) => caseStatus(result) !== "passed"
  )

  const failureList = failures.length
    ? failures
        .map(
          (result) =>
            `- **${result.promptId} / ${result.caseId}:** ${failureReasons(result).join("; ")}`
        )
        .join("\n")
    : "None."

  return `# Eval run ${report.id}

- **Dataset:** ${report.dataset}
- **Model:** ${report.model}
- **Judge:** ${report.judgeModel}
${report.history ? `- **History:** ${report.history.strategy}, budget ${report.history.budget} tokens\n` : ""}- **Date:** ${report.createdAt}

A case passes when all its checks pass and the judge scores it at least ${QUALITY_THRESHOLD}. Quality is the judge's mean score for correctness, relevance and clarity, scaled to 0 to 100. Checks counts the deterministic checks that passed.

${summary}

## Failed cases

${failureList}
`
}
