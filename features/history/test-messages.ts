import { type HistoryMessage } from "@/features/history/types"

// Builds a conversation for tests: `turns` question and answer pairs, each
// message about `words` words long.
export function conversation(turns: number, words = 40): HistoryMessage[] {
  const text = (label: string) =>
    `${label} ${Array.from({ length: words }, () => "word").join(" ")}`
  return Array.from({ length: turns }, (_, index) => [
    {
      id: `u${index}`,
      role: "user" as const,
      parts: [{ type: "text" as const, text: text(`question ${index}`) }],
    },
    {
      id: `a${index}`,
      role: "assistant" as const,
      parts: [{ type: "text" as const, text: text(`answer ${index}`) }],
    },
  ]).flat()
}

export function ask(id: string, text: string): HistoryMessage {
  return { id, role: "user", parts: [{ type: "text", text }] }
}
