"use client"

import { Button } from "@/components/ui/button"

const suggestions = [
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
  onSelect,
}: {
  onSelect: (prompt: string) => void
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {suggestions.map((suggestion) => (
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
