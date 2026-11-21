"use client"

import { type ContextInfo, type ReplyUsage } from "@/features/history/types"
import { Button } from "@/components/ui/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Progress } from "@/components/ui/progress"

export function formatTokens(value: number) {
  if (value < 1000) return String(value)
  return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`
}

function describe(context: ContextInfo) {
  const left = context.totalMessages - context.sentMessages
  const older =
    left === 1 ? "1 older message was" : `${left} older messages were`
  if (context.summaryFailed) {
    return `Summarizing failed, so ${older} dropped.`
  }
  if (left === 0) {
    return "Every message was sent."
  }
  if (context.strategy === "summary") {
    return `${older} sent as a summary.`
  }
  return `${older} dropped.`
}

// The shadcn/ui Context pattern: how much of the history budget the last
// request used, and the tokens the provider reported for the reply.
export function ContextUsage({
  context,
  usage,
}: {
  context?: ContextInfo
  usage?: ReplyUsage
}) {
  if (!context) return null

  const percent = Math.min(
    100,
    Math.round((context.estimatedTokens / context.budget) * 100)
  )
  const rows = usage
    ? [
        { label: "Input", value: usage.inputTokens },
        { label: "Output", value: usage.outputTokens },
        { label: "Reasoning", value: usage.reasoningTokens },
      ]
    : []

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={10}
        closeDelay={100}
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground tabular-nums"
          />
        }
      >
        {percent}% context
      </HoverCardTrigger>
      <HoverCardContent className="flex w-72 flex-col gap-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">Context</span>
          <span className="text-muted-foreground tabular-nums">
            ~{formatTokens(context.estimatedTokens)} /{" "}
            {formatTokens(context.budget)}
          </span>
        </div>
        <Progress value={percent} aria-label="Context used" />
        <p className="text-sm text-muted-foreground">
          {describe(context)} History: {context.strategy}.
        </p>
        {rows.length > 0 && (
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Last reply</span>
            {rows.map((row) => (
              <div key={row.label} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="tabular-nums">{formatTokens(row.value)}</span>
              </div>
            ))}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  )
}
