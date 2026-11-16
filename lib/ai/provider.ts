import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

// Every model call in the app goes through the Kilo AI Gateway, which is
// OpenAI-compatible. See https://kilo.ai/docs/gateway.
export const KILO_BASE_URL =
  process.env.KILO_BASE_URL ?? "https://ai-gateway.kilo.ai/api/v1"

const kilo = createOpenAICompatible({
  name: "kilo",
  baseURL: KILO_BASE_URL,
  apiKey: process.env.KILO_API_KEY,
})

export function hasApiKey() {
  return Boolean(process.env.KILO_API_KEY)
}

export function getModel(modelId: string) {
  return kilo.chatModel(modelId)
}
