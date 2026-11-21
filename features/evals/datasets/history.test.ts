import { describe, expect, it } from "vitest"

import { runCheck } from "@/features/evals/checks"
import { history } from "@/features/evals/datasets/history"
import { HISTORY_STRATEGIES } from "@/features/history/types"
import { planContext } from "@/features/history/plan"
import { estimateTokens } from "@/features/history/tokens"
import { buildPrompt, PROMPTS } from "@/features/prompts"

function passes(id: string, answer: string) {
  const testCase = history.cases.find((c) => c.id === id)
  if (!testCase?.checks) throw new Error(`No checks for ${id}`)
  return testCase.checks.every((check) => runCheck(check, answer))
}

function messagesOf(id: string) {
  const testCase = history.cases.find((c) => c.id === id)!
  return [
    ...testCase.history!,
    { role: "user" as const, content: testCase.input },
  ].map((turn, index) => ({
    id: String(index),
    role: turn.role,
    parts: [{ type: "text" as const, text: turn.content }],
  }))
}

describe("history dataset", () => {
  it("has unique case ids and a history for every case", () => {
    const ids = history.cases.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(history.cases.every((c) => c.history?.length)).toBe(true)
  })

  it("is long enough that the opening turns leave the window", () => {
    const fixedTokens = estimateTokens(buildPrompt(PROMPTS[0]).system)
    for (const testCase of history.cases) {
      const messages = messagesOf(testCase.id)
      for (const strategy of HISTORY_STRATEGIES) {
        const plan = planContext({
          messages,
          strategy,
          budget: history.historyBudget!,
          fixedTokens,
        })
        if (strategy === "full") {
          expect(plan.evict).toEqual([])
        } else {
          expect(plan.evict.map((m) => m.id)).toContain("0")
          expect(plan.keep.at(-1)?.id).toBe(String(messages.length - 1))
        }
      }
    }
  })

  it("accepts an answer that ends with the running joke", () => {
    expect(passes("recall-format", "Nairobi.\n\nOver and out.")).toBe(true)
    expect(passes("recall-format", "Nairobi. Over and out")).toBe(true)
    expect(passes("recall-format", "Over and out. Nairobi.")).toBe(false)
  })

  it("accepts 4 pm written in different ways, but not 3 pm", () => {
    for (const time of ["4 pm", "4pm", "4 p.m.", "4:00"]) {
      expect(passes("recall-correction", `Saturday the 14th at ${time}.`)).toBe(
        true
      )
    }
    expect(passes("recall-correction", "Saturday the 14th at 3 pm.")).toBe(
      false
    )
    expect(passes("recall-correction", "Saturday the 14th at 14:00.")).toBe(
      false
    )
  })
})
