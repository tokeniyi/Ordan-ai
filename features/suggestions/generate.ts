import { generateText, Output } from "ai"
import { z } from "zod"

import { DEFAULT_MODEL } from "@/lib/ai/models"
import { getModel } from "@/lib/ai/provider"
import { FOLLOW_UP_SYSTEM_PROMPT } from "@/features/suggestions/prompt"

const followUpSchema = z.object({
  questions: z
    .array(z.string().describe("A follow-up question, under 10 words."))
    .describe("Exactly 3 follow-up questions."),
})

const MAX_CHARS = 4000

// Structured output: the model must return JSON that matches the schema, so
// the result can be used as data without parsing free text.
export async function generateFollowUps({
  question,
  answer,
  abortSignal,
}: {
  question: string
  answer: string
  abortSignal?: AbortSignal
}) {
  const { output } = await generateText({
    model: getModel(DEFAULT_MODEL),
    system: FOLLOW_UP_SYSTEM_PROMPT,
    prompt: `<question>\n${question.slice(0, MAX_CHARS)}\n</question>\n\n<answer>\n${answer.slice(0, MAX_CHARS)}\n</answer>`,
    output: Output.object({ schema: followUpSchema }),
    temperature: 0.7,
    maxOutputTokens: 2000,
    abortSignal,
  })

  return output.questions
    .map((question) => question.trim())
    .filter(Boolean)
    .slice(0, 3)
}
