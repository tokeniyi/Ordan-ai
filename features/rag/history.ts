import { stripCitations } from "@/features/rag/citations"
import { type RagInfo } from "@/features/rag/types"

interface Message {
  role: string
  parts: { type: string; text?: string }[]
  metadata?: { rag?: RagInfo }
}

// Removes the citations from earlier answers that used sources, before the
// history goes back to the model. Every reply numbers its own sources, so an
// old "[2]" would point at a different chunk now. Answers without sources
// are left alone, because "[1]" there may be code, such as items[1].
export function withoutOldCitations<M extends Message>(messages: M[]): M[] {
  return messages.map((message) => {
    if (message.role !== "assistant" || !message.metadata?.rag) return message
    return {
      ...message,
      parts: message.parts.map((part) =>
        part.type === "text" && part.text
          ? { ...part, text: stripCitations(part.text) }
          : part
      ),
    }
  })
}
