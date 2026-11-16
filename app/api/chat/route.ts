import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  validateUIMessages,
} from "ai"

import { DEFAULT_MODEL, isModelAllowed } from "@/lib/ai/models"
import { getModel, hasApiKey } from "@/lib/ai/provider"
import { SYSTEM_PROMPT } from "@/features/chat/prompt"
import { type ChatUIMessage } from "@/features/chat/types"

export const maxDuration = 30

const MAX_OUTPUT_TOKENS = 8192

// This endpoint is public and spends Kilo credits on every request. Add a
// rate limit and authentication before exposing it to real traffic.
export async function POST(req: Request) {
  if (!hasApiKey()) {
    return Response.json(
      { error: "KILO_API_KEY is not set. Add it to .env.local." },
      { status: 500 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const model = (body as { model?: unknown })?.model
  const modelId = typeof model === "string" ? model : DEFAULT_MODEL

  if (!isModelAllowed(modelId)) {
    return Response.json(
      { error: `Model ${modelId} is not available.` },
      { status: 400 }
    )
  }

  let messages: ChatUIMessage[]
  try {
    messages = await validateUIMessages<ChatUIMessage>({
      messages: (body as { messages?: unknown })?.messages,
    })
  } catch {
    return Response.json({ error: "Invalid messages." }, { status: 400 })
  }

  const result = streamText({
    model: getModel(modelId),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    abortSignal: req.signal,
  })

  let reasoningCount = 0
  const reasoningStarts = new Map<string, { index: number; time: number }>()

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      // The AI SDK does not time reasoning, so time each block here.
      messageMetadata: ({ part }) => {
        if (part.type === "reasoning-start") {
          reasoningStarts.set(part.id, {
            index: reasoningCount++,
            time: Date.now(),
          })
        }

        const start =
          part.type === "reasoning-end"
            ? reasoningStarts.get(part.id)
            : undefined

        if (!start) {
          return undefined
        }

        return {
          reasoningDurations: { [start.index]: Date.now() - start.time },
        }
      },
      onError: (error) => {
        console.error(error)
        return "Something went wrong. Please try again."
      },
    }),
  })
}
