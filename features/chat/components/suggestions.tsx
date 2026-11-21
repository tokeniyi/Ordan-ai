"use client"

import { Button } from "@/components/ui/button"

export interface Suggestion {
  label: string
  prompt: string
}

const defaultSuggestions: Suggestion[] = [
  {
    label: "Explain RAG",
    prompt:
      "Explain retrieval augmented generation in simple terms, with a small diagram in a code block.",
  },
  {
    label: "Write some code",
    prompt:
      "Write a TypeScript function that splits text into overlapping chunks, and explain it.",
  },
  {
    label: "Compare in a table",
    prompt:
      "Compare keyword search, semantic search and hybrid search in a markdown table.",
  },
]

export function Suggestions({
  items = defaultSuggestions,
  onSelect,
}: {
  items?: Suggestion[]
  onSelect: (prompt: string) => void
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {items.map((suggestion) => (
        <Button
          key={suggestion.label}
          variant="outline"
          size="sm"
          onClick={() => onSelect(suggestion.prompt)}
        >
          {suggestion.label}
        </Button>
      ))}
    </div>
  )
}
