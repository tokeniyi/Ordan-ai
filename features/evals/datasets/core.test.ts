import { describe, expect, it } from "vitest"

import { runCheck } from "@/features/evals/checks"
import { core } from "@/features/evals/datasets/core"

function checksFor(id: string) {
  const testCase = core.cases.find((c) => c.id === id)
  if (!testCase?.checks) throw new Error(`No checks for ${id}`)
  return testCase.checks
}

function passes(id: string, answer: string) {
  return checksFor(id).every((check) => runCheck(check, answer))
}

describe("core dataset", () => {
  it("has unique case ids", () => {
    const ids = core.cases.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("accepts exactly three bullets and nothing else", () => {
    expect(passes("follow-three-bullets", "- a\n- b\n- c")).toBe(true)
    expect(passes("follow-three-bullets", "Intro\n- a\n- b\n- c")).toBe(false)
    expect(passes("follow-three-bullets", "- a\n- b\n- c\n- d")).toBe(false)
  })

  it("accepts bare JSON but not a fenced block", () => {
    expect(
      passes("follow-json", '{"name": "Neil Armstrong", "year": 1969}')
    ).toBe(true)
    expect(
      passes(
        "follow-json",
        '```json\n{"name": "Neil Armstrong", "year": 1969}\n```'
      )
    ).toBe(false)
  })

  it("accepts a one-sentence answer only", () => {
    expect(passes("follow-one-sentence", "An API is an interface.")).toBe(true)
    expect(
      passes("follow-one-sentence", "An API is an interface. It is useful.")
    ).toBe(false)
  })
})
