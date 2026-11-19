import { generateText } from "ai"

import { getModel } from "@/lib/ai/provider"
import { SUMMARY_MAX_OUTPUT_TOKENS } from "@/features/history/config"
import { SUMMARY_SYSTEM_PROMPT, summaryInput } from "@/features/history/prompt"
import { messageText } from "@/features/history/tokens"
import { type HistoryMessage } from "@/features/history/types"

export async function summarizeConversation({
  modelId,
  previous,
  messages,
  abortSignal,
}: {
  modelId: string
  previous?: string
  messages: HistoryMessage[]
  abortSignal?: AbortSignal
}) {
  const result = await generateText({
    model: getModel(modelId),
    system: SUMMARY_SYSTEM_PROMPT,
    prompt: summaryInput(
      previous,
      messages.map((message) => ({
        role: message.role,
        text: messageText(message),
      }))
    ),
    temperature: 0,
    maxOutputTokens: SUMMARY_MAX_OUTPUT_TOKENS,
    abortSignal,
  })

  return {
    text: result.text,
    inputTokens: result.usage.inputTokens ?? 0,
    outputTokens: result.usage.outputTokens ?? 0,
    raw: result.usage.raw,
  }
}
