import { type Page } from "@playwright/test"
import { createUIMessageStream, createUIMessageStreamResponse } from "ai"

export interface ChatRequest {
  model: string
  promptId: string
}

// Builds a reply in the AI SDK's UI message stream format, using the SDK
// itself, so the mock stays in step with what the real endpoint sends.
async function streamReply(text: string) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "text-start", id: "text-1" })
      writer.write({ type: "text-delta", id: "text-1", delta: text })
      writer.write({ type: "text-end", id: "text-1" })
    },
  })
  const response = createUIMessageStreamResponse({ stream })
  return {
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text(),
  }
}

// Answers /api/chat and /api/suggestions in the browser, so tests never call
// a model. Each chat reply names the prompt it was sent with. Returns the
// chat requests the page made.
export async function mockModel(page: Page) {
  const requests: ChatRequest[] = []

  await page.route("**/api/chat", async (route) => {
    const body = route.request().postDataJSON() as ChatRequest
    requests.push({ model: body.model, promptId: body.promptId })
    const reply = await streamReply(
      `Mock reply from the ${body.promptId} prompt.`
    )
    await route.fulfill({ status: 200, ...reply })
  })

  await page.route("**/api/suggestions", (route) =>
    route.fulfill({
      json: { questions: ["Tell me more", "Give an example", "Why?"] },
    })
  )

  return requests
}
