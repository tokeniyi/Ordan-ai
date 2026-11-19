import { APICallError } from "ai"
import { describe, expect, it, vi } from "vitest"

import { memoryCache } from "@/features/evals/cache"
import { runEval, type Answer, type EvalCalls } from "@/features/evals/run"
import { type Dataset } from "@/features/evals/types"
import { type PromptDefinition } from "@/features/prompts/types"

const prompt: PromptDefinition = {
  id: "p",
  name: "P",
  version: 1,
  technique: "",
  description: "",
  system: "Be brief.",
}

const dataset: Dataset = {
  id: "test",
  description: "",
  cases: [
    {
      id: "a",
      category: "facts",
      input: "Capital of France?",
      reference: "Paris",
      checks: [{ type: "includesAll", values: ["Paris"] }],
    },
    { id: "b", category: "facts", input: "2 + 2?", reference: "4" },
  ],
}

function answer(text: string): Answer {
  return {
    text,
    latencyMs: 100,
    inputTokens: 5,
    outputTokens: 3,
    costUsd: 0.001,
  }
}

function fakeCalls(generate: EvalCalls["generate"]): EvalCalls {
  return {
    generate: vi.fn(generate),
    judge: vi.fn(async () => ({
      correctness: 5,
      relevance: 4,
      clarity: 3,
      reason: "",
    })),
  }
}

function run(calls: EvalCalls, cache = memoryCache(), judge = false) {
  return runEval({
    dataset,
    prompts: [prompt],
    model: "m",
    judgeModel: "j",
    judge,
    concurrency: 1,
    cache,
    calls,
  })
}

describe("runEval", () => {
  it("scores answers with the checks and the judge", async () => {
    const calls = fakeCalls(async () => answer("Paris."))
    const report = await run(calls, memoryCache(), true)

    expect(report.results.map((r) => r.checksPassed)).toEqual([true, true])
    expect(report.results[0].quality).toBe(80)
    expect(report.summaries[0]).toMatchObject({
      cases: 2,
      passed: 2,
      totalCostUsd: 0.002,
    })
  })

  it("reuses cached answers on the next run", async () => {
    const calls = fakeCalls(async () => answer("Paris."))
    const cache = memoryCache()

    await run(calls, cache)
    const second = await run(calls, cache)

    expect(calls.generate).toHaveBeenCalledTimes(2)
    expect(second.calls).toEqual({ made: 0, cached: 2 })
  })

  it("stops starting calls after a rate limit", async () => {
    const calls = fakeCalls(async () => {
      throw new APICallError({
        message: "Too Many Requests",
        url: "",
        requestBodyValues: {},
        statusCode: 429,
      })
    })
    const report = await run(calls)

    expect(calls.generate).toHaveBeenCalledTimes(1)
    expect(report.stoppedReason).toMatch(/rate limit/)
    expect(report.results[1].error).toMatch(/Skipped/)
  })
})
