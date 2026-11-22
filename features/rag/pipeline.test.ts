import { describe, expect, it } from "vitest"

import {
  BASIC_SETTINGS,
  runRetrieval,
  type RetrievalSettings,
} from "@/features/rag/pipeline"
import { type Complete, type Turn } from "@/features/rag/query"
import { type SearchIndex } from "@/features/search/types"

// The fake embedding puts each topic on its own axis, so it is easy to see
// which text found which chunk.
const TOPICS = ["price", "range", "age"]
const embed = async (text: string) =>
  TOPICS.map((topic) => (text.toLowerCase().includes(topic) ? 1 : 0))

const index: SearchIndex = {
  strategy: "recursive-headings",
  model: "fake",
  dimensions: 3,
  createdAt: "",
  chunks: [
    { text: "The price is €29.", vector: [1, 0, 0] },
    { text: "The range is 55 km.", vector: [0, 1, 0] },
    { text: "Riders' minimum age is 16.", vector: [0, 0, 1] },
  ].map(({ text, vector }, position) => ({
    id: `doc#${position}`,
    docId: "doc",
    docTitle: "Doc",
    index: position,
    text,
    start: 0,
    end: text.length,
    tokens: 5,
    embedText: text,
    vector,
  })),
}

const turns: Turn[] = [
  { role: "user", text: "Tell me about the cargo bike." },
  { role: "assistant", text: "It carries two children." },
  { role: "user", text: "How far does it go?" },
]

const settings = (overrides: Partial<RetrievalSettings>) => ({
  ...BASIC_SETTINGS,
  k: 2,
  ...overrides,
})

// Answers each kind of request the way a model might.
function fakeModel(replies: { plan?: string; hyde?: string; multi?: string }) {
  const calls: string[] = []
  const complete: Complete = async ({ system }) => {
    const kind = system.includes("SEARCH:")
      ? "plan"
      : system.includes("write the passage")
        ? "hyde"
        : "multi"
    calls.push(kind)
    return replies[kind] ?? ""
  }
  return { complete, calls }
}

describe("runRetrieval", () => {
  it("searches with the newest message when there is no plan", async () => {
    const result = await runRetrieval({
      index,
      turns,
      settings: settings({}),
      calls: { embed },
    })
    // "How far does it go?" names no topic, so nothing matches.
    expect(result.searched).toBe(true)
    expect(result.query).toBe("How far does it go?")
    expect(result.sources).toEqual([])
    expect(result.steps.map((s) => s.type)).toEqual(["search"])
  })

  it("searches with the planner's rewrite", async () => {
    const model = fakeModel({
      plan: "SEARCH: yes\nQUERY: What is the range of the cargo bike?",
    })
    const result = await runRetrieval({
      index,
      turns,
      settings: settings({ plan: true }),
      calls: { embed, complete: model.complete },
    })
    expect(result.query).toBe("What is the range of the cargo bike?")
    expect(result.sources.map((s) => [s.n, s.chunkId])).toEqual([[1, "doc#1"]])
    expect(result.steps[0]).toMatchObject({
      type: "plan",
      search: true,
      query: "What is the range of the cargo bike?",
    })
  })

  it("skips the search when the planner says so", async () => {
    const model = fakeModel({ plan: "SEARCH: no\nQUERY: none" })
    const result = await runRetrieval({
      index,
      turns: [...turns, { role: "user", text: "thanks!" }],
      settings: settings({ plan: true, expand: "multi", rerank: true }),
      calls: { embed, complete: model.complete },
    })
    expect(result.searched).toBe(false)
    expect(result.sources).toEqual([])
    expect(model.calls).toEqual(["plan"])
  })

  it("searches with the made-up passage for HyDE", async () => {
    const model = fakeModel({ hyde: "The age limit is 16." })
    const result = await runRetrieval({
      index,
      turns: [{ role: "user", text: "Can my son ride?" }],
      settings: settings({ expand: "hyde" }),
      calls: { embed, complete: model.complete },
    })
    expect(result.sources[0].chunkId).toBe("doc#2")
    expect(result.steps[0]).toMatchObject({
      type: "expand",
      kind: "hyde",
      texts: ["The age limit is 16."],
    })
  })

  it("merges the searches for every wording in multi-query", async () => {
    const model = fakeModel({ multi: "monthly price\nbattery range" })
    const result = await runRetrieval({
      index,
      turns: [{ role: "user", text: "What does it cost and how far?" }],
      settings: settings({ expand: "multi" }),
      calls: { embed, complete: model.complete },
    })
    expect(result.sources.map((s) => s.chunkId).sort()).toEqual([
      "doc#0",
      "doc#1",
    ])
    expect(result.steps[1]).toMatchObject({ type: "search", searches: 3 })
  })

  it("reranks the candidates and keeps the top k", async () => {
    const result = await runRetrieval({
      index,
      turns: [{ role: "user", text: "price, range or age?" }],
      settings: settings({ rerank: true, k: 1 }),
      calls: {
        embed,
        scorePairs: async (_, texts) =>
          texts.map((text) => (text.includes("16") ? 0.9 : 0.2)),
      },
    })
    expect(result.ranked).toHaveLength(3)
    expect(result.sources.map((s) => [s.chunkId, s.score])).toEqual([
      ["doc#2", 0.9],
    ])
    expect(result.steps.map((s) => s.type)).toEqual(["search", "rerank"])
  })

  it("drops weak matches from a plain semantic search", async () => {
    const result = await runRetrieval({
      index,
      turns: [{ role: "user", text: "price and range" }],
      settings: settings({ k: 3 }),
      // The range chunk scores 0.1, under the 0.2 threshold.
      calls: { embed: async () => [1, 0.1, 0] },
    })
    expect(result.sources.map((s) => s.chunkId)).toEqual(["doc#0"])
  })

  it("does not search an empty message", async () => {
    const result = await runRetrieval({
      index,
      turns: [{ role: "user", text: "  " }],
      settings: settings({}),
      calls: { embed },
    })
    expect(result.searched).toBe(false)
  })

  it("says which call is missing", async () => {
    await expect(
      runRetrieval({
        index,
        turns,
        settings: settings({ plan: true }),
        calls: { embed },
      })
    ).rejects.toThrow("need complete")
  })
})
