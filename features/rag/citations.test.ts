import { describe, expect, it } from "vitest"

import {
  checkCitations,
  citationFromHref,
  citedNumbers,
  stripCitations,
} from "@/features/rag/citations"

describe("citations", () => {
  it("finds single and grouped citations in order of first use", () => {
    expect(citedNumbers("A [2]. B [1, 3]. C [2].")).toEqual([2, 1, 3])
  })

  it("ignores links and task-list boxes", () => {
    expect(citedNumbers("See [1](https://example.com) and - [ ] todo")).toEqual(
      []
    )
  })

  it("flags citations to sources that were not given", () => {
    expect(checkCitations("Yes [1]. Also [4] and [0].", 3)).toEqual({
      cited: [1, 4, 0],
      invalid: [4, 0],
    })
  })

  it("reads the source number back from a citation link", () => {
    expect(citationFromHref("#source-12")).toBe(12)
    expect(citationFromHref("#sources")).toBeUndefined()
    expect(citationFromHref(undefined)).toBeUndefined()
  })

  it("strips citations and the space before them", () => {
    expect(stripCitations("It costs €29 a month [1]. Yes [2, 3].")).toBe(
      "It costs €29 a month. Yes."
    )
  })
})
