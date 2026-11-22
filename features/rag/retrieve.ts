import { type Turn } from "@/features/rag/query"

// The conversation as plain text turns, oldest first, for the query planner.
// The last turn is the newest user message. Files and other parts are left
// out: only text can be searched.
export function conversationTurns(
  messages: {
    role: string
    parts: { type: string; text?: string }[]
  }[]
): Turn[] {
  const lastUser = messages.findLastIndex((message) => message.role === "user")
  return messages.slice(0, lastUser + 1).flatMap((message) => {
    if (message.role !== "user" && message.role !== "assistant") return []
    const text = message.parts
      .flatMap((part) => (part.type === "text" && part.text ? part.text : []))
      .join("\n")
      .trim()
    return text ? [{ role: message.role, text }] : []
  })
}
