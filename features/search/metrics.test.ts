import { describe, expect, it } from "vitest"

import {
  firstRelevantRank,
  isRelevant,
  retrievalMetrics,
} from "@/features/search/metrics"

const testCase = { docId: "a", evidence: "costs  €29 a month" }

describe("relevance", () => {
  it("needs the whole passage, in the right document", () => {
    expect(
      isRelevant({ docId: "a", text: "It COSTS €29\na month." }, testCase)
    ).toBe(true)
    expect(
      isRelevant({ docId: "b", text: "costs €29 a month" }, testCase)
    ).toBe(false)
    expect(isRelevant({ docId: "a", text: "costs €29" }, testCase)).toBe(false)
  })

  it("finds the rank of the first relevant chunk", () => {
    const ranked = [
      { docId: "a", text: "nothing" },
      { docId: "a", text: "costs €29 a month" },
    ]
    expect(firstRelevantRank(ranked, testCase)).toBe(2)
    expect(firstRelevantRank([], testCase)).toBeUndefined()
  })
})

describe("retrievalMetrics", () => {
  it("computes recall@k and MRR", () => {
    const { recall, mrr } = retrievalMetrics([1, 2, undefined, 4], [1, 3, 5])
    expect(recall).toEqual({ 1: 0.25, 3: 0.5, 5: 0.75 })
    expect(mrr).toBeCloseTo((1 + 0.5 + 0 + 0.25) / 4)
  })
})
