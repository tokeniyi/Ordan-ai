import { describe, expect, it } from "vitest"

import {
  estimateMessageTokens,
  estimateModelMessageTokens,
  estimateTokens,
} from "@/features/history/tokens"

describe("token estimates", () => {
  it("counts about four characters per token", () => {
    expect(estimateTokens("")).toBe(0)
    expect(estimateTokens("abcd")).toBe(1)
    expect(estimateTokens("abcde")).toBe(2)
  })

  it("counts only the text of a message, plus overhead", () => {
    expect(
      estimateMessageTokens({
        parts: [
          { type: "reasoning", text: "x".repeat(400) },
          { type: "text", text: "abcdefgh" },
        ],
      })
    ).toBe(2 + 4)
  })

  it("counts model messages with string or part content", () => {
    expect(
      estimateModelMessageTokens([
        { role: "user", content: "abcd" },
        { role: "assistant", content: [{ type: "text", text: "abcd" }] },
      ])
    ).toBe(10)
  })
})
