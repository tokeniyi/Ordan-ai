import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  validateUIMessages,
} from "ai"

import { DEFAULT_MODEL, isModelAllowed } from "@/lib/ai/models"
import { getModel, hasApiKey } from "@/lib/ai/provider"
import { type ChatUIMessage } from "@/features/chat/types"
import { HISTORY_BUDGET } from "@/features/history/config"
import { prepareContext } from "@/features/history/prepare"
import { parseHistoryRequest } from "@/features/history/request"
import { summarizeConversation } from "@/features/history/summarize"
import { estimateModelMessageTokens } from "@/features/history/tokens"
import { buildPrompt, DEFAULT_PROMPT_ID, getPrompt } from "@/features/prompts"
import { withoutOldCitations } from "@/features/rag/history"
import { retrieveKestrel } from "@/features/rag/kestrel"
import { withSources } from "@/features/rag/prompt"
import { parseKnowledge } from "@/features/rag/request"
import { retrievalQuery } from "@/features/rag/retrieve"
import { type RagInfo } from "@/features/rag/types"

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

  const promptId = (body as { promptId?: unknown })?.promptId
  const prompt = getPrompt(
    typeof promptId === "string" ? promptId : DEFAULT_PROMPT_ID
  )

  if (!prompt) {
    return Response.json(
      { error: `Prompt ${String(promptId)} is not available.` },
      { status: 400 }
    )
  }

  const history = parseHistoryRequest((body as { history?: unknown })?.history)
  if (!history) {
    return Response.json(
      { error: "Invalid history settings." },
      { status: 400 }
    )
  }

  const knowledge = parseKnowledge((body as { knowledge?: unknown })?.knowledge)
  if (!knowledge) {
    return Response.json({ error: "Invalid knowledge base." }, { status: 400 })
  }

  let messages: ChatUIMessage[]
  try {
    messages = await validateUIMessages<ChatUIMessage>({
      messages: (body as { messages?: unknown })?.messages,
    })
  } catch {
    return Response.json({ error: "Invalid messages." }, { status: 400 })
  }

  const built = buildPrompt(prompt)
  const { examples, temperature } = built
  let system = built.system

  // Retrieve passages for the newest question and put them in the system
  // prompt. See features/rag.
  let rag: RagInfo | undefined
  if (knowledge === "kestrel") {
    const query = retrievalQuery(messages)
    try {
      rag = { knowledge, query, ...(await retrieveKestrel(query)) }
    } catch (error) {
      console.error(error)
      return Response.json({ error: "Search failed." }, { status: 500 })
    }
    system = withSources(system, rag.sources)
    messages = withoutOldCitations(messages)
  }

  // Trim or summarize the history to fit the budget. See features/history.
  let context: Awaited<ReturnType<typeof prepareContext<ChatUIMessage>>>
  try {
    context = await prepareContext({
      system,
      messages,
      strategy: history.strategy,
      budget: HISTORY_BUDGET,
      fixedTokens: estimateModelMessageTokens(examples),
      summary: history.summary,
      summarize: async ({ previous, messages }) =>
        (
          await summarizeConversation({
            modelId,
            previous,
            messages,
            abortSignal: req.signal,
          })
        ).text,
    })
  } catch (error) {
    console.error(error)
    return Response.json({ error: "Request was cancelled." }, { status: 499 })
  }

  const result = streamText({
    model: getModel(modelId),
    system: context.system,
    messages: [
      ...examples,
      ...(await convertToModelMessages(context.messages)),
    ],
    temperature,
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
        if (part.type === "start") {
          return { context: context.info, ...(rag && { rag }) }
        }

        if (part.type === "finish") {
          return {
            usage: {
              inputTokens: part.totalUsage.inputTokens ?? 0,
              outputTokens: part.totalUsage.outputTokens ?? 0,
              reasoningTokens:
                part.totalUsage.outputTokenDetails.reasoningTokens ?? 0,
            },
          }
        }

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
