import { z } from "zod"

import { DEFAULT_STRATEGY } from "@/features/history/config"
import {
  HISTORY_STRATEGIES,
  type ContextInfo,
  type ConversationSummary,
  type HistoryMessage,
  type HistoryStrategy,
} from "@/features/history/types"

// What the browser sends about the history with each message.
export const historyRequestSchema = z.object({
  strategy: z.enum(HISTORY_STRATEGIES).default(DEFAULT_STRATEGY),
  summary: z
    .object({
      text: z.string().min(1).max(8000),
      throughMessageId: z.string().min(1),
    })
    .optional(),
})

export type HistoryRequest = z.infer<typeof historyRequestSchema>

export function parseHistoryRequest(
  value: unknown
): HistoryRequest | undefined {
  const result = historyRequestSchema.safeParse(value ?? {})
  return result.success ? result.data : undefined
}

// The newest context the server reported, from the last reply that has one.
export function latestContext(
  messages: (HistoryMessage & { metadata?: { context?: ContextInfo } })[]
) {
  return messages.findLast((message) => message.metadata?.context)?.metadata
    ?.context
}

// The summary to send with the next message. The server made it, and the
// browser keeps it with the chat, so it is not rebuilt on every message.
export function summaryToSend(
  messages: (HistoryMessage & { metadata?: { context?: ContextInfo } })[],
  strategy: HistoryStrategy
): ConversationSummary | undefined {
  if (strategy !== "summary") return undefined
  return latestContext(messages)?.summary
}
