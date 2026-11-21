import { type UIMessage } from "ai"

// How older turns are handled once a conversation outgrows its budget.
// full: send everything (the phase 0 to 2 behaviour).
// window: send only the most recent turns that fit, drop the rest.
// summary: replace the oldest turns with a running summary.
export const HISTORY_STRATEGIES = ["summary", "window", "full"] as const

export type HistoryStrategy = (typeof HISTORY_STRATEGIES)[number]

export interface ConversationSummary {
  text: string
  // The summary covers every message up to and including this one.
  throughMessageId: string
}

// What the server did with the history for one reply. Sent to the browser as
// message metadata, so the chat can show it and send the summary back.
export interface ContextInfo {
  strategy: HistoryStrategy
  budget: number
  // Estimated tokens of everything sent: system prompt, summary, messages.
  estimatedTokens: number
  totalMessages: number
  sentMessages: number
  // The first message the model saw in full. Earlier ones were dropped or
  // summarized. Absent when every message was sent.
  firstSentMessageId?: string
  summary?: ConversationSummary
  // True when this reply created or extended the summary.
  summarized?: boolean
  // True when summarizing failed and older turns were dropped instead.
  summaryFailed?: boolean
}

// Token usage the provider reported for one reply.
export interface ReplyUsage {
  inputTokens: number
  outputTokens: number
  reasoningTokens: number
}

// The smallest message shape the history code needs, so it works on chat
// messages and on eval cases alike.
export type HistoryMessage = Pick<UIMessage, "id" | "role" | "parts">
