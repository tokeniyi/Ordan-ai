"use client"

import { type RagSource } from "@/features/rag/types"
import { Button } from "@/components/ui/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

// The shadcn/ui Inline Citation pattern: a Hover Card on a Button, in the
// sentence the source supports. It shows the passage the model was given.
export function Citation({ n, source }: { n: number; source?: RagSource }) {
  if (!source) {
    // The model cited a source it was not given. Show it, but flag it.
    return (
      <span
        className="text-xs text-destructive"
        title="This reply cited a source that does not exist."
      >
        [{n}]
      </span>
    )
  }

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={10}
        closeDelay={100}
        render={
          <Button
            variant="secondary"
            size="xs"
            className="mx-0.5 h-5 min-w-5 px-1.5 align-baseline no-underline"
            aria-label={`Source ${n}: ${source.docTitle}`}
          />
        }
      >
        {n}
      </HoverCardTrigger>
      <HoverCardContent className="flex w-80 flex-col gap-1 text-sm">
        <div className="font-medium">{source.docTitle}</div>
        {source.heading && (
          <div className="text-xs text-muted-foreground">{source.heading}</div>
        )}
        <p className="line-clamp-6 text-muted-foreground">{source.text}</p>
      </HoverCardContent>
    </HoverCard>
  )
}
