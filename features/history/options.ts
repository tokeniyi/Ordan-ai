import { type HistoryStrategy } from "@/features/history/types"

// The choices in the History picker. The first one is the default.
export const STRATEGY_OPTIONS: {
  id: HistoryStrategy
  name: string
  description: string
}[] = [
  {
    id: "summary",
    name: "Summary",
    description: "Summarizes older turns once the chat outgrows its budget.",
  },
  {
    id: "window",
    name: "Window",
    description:
      "Sends only the most recent turns that fit. Older ones are dropped.",
  },
  {
    id: "full",
    name: "Full",
    description: "Sends every message. Each turn costs more than the last.",
  },
]
