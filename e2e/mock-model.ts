import { type Page } from "@playwright/test"
import { createUIMessageStream, createUIMessageStreamResponse } from "ai"

import { type ChatMetadata } from "@/features/chat/types"
import { type HistoryRequest } from "@/features/history/request"

export interface ChatRequest {
  model: string
  promptId: string
  knowledge?: string
  history?: HistoryRequest
  messages: { id: string; role: string }[]
}

// Builds a reply in the AI SDK's UI message stream format, using the SDK
// itself, so the mock stays in step with what the real endpoint sends.
async function streamReply(text: string, metadata?: ChatMetadata) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "start", messageMetadata: metadata })
      writer.write({ type: "text-start", id: "text-1" })
      writer.write({ type: "text-delta", id: "text-1", delta: text })
      writer.write({ type: "text-end", id: "text-1" })
      writer.write({ type: "finish" })
    },
  })
  const response = createUIMessageStreamResponse({ stream })
  return {
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text(),
  }
}

// Answers /api/chat and /api/suggestions in the browser, so tests never call
// a model. Each chat reply names the prompt it was sent with, unless `reply`
// says otherwise. `metadata` stands in for what the server reports about the
// context and the sources. Returns the chat requests the page made.
export async function mockModel(
  page: Page,
  {
    metadata,
    reply,
  }: {
    metadata?: (request: ChatRequest) => ChatMetadata | undefined
    reply?: (request: ChatRequest) => string
  } = {}
) {
  const requests: ChatRequest[] = []

  await page.route("**/api/chat", async (route) => {
    const body = route.request().postDataJSON() as ChatRequest
    requests.push(body)
    const response = await streamReply(
      reply?.(body) ?? `Mock reply from the ${body.promptId} prompt.`,
      metadata?.(body)
    )
    await route.fulfill({ status: 200, ...response })
  })

  await page.route("**/api/suggestions", (route) =>
    route.fulfill({
      json: { questions: ["Tell me more", "Give an example", "Why?"] },
    })
  )

  return requests
}
