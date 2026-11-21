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
    summarize: vi.fn(async () => ({
      text: "- The user's name is Ada.",
      inputTokens: 50,
      outputTokens: 10,
      costUsd: 0.01,
    })),
    retrieve: vi.fn(async () => []),
  }
}

// A conversation long enough to be trimmed with a small budget: the name is
// in the first turn, the question in the last.
const longCase: Dataset = {
  id: "history",
  description: "",
  historyBudget: 300,
  cases: [
    {
      id: "name",
      category: "recall",
      history: [
        { role: "user", content: "My name is Ada." },
        { role: "assistant", content: "Nice to meet you, Ada." },
        ...Array.from({ length: 6 }, (_, index) => [
          {
            role: "user" as const,
            content: `Question ${index} ${"x ".repeat(80)}`,
          },
          {
            role: "assistant" as const,
            content: `Answer ${index} ${"y ".repeat(80)}`,
          },
        ]).flat(),
      ],
      input: "What is my name?",
      reference: "Ada",
    },
  ],
}

function runHistory(
  calls: EvalCalls,
  strategy: "full" | "window" | "summary",
  cache = memoryCache()
) {
  return runEval({
    dataset: longCase,
    prompts: [prompt],
    model: "m",
    judgeModel: "j",
    judge: false,
    history: { strategy },
    concurrency: 1,
    cache,
    calls,
  })
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

  it("sends one-turn cases without history", async () => {
    const calls = fakeCalls(async () => answer("Paris."))
    await run(calls)
    expect(vi.mocked(calls.generate).mock.calls[0][0].history).toEqual([])
    expect(calls.summarize).not.toHaveBeenCalled()
  })
})

describe("runEval with history", () => {
  it("sends every turn with the full strategy", async () => {
    const calls = fakeCalls(async () => answer("Ada."))
    const report = await runHistory(calls, "full")

    const input = vi.mocked(calls.generate).mock.calls[0][0]
    expect(input.history).toHaveLength(14)
    expect(input.input).toBe("What is my name?")
    expect(report.history).toEqual({ strategy: "full", budget: 300 })
    expect(report.results[0].context).toMatchObject({
      totalMessages: 15,
      sentMessages: 15,
      summarized: false,
    })
  })

  it("drops the oldest turns with the window strategy", async () => {
    const calls = fakeCalls(async () => answer("I don't know."))
    const report = await runHistory(calls, "window")

    const input = vi.mocked(calls.generate).mock.calls[0][0]
    expect(input.history.length).toBeLessThan(14)
    expect(report.results[0].context?.summarized).toBe(false)
    expect(JSON.stringify(input.history)).not.toContain("Ada")
    expect(input.system).toContain("<conversation_note>")
    expect(calls.summarize).not.toHaveBeenCalled()
  })

  it("summarizes the oldest turns and counts the summary's cost", async () => {
    const calls = fakeCalls(async () => answer("Ada."))
    const report = await runHistory(calls, "summary")

    const input = vi.mocked(calls.generate).mock.calls[0][0]
    expect(input.system).toContain("The user's name is Ada.")
    expect(report.results[0].context).toMatchObject({
      summarized: true,
      summaryInputTokens: 50,
      summaryOutputTokens: 10,
    })
    expect(report.results[0].costUsd).toBeCloseTo(0.011)
    expect(report.summaries[0].avgSummaryTokens).toBe(60)
  })

  it("caches summaries between runs", async () => {
    const calls = fakeCalls(async () => answer("Ada."))
    const cache = memoryCache()
    await runHistory(calls, "summary", cache)
    const second = await runHistory(calls, "summary", cache)

    expect(calls.summarize).toHaveBeenCalledTimes(1)
    expect(second.calls).toEqual({ made: 0, cached: 2 })
  })

  it("stops when summarizing hits the rate limit", async () => {
    const calls = fakeCalls(async () => answer("Ada."))
    calls.summarize = vi.fn(async () => {
      throw new APICallError({
        message: "Too Many Requests",
        url: "",
        requestBodyValues: {},
        statusCode: 429,
      })
    })
    const report = await runHistory(calls, "summary")

    expect(calls.generate).not.toHaveBeenCalled()
    expect(report.stoppedReason).toMatch(/rate limit/)
    expect(report.results[0].error).toMatch(/Skipped/)
  })
})

// A knowledge case with its passage, one the documents do not answer, and a
// follow-up whose earlier answer cites a source.
const ragDataset: Dataset = {
  id: "rag",
  description: "",
  knowledge: "kestrel",
  cases: [
    {
      id: "price",
      category: "answerable",
      input: "What does the Commuter plan cost?",
      reference: "€29 a month",
      retrieval: { docId: "memberships", evidence: "€29 a month" },
    },
    {
      id: "buy",
      category: "not-covered",
      input: "Can I buy a bike?",
      reference: "Not covered",
    },
    {
      id: "follow-up",
      category: "follow-up",
      history: [
        { role: "user", content: "Tell me about the Commuter plan." },
        { role: "assistant", content: "It includes the K1 bike [2]." },
      ],
      input: "How much is it?",
      reference: "€29 a month",
    },
  ],
}

const ragSources = [
  {
    n: 1,
    chunkId: "memberships#1",
    docId: "memberships",
    docTitle: "Memberships",
    text: "| Commuter | €29 a month |",
    score: 0.6,
  },
  {
    n: 2,
    chunkId: "bikes#0",
    docId: "bikes",
    docTitle: "Bikes",
    text: "Two bikes.",
    score: 0.4,
  },
]

function runRag(calls: EvalCalls, knowledge?: "none" | "kestrel") {
  return runEval({
    dataset: ragDataset,
    prompts: [prompt],
    model: "m",
    judgeModel: "j",
    knowledge,
    concurrency: 1,
    cache: memoryCache(),
    calls,
  })
}

describe("runEval with knowledge", () => {
  it("answers from the sources and scores retrieval and citations", async () => {
    const calls = fakeCalls(async () => answer("€29 a month [1]. See [5]."))
    calls.retrieve = vi.fn(async () => ragSources)
    calls.judge = vi.fn(async () => ({
      correctness: 5,
      relevance: 5,
      clarity: 5,
      faithfulness: 4,
      reason: "",
    }))
    const report = await runRag(calls)

    expect(calls.retrieve).toHaveBeenCalledWith(
      "What does the Commuter plan cost?"
    )
    const input = vi.mocked(calls.generate).mock.calls[0][0]
    expect(input.system).toContain('<source id="1" title="Memberships">')
    expect(vi.mocked(calls.judge).mock.calls[0][0].sources).toEqual(ragSources)

    expect(report.knowledge).toBe("kestrel")
    expect(report.results[0].rag).toEqual({
      sources: [
        { n: 1, chunkId: "memberships#1", score: 0.6 },
        { n: 2, chunkId: "bikes#0", score: 0.4 },
      ],
      hasEvidence: true,
      evidenceRank: 1,
      cited: [1, 5],
      invalidCitations: [5],
    })
    expect(report.summaries[0].rag).toEqual({
      evidenceCases: 1,
      evidenceFound: 1,
      faithfulness: 4,
      citedAnswers: 3,
      answers: 3,
      invalidCitations: 3,
    })
  })

  it("strips citations from earlier answers, as the chat does", async () => {
    const calls = fakeCalls(async () => answer("€29 [1]."))
    calls.retrieve = vi.fn(async () => ragSources)
    await runRag(calls)

    const followUp = vi
      .mocked(calls.generate)
      .mock.calls.find(([input]) => input.input === "How much is it?")![0]
    expect(followUp.history).toEqual([
      { role: "user", content: "Tell me about the Commuter plan." },
      { role: "assistant", content: "It includes the K1 bike." },
    ])
  })

  it("asks the same questions without sources when knowledge is off", async () => {
    const calls = fakeCalls(async () => answer("I don't know."))
    const report = await runRag(calls, "none")

    expect(calls.retrieve).not.toHaveBeenCalled()
    expect(vi.mocked(calls.generate).mock.calls[0][0].system).toBe("Be brief.")
    expect(vi.mocked(calls.judge).mock.calls[0][0].sources).toBeUndefined()
    expect(report.knowledge).toBe("none")
    expect(report.summaries[0].rag).toBeUndefined()
  })
})
