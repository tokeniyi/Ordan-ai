import { generateText, Output } from "ai"
import { z } from "zod"

import { getModel } from "@/lib/ai/provider"
import { MAX_RETRIES } from "@/features/evals/config"
import { type EvalCase, type JudgeScores } from "@/features/evals/types"
import { formatSources } from "@/features/rag/prompt"
import { type RagSource } from "@/features/rag/types"

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

// Used when the answer was given sources. It adds a fourth score, so the
// prompt for answers without sources, and their cached scores, stay as they
// were.
export const RAG_JUDGE_SYSTEM_PROMPT = `${JUDGE_SYSTEM_PROMPT.replace(
  "Score the answer on three criteria from 1 to 5.",
  "The assistant was given numbered sources to answer from, which you also get. Score the answer on four criteria from 1 to 5."
)}

<faithfulness>
5: Every claim in the answer is supported by the sources. If the sources do not answer the question, the answer says so instead of guessing.
3: Mostly supported, with one claim the sources do not back up.
1: Makes claims the sources do not support, or contradicts them.
</faithfulness>

Faithfulness is about the sources, not the reference. A claim can be true and still unsupported.`

const ragJudgeSchema = judgeSchema.extend({
  faithfulness: score("1 to 5. Is every claim supported by the sources?"),
})

export function judgePrompt(
  testCase: Pick<EvalCase, "input" | "reference">,
  answer: string,
  sources?: RagSource[]
) {
  return [
    `<question>\n${testCase.input}\n</question>`,
    `<reference>\n${testCase.reference}\n</reference>`,
    ...(sources ? [formatSources(sources)] : []),
    `<answer>\n${answer}\n</answer>`,
  ].join("\n\n")
}

export async function judgeAnswer({
  modelId,
  testCase,
  answer,
  sources,
}: {
  modelId: string
  testCase: EvalCase
  answer: string
  // The sources the answer was given, if any.
  sources?: RagSource[]
}): Promise<JudgeScores> {
  const { output } = await generateText({
    model: getModel(modelId),
    system: sources ? RAG_JUDGE_SYSTEM_PROMPT : JUDGE_SYSTEM_PROMPT,
    prompt: judgePrompt(testCase, answer, sources),
    output: Output.object({ schema: sources ? ragJudgeSchema : judgeSchema }),
    temperature: 0,
    seed: 7,
    maxRetries: MAX_RETRIES,
  })

  return output
}
