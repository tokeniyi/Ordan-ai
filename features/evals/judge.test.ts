import { describe, expect, it } from "vitest"

import {
  JUDGE_SYSTEM_PROMPT,
  judgePrompt,
  RAG_JUDGE_SYSTEM_PROMPT,
} from "@/features/evals/judge"

describe("judge prompts", () => {
  const testCase = { input: "Q?", reference: "R." }

  it("keeps the prompt for answers without sources as it was", () => {
    expect(judgePrompt(testCase, "A.")).toBe(
      "<question>\nQ?\n</question>\n\n<reference>\nR.\n</reference>\n\n<answer>\nA.\n</answer>"
    )
  })

  it("shows the judge the sources the answer was given", () => {
    const prompt = judgePrompt(testCase, "A [1].", [
      {
        n: 1,
        chunkId: "d#0",
        docId: "d",
        docTitle: "Doc",
        text: "Source text.",
        score: 0.5,
      },
    ])
    expect(prompt).toContain('<source id="1" title="Doc">\nSource text.')
    expect(prompt.indexOf("<sources>")).toBeLessThan(prompt.indexOf("<answer>"))
  })

  it("adds faithfulness as a fourth criterion", () => {
    expect(RAG_JUDGE_SYSTEM_PROMPT).toContain("four criteria")
    expect(RAG_JUDGE_SYSTEM_PROMPT).toContain("<faithfulness>")
    expect(RAG_JUDGE_SYSTEM_PROMPT).not.toContain("three criteria")
    expect(JUDGE_SYSTEM_PROMPT).toContain("three criteria")
  })
})
