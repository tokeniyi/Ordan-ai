import { type PromptSummary } from "@/features/evals/types"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function seconds(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`
}

export function SummaryTable({ summaries }: { summaries: PromptSummary[] }) {
  const best = Math.max(...summaries.map((s) => s.passed))
  const hasSummary = summaries.some((s) => s.avgSummaryTokens !== undefined)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Prompt</TableHead>
          <TableHead className="text-right">Passed</TableHead>
          <TableHead className="text-right">Quality</TableHead>
          <TableHead className="text-right">Checks</TableHead>
          <TableHead className="text-right">Correct</TableHead>
          <TableHead className="text-right">Relevant</TableHead>
          <TableHead className="text-right">Clear</TableHead>
          <TableHead className="text-right">Avg input tokens</TableHead>
          <TableHead className="text-right">Avg output tokens</TableHead>
          {hasSummary && (
            <TableHead className="text-right">Avg summary tokens</TableHead>
          )}
          <TableHead className="text-right">Avg latency</TableHead>
          <TableHead className="text-right">Cost</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {summaries.map((s) => (
          <TableRow key={s.promptId}>
            <TableCell className="font-medium">
              <span className="flex items-center gap-2">
                {s.promptId}
                <span className="text-muted-foreground">
                  v{s.promptVersion}
                </span>
                {s.passed === best && <Badge variant="secondary">Best</Badge>}
                {s.errors > 0 && (
                  <Badge variant="destructive">{s.errors} errors</Badge>
                )}
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {s.passed}/{s.cases}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {s.quality}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {s.checksPassed}/{s.checksTotal}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {s.correctness}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {s.relevance}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {s.clarity}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {s.avgInputTokens ?? "–"}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {s.avgOutputTokens}
            </TableCell>
            {hasSummary && (
              <TableCell className="text-right tabular-nums">
                {s.avgSummaryTokens ?? 0}
              </TableCell>
            )}
            <TableCell className="text-right tabular-nums">
              {seconds(s.avgLatencyMs)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              ${s.totalCostUsd}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
