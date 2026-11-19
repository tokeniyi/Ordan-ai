"use client"

import { Button } from "@/components/ui/button"

// The shadcn/ui Suggestion pattern: a row of one-click prompts above the
// prompt input.
export function FollowUps({
  items,
  onSelect,
}: {
  items: string[]
  onSelect: (prompt: string) => void
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="flex scrollbar-none gap-2 overflow-x-auto overscroll-x-contain">
      {items.map((item) => (
        <Button
          key={item}
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => onSelect(item)}
        >
          {item}
        </Button>
      ))}
    </div>
  )
}
