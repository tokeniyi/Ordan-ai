import { generateText, Output } from "ai"
import { z } from "zod"

import { getModel } from "@/lib/ai/provider"
import { MAX_RETRIES } from "@/features/evals/config"
import { type EvalCase, type JudgeScores } from "@/features/evals/types"

const score = (description: string) =>
  z.number().int().min(1).max(5).describe(description)

const judgeSchema = z.object({
  reason: z
    .string()
    .describe("Two or three sentences explaining the scores. Write it first."),
  correctness: score("1 to 5. Is the answer factually right?"),
  relevance: score("1 to 5. Does it answer the question that was asked?"),
  clarity: score("1 to 5. Is it clear and a sensible length?"),
})

export const JUDGE_SYSTEM_PROMPT = `You are a strict evaluator of answers written by an AI assistant.

You get a question, a reference describing what a good answer contains, and the assistant's answer. Score the answer on three criteria from 1 to 5.

<correctness>
5: Every claim is right and agrees with the reference.
3: Mostly right, with a minor error or an important point missing.
1: The main claim is wrong, or the answer contradicts the reference.
</correctness>

<relevance>
5: Answers exactly what was asked, and follows any instruction about format or length.
3: Answers the question but adds a lot that was not asked, or ignores part of an instruction.
1: Does not answer the question.
</relevance>

<clarity>
5: Easy to follow, well organized, no padding.
3: Understandable but longer or messier than it needs to be.
1: Confusing or hard to read.
</clarity>

Rules:
- Judge the answer against the reference, not against your own preferences.
- The reference lists what matters. The answer does not need its exact wording.
- Do not reward length. A short answer that is right deserves a 5.
- Write the reason before deciding the scores.`

export async function judgeAnswer({
  modelId,
  testCase,
  answer,
}: {
  modelId: string
  testCase: EvalCase
  answer: string
}): Promise<JudgeScores> {
  const { output } = await generateText({
    model: getModel(modelId),
    system: JUDGE_SYSTEM_PROMPT,
    prompt: `<question>\n${testCase.input}\n</question>\n\n<reference>\n${testCase.reference}\n</reference>\n\n<answer>\n${answer}\n</answer>`,
    output: Output.object({ schema: judgeSchema }),
    temperature: 0,
    seed: 7,
    maxRetries: MAX_RETRIES,
  })

  return output
}
