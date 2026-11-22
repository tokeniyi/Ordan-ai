import { generateText } from "ai"

import { getModel } from "@/lib/ai/provider"
import { type Complete } from "@/features/rag/query"

// Planning and expansion replies are two lines or a short passage. Reasoning
// models spend part of this on thinking, so it is not tighter.
const MAX_OUTPUT_TOKENS = 1024

// The real model call for planning and expanding queries. Temperature 0, so
// the same conversation searches the same way.
export function completeWith(
  modelId: string,
  options: { abortSignal?: AbortSignal; maxRetries?: number } = {}
): Complete {
  return async ({ system, prompt }) =>
    (
      await generateText({
        model: getModel(modelId),
        system,
        prompt,
        temperature: 0,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        ...options,
      })
    ).text
}
