import { describe, expect, it, vi } from "vitest"

import { prepareContext } from "@/features/history/prepare"
import { ask, conversation } from "@/features/history/test-messages"

const messages = [...conversation(10), ask("u10", "What is my name?")]
const system = "You are helpful."

describe("prepareContext", () => {
  it("changes nothing when the history fits", async () => {
    const summarize = vi.fn()
    const result = await prepareContext({
      system,
      messages,
      strategy: "summary",
      budget: 100_000,
      summarize,
    })
    expect(summarize).not.toHaveBeenCalled()
    expect(result.system).toBe(system)
    expect(result.messages).toEqual(messages)
    expect(result.info).toMatchObject({
      strategy: "summary",
      totalMessages: 21,
      sentMessages: 21,
    })
    expect(result.info.firstSentMessageId).toBeUndefined()
    expect(result.info.summary).toBeUndefined()
  })

  it("summarizes the evicted turns and adds the summary to the system prompt", async () => {
    const summarize = vi.fn(async () => "- The user's name is Ada.")
    const result = await prepareContext({
      system,
      messages,
      strategy: "summary",
      budget: 1000,
      summarize,
    })

    const [{ messages: evicted, previous }] = summarize.mock
      .calls[0] as unknown as [
      { messages: { id: string }[]; previous?: string },
    ]
    expect(previous).toBeUndefined()
    expect(evicted[0].id).toBe("u0")
    expect(result.messages[0].id).toBe(result.info.firstSentMessageId)
    expect(result.info.summary).toEqual({
      text: "- The user's name is Ada.",
      throughMessageId: evicted.at(-1)?.id,
    })
    expect(result.info.summarized).toBe(true)
    expect(result.system).toContain("<conversation_summary>")
    expect(result.system).toContain("The user's name is Ada.")
    expect(result.info.estimatedTokens).toBeLessThanOrEqual(1000)
  })

  it("passes the previous summary to be extended", async () => {
    const summarize = vi.fn(async () => "Merged.")
    await prepareContext({
      system,
      messages,
      strategy: "summary",
      budget: 800,
      summary: { text: "Old.", throughMessageId: "a1" },
      summarize,
    })
    const [input] = summarize.mock.calls[0] as unknown as [
      { messages: { id: string }[]; previous?: string },
    ]
    expect(input.previous).toBe("Old.")
    expect(input.messages[0].id).toBe("u2")
  })

  it("keeps the previous summary when nothing new is evicted", async () => {
    const summarize = vi.fn()
    const result = await prepareContext({
      system,
      messages,
      strategy: "summary",
      budget: 100_000,
      summary: { text: "Old.", throughMessageId: "a1" },
      summarize,
    })
    expect(summarize).not.toHaveBeenCalled()
    expect(result.info.summary?.text).toBe("Old.")
    expect(result.info.summarized).toBeUndefined()
    expect(result.info.firstSentMessageId).toBe("u2")
    expect(result.system).toContain("Old.")
  })

  it("drops turns and adds a note with the window strategy", async () => {
    const summarize = vi.fn()
    const result = await prepareContext({
      system,
      messages,
      strategy: "window",
      budget: 500,
      summarize,
    })
    expect(summarize).not.toHaveBeenCalled()
    expect(result.info.sentMessages).toBeLessThan(21)
    expect(result.system).toContain("<conversation_note>")
    expect(result.info.summary).toBeUndefined()
    // The note counts against the budget too.
    expect(result.info.estimatedTokens).toBeLessThanOrEqual(500)
  })

  it("drops the turns when summarizing fails", async () => {
    const result = await prepareContext({
      system,
      messages,
      strategy: "summary",
      budget: 1000,
      summarize: async () => {
        throw new Error("Provider down")
      },
    })
    expect(result.info.summaryFailed).toBe(true)
    expect(result.info.summary).toBeUndefined()
    expect(result.info.sentMessages).toBeLessThan(21)
  })

  it("treats an empty summary as a failure", async () => {
    const result = await prepareContext({
      system,
      messages,
      strategy: "summary",
      budget: 1000,
      summarize: async () => "  ",
    })
    expect(result.info.summaryFailed).toBe(true)
  })

  it("rethrows when the request is cancelled", async () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" })
    await expect(
      prepareContext({
        system,
        messages,
        strategy: "summary",
        budget: 1000,
        summarize: async () => {
          throw abort
        },
      })
    ).rejects.toBe(abort)
  })
})
