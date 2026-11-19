import { describe, expect, it } from "vitest"

import { summarize } from "@/features/evals/summarize"
import { type CaseResult } from "@/features/evals/types"

function result(overrides: Partial<CaseResult>): CaseResult {
  return {
    caseId: "case",
    category: "facts",
    input: "question",
    promptId: "a",
    answer: "answer",
    checks: [],
    checksPassed: true,
    latencyMs: 1000,
    inputTokens: 10,
    outputTokens: 100,
    costUsd: 0.001,
    ...overrides,
  }
}

describe("summarize", () => {
  it("averages scores per prompt and counts checks", () => {
    const results = [
      result({
        checks: [{ check: { type: "hasCodeBlock" }, label: "", passed: true }],
        judge: { correctness: 5, relevance: 5, clarity: 4, reason: "" },
        quality: 93,
      }),
      result({
        checks: [{ check: { type: "hasCodeBlock" }, label: "", passed: false }],
        checksPassed: false,
        judge: { correctness: 3, relevance: 5, clarity: 4, reason: "" },
        quality: 80,
        outputTokens: 300,
        latencyMs: 3000,
      }),
      result({ promptId: "b" }),
    ]

    const [a, b] = summarize(
      [
        { id: "a", version: 1 },
        { id: "b", version: 2 },
      ],
      results
    )

    expect(a).toMatchObject({
      cases: 2,
      passed: 1,
      checksPassed: 1,
      checksTotal: 2,
      correctness: 4,
      relevance: 5,
      clarity: 4,
      quality: 87,
      avgOutputTokens: 200,
      avgLatencyMs: 2000,
      totalCostUsd: 0.002,
    })
    expect(b).toMatchObject({ promptVersion: 2, cases: 1 })
  })

  it("leaves failed generations out of the token and latency averages", () => {
    const [summary] = summarize(
      [{ id: "a", version: 1 }],
      [
        result({ outputTokens: 100, latencyMs: 1000 }),
        result({ answer: "", outputTokens: 0, latencyMs: 30000, error: "x" }),
      ]
    )
    expect(summary.avgOutputTokens).toBe(100)
    expect(summary.avgLatencyMs).toBe(1000)
    expect(summary.errors).toBe(1)
  })
})
