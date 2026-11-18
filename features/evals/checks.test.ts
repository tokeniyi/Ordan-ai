import { describe, expect, it } from "vitest"

import { runCheck, runChecks } from "@/features/evals/checks"

describe("runCheck", () => {
  it("matches text without case or markdown getting in the way", () => {
    const answer = "The capital is **Canberra**."
    expect(
      runCheck({ type: "includesAll", values: ["canberra"] }, answer)
    ).toBe(true)
    expect(
      runCheck({ type: "includesAll", values: ["Canberra", "Sydney"] }, answer)
    ).toBe(false)
  })

  it("passes includesAny when one value is present", () => {
    expect(
      runCheck(
        { type: "includesAny", values: ["5 cents", "0.05"] },
        "It costs $0.05."
      )
    ).toBe(true)
    expect(
      runCheck({ type: "includesAny", values: ["5 cents"] }, "It costs $0.10.")
    ).toBe(false)
  })

  it("fails excludes when a value is present", () => {
    expect(
      runCheck({ type: "excludes", values: ["sydney"] }, "Not Sydney.")
    ).toBe(false)
    expect(
      runCheck({ type: "excludes", values: ["sydney"] }, "Canberra.")
    ).toBe(true)
  })

  it("counts words for length limits", () => {
    expect(runCheck({ type: "maxWords", value: 3 }, "Red, green, blue")).toBe(
      true
    )
    expect(runCheck({ type: "maxWords", value: 2 }, "Red, green, blue")).toBe(
      false
    )
    expect(runCheck({ type: "minWords", value: 4 }, "Red, green, blue")).toBe(
      false
    )
  })

  it("tests a regular expression against the raw answer", () => {
    const check = {
      type: "matches",
      pattern: "\\b(9|nine)\\b",
      flags: "i",
    } as const
    expect(runCheck(check, "Nine sheep are left.")).toBe(true)
    expect(runCheck(check, "19 sheep")).toBe(false)
  })

  it("finds fenced code blocks", () => {
    expect(runCheck({ type: "hasCodeBlock" }, "```ts\nconst a = 1\n```")).toBe(
      true
    )
    expect(runCheck({ type: "hasCodeBlock" }, "const a = 1")).toBe(false)
  })
})

describe("runChecks", () => {
  it("labels each check with its result", () => {
    const results = runChecks(
      [
        { type: "includesAll", values: ["1969"] },
        { type: "maxWords", value: 2 },
      ],
      "Apollo 11 landed in 1969."
    )
    expect(results.map((result) => result.passed)).toEqual([true, false])
    expect(results[1].label).toBe("At most 2 words")
  })
})
