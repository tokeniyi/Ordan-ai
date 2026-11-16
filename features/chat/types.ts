import { type UIMessage } from "ai"

export type ChatUIMessage = UIMessage<{
  // Milliseconds per reasoning part, keyed by its index in the message.
  reasoningDurations?: Record<number, number>
}>

export type ChatMessagePart = ChatUIMessage["parts"][number]

export type TextMessagePart = Extract<ChatMessagePart, { type: "text" }>

export type ReasoningMessagePart = Extract<
  ChatMessagePart,
  { type: "reasoning" }
>
