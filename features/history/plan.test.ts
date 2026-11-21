import { describe, expect, it } from "vitest"

import {
  SUMMARY_RESERVE_TOKENS,
  SUMMARY_TARGET,
} from "@/features/history/config"
import { planContext, splitTurns } from "@/features/history/plan"
import { ask, conversation } from "@/features/history/test-messages"
import { estimateMessageTokens } from "@/features/history/tokens"

const ids = (messages: { id: string }[]) => messages.map((m) => m.id)

// Each message in conversation(n) is about 54 tokens, so a turn is ~108.
const messages = [...conversation(10), ask("u10", "last question")]
const total = messages.reduce((sum, m) => sum + estimateMessageTokens(m), 0)

describe("splitTurns", () => {
  it("starts a turn at each user message", () => {
    expect(splitTurns(conversation(2)).map(ids)).toEqual([
      ["u0", "a0"],
      ["u1", "a1"],
    ])
  })

  it("keeps a leading assistant message in its own turn", () => {
    const [, ...rest] = conversation(2)
    expect(splitTurns(rest).map(ids)).toEqual([["a0"], ["u1", "a1"]])
  })
})

describe("planContext", () => {
  it("sends everything with the full strategy, however long", () => {
    const plan = planContext({
      messages,
      strategy: "full",
      budget: 10,
      fixedTokens: 0,
    })
    expect(plan.keep).toBe(messages)
    expect(plan.evict).toEqual([])
  })

  it("sends everything when the history fits", () => {
    for (const strategy of ["window", "summary"] as const) {
      const plan = planContext({
        messages,
        strategy,
        budget: total + SUMMARY_RESERVE_TOKENS,
        fixedTokens: 0,
      })
      expect(plan.keep).toEqual(messages)
      expect(plan.evict).toEqual([])
    }
  })

  it("counts the fixed tokens against the budget", () => {
    const plan = planContext({
      messages,
      strategy: "window",
      budget: total,
      fixedTokens: 200,
    })
    expect(plan.evict.length).toBeGreaterThan(0)
  })

  it("drops whole turns from the start with the window strategy", () => {
    const plan = planContext({
      messages,
      strategy: "window",
      budget: 500,
      fixedTokens: 0,
    })
    expect(plan.keep[0].role).toBe("user")
    expect(ids(plan.keep).at(-1)).toBe("u10")
    expect([...plan.evict, ...plan.keep]).toEqual(messages)
    const kept = plan.keep.reduce((sum, m) => sum + estimateMessageTokens(m), 0)
    expect(kept).toBeLessThanOrEqual(500)
    // It keeps as much as fits: one more turn would go over.
    expect(kept + 108).toBeGreaterThan(500)
  })

  it("trims below the budget with the summary strategy, leaving slack", () => {
    const window = planContext({
      messages,
      strategy: "window",
      budget: 1000,
      fixedTokens: 0,
    })
    const summary = planContext({
      messages,
      strategy: "summary",
      budget: 1000,
      fixedTokens: 0,
    })
    expect(summary.keep.length).toBeLessThan(window.keep.length)
    const kept = summary.keep.reduce(
      (sum, m) => sum + estimateMessageTokens(m),
      0
    )
    expect(kept + SUMMARY_RESERVE_TOKENS).toBeLessThanOrEqual(
      1000 * SUMMARY_TARGET
    )
  })

  it("always keeps the latest turn, even over the budget", () => {
    const plan = planContext({
      messages,
      strategy: "window",
      budget: 1,
      fixedTokens: 0,
    })
    expect(ids(plan.keep)).toEqual(["u10"])
  })

  it("continues after the previous summary", () => {
    const summary = { text: "The user is Ada.", throughMessageId: "a3" }
    const plan = planContext({
      messages,
      strategy: "summary",
      budget: 100_000,
      fixedTokens: 0,
      summary,
    })
    expect(plan.previousSummary).toBe(summary)
    expect(ids(plan.keep)[0]).toBe("u4")
    expect(plan.evict).toEqual([])
  })

  it("only evicts messages the previous summary does not cover", () => {
    const plan = planContext({
      messages,
      strategy: "summary",
      budget: 700,
      fixedTokens: 0,
      summary: { text: "Earlier.", throughMessageId: "a3" },
    })
    expect(ids(plan.evict)[0]).toBe("u4")
  })

  it("discards a summary whose message is gone", () => {
    const plan = planContext({
      messages: conversation(2),
      strategy: "summary",
      budget: 100_000,
      fixedTokens: 0,
      summary: { text: "Earlier.", throughMessageId: "a9" },
    })
    expect(plan.previousSummary).toBeUndefined()
    expect(plan.keep).toHaveLength(4)
  })

  it("ignores the summary with the window strategy", () => {
    const plan = planContext({
      messages: conversation(2),
      strategy: "window",
      budget: 100_000,
      fixedTokens: 0,
      summary: { text: "Earlier.", throughMessageId: "a0" },
    })
    expect(plan.previousSummary).toBeUndefined()
    expect(plan.keep).toHaveLength(4)
  })
})
