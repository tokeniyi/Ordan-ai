import { describe, expect, it } from "vitest"

import { buildPrompt, fillTemplate } from "@/features/prompts/build"
import { PROMPTS } from "@/features/prompts"

describe("fillTemplate", () => {
  it("replaces variables", () => {
    expect(fillTemplate("Today is {{date}}.", { date: "May 1" })).toBe(
      "Today is May 1."
    )
  })

  it("throws on a variable with no value", () => {
    expect(() => fillTemplate("Hi {{name}}", {})).toThrow(/name/)
  })
})

describe("buildPrompt", () => {
  it("turns few-shot examples into alternating turns", () => {
    const { examples } = buildPrompt({
      id: "t",
      name: "T",
      version: 1,
      technique: "",
      description: "",
      system: "S",
      examples: [{ user: "Q", assistant: "A" }],
    })
    expect(examples).toEqual([
      { role: "user", content: "Q" },
      { role: "assistant", content: "A" },
    ])
  })

  it("builds every prompt in the library without missing variables", () => {
    for (const prompt of PROMPTS) {
      expect(() => buildPrompt(prompt)).not.toThrow()
    }
  })
})
