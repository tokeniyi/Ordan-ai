import { type UIMessage } from "ai"

import { type ContextInfo, type ReplyUsage } from "@/features/history/types"
import { type RagInfo } from "@/features/rag/types"

export interface ChatMetadata {
  // Milliseconds per reasoning part, keyed by its index in the message.
  reasoningDurations?: Record<number, number>
  // What the server did with the history for this reply.
  context?: ContextInfo
  // Token usage the provider reported for this reply.
  usage?: ReplyUsage
  // The sources retrieved for this reply, when it used documents.
  rag?: RagInfo
}

export type ChatUIMessage = UIMessage<ChatMetadata>

export type ChatMessagePart = ChatUIMessage["parts"][number]

export type TextMessagePart = Extract<ChatMessagePart, { type: "text" }>

export type ReasoningMessagePart = Extract<
  ChatMessagePart,
  { type: "reasoning" }
>
