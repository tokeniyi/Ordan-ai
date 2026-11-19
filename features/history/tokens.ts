import { type ModelMessage } from "ai"

import { type HistoryMessage } from "@/features/history/types"

// About four characters per token for English text. Real counts depend on
// each model's tokenizer, which phase 4 covers. An estimate is enough to
// decide what to trim, and the provider reports the real count afterwards.
const CHARS_PER_TOKEN = 4

// Role markers and separators the chat format adds to every message.
const MESSAGE_OVERHEAD = 4

export function estimateTokens(text: string) {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

export function messageText(message: Pick<HistoryMessage, "parts">) {
  return message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n\n")
}

// Only text is counted: reasoning from earlier replies is not sent back.
export function estimateMessageTokens(message: Pick<HistoryMessage, "parts">) {
  return estimateTokens(messageText(message)) + MESSAGE_OVERHEAD
}

export function estimateModelMessageTokens(messages: ModelMessage[]) {
  return messages.reduce((sum, message) => {
    const text =
      typeof message.content === "string"
        ? message.content
        : message.content
            .flatMap((part) => (part.type === "text" ? [part.text] : []))
            .join("\n\n")
    return sum + estimateTokens(text) + MESSAGE_OVERHEAD
  }, 0)
}
