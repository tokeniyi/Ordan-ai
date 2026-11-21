"use client"

import { type ContextInfo } from "@/features/history/types"
import { Button } from "@/components/ui/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Marker, MarkerContent } from "@/components/ui/marker"

// A Checkpoint marker where the model's view of the chat begins. Messages
// above it were summarized or dropped in the last request.
export function ContextBoundary({ context }: { context: ContextInfo }) {
  const summary = context.strategy === "summary" ? context.summary : undefined

  return (
    <Marker variant="separator" role="separator" aria-label="Context boundary">
      <MarkerContent className="inline-flex items-center gap-2">
        {summary ? "Earlier messages summarized" : "Earlier messages not sent"}
        {summary && (
          <HoverCard>
            <HoverCardTrigger
              delay={10}
              closeDelay={100}
              render={<Button size="xs" variant="outline" />}
            >
              View summary
            </HoverCardTrigger>
            <HoverCardContent className="w-80 text-sm whitespace-pre-wrap">
              {summary.text}
            </HoverCardContent>
          </HoverCard>
        )}
      </MarkerContent>
    </Marker>
  )
}
