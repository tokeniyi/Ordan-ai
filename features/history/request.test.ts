import { describe, expect, it } from "vitest"

import {
  latestContext,
  parseHistoryRequest,
  summaryToSend,
} from "@/features/history/request"
import { type ContextInfo } from "@/features/history/types"

const context = (summary?: string): ContextInfo => ({
  strategy: "summary",
  budget: 4000,
  estimatedTokens: 100,
  totalMessages: 4,
  sentMessages: 2,
  ...(summary && { summary: { text: summary, throughMessageId: "a0" } }),
})

const messages = [
  { id: "u0", role: "user" as const, parts: [] },
  {
    id: "a0",
    role: "assistant" as const,
    parts: [],
    metadata: { context: context("Old") },
  },
  { id: "u1", role: "user" as const, parts: [] },
  {
    id: "a1",
    role: "assistant" as const,
    parts: [],
    metadata: { context: context("New") },
  },
  { id: "u2", role: "user" as const, parts: [] },
]

describe("parseHistoryRequest", () => {
  it("defaults to the summary strategy", () => {
    expect(parseHistoryRequest(undefined)).toEqual({ strategy: "summary" })
  })

  it("accepts a strategy and a summary", () => {
    expect(
      parseHistoryRequest({
        strategy: "summary",
        summary: { text: "Ada", throughMessageId: "a1" },
      })
    ).toEqual({
      strategy: "summary",
      summary: { text: "Ada", throughMessageId: "a1" },
    })
  })

  it("rejects unknown strategies and bad summaries", () => {
    expect(parseHistoryRequest({ strategy: "everything" })).toBeUndefined()
    expect(
      parseHistoryRequest({ summary: { text: "", throughMessageId: "a" } })
    ).toBeUndefined()
  })
})

describe("summaryToSend", () => {
  it("sends the newest summary", () => {
    expect(latestContext(messages)?.summary?.text).toBe("New")
    expect(summaryToSend(messages, "summary")?.text).toBe("New")
  })

  it("sends no summary with other strategies", () => {
    expect(summaryToSend(messages, "window")).toBeUndefined()
    expect(summaryToSend(messages, "full")).toBeUndefined()
  })
})
