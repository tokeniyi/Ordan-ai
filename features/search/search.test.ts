import { describe, expect, it, vi } from "vitest"

import { buildIndex } from "@/features/search/build-index"
import { parseDocument } from "@/features/search/corpus"
import { createKeywordIndex, terms } from "@/features/search/keyword"
import { search } from "@/features/search/search"
import { compact, cosine, topK } from "@/features/search/vectors"

const count = (text: string) => text.split(/\s+/).filter(Boolean).length

// A fake embedding: one dimension per topic word, so "meaning" is easy to
// control in a test.
const TOPICS = ["battery", "price", "repair"]
const fakeEmbed = async (texts: string[]) =>
  texts.map((text) =>
    TOPICS.map((topic) => (text.toLowerCase().includes(topic) ? 1 : 0.01))
  )

const docs = [
  parseDocument("power", "# Power\n\nThe battery lasts a long time."),
  parseDocument("cost", "# Cost\n\nThe price is ten euros a month."),
  parseDocument("fix", "# Fixing\n\nEvery repair is free of charge."),
]

describe("vectors", () => {
  it("scores the same direction 1 and opposite -1", () => {
    expect(cosine([1, 2], [2, 4])).toBeCloseTo(1)
    expect(cosine([1, 0], [-1, 0])).toBeCloseTo(-1)
    expect(cosine([1, 0], [0, 1])).toBe(0)
    expect(cosine([0, 0], [1, 1])).toBe(0)
  })

  it("rounds vectors to keep index files small", () => {
    expect(compact([0.123456, -0.98766])).toEqual([0.1235, -0.9877])
  })

  it("returns the top k positive scores, best first", () => {
    expect(topK([0.1, 0.9, 0, 0.5], 2)).toEqual([
      { score: 0.9, index: 1 },
      { score: 0.5, index: 3 },
    ])
  })
})

describe("keyword search", () => {
  it("lowercases and drops stop words", () => {
    expect(terms("How long does the Battery last?")).toEqual([
      "long",
      "battery",
      "last",
    ])
  })

  it("ranks chunks with the rarer query words higher", () => {
    const index = createKeywordIndex([
      { embedText: "bike bike bike battery" },
      { embedText: "bike price" },
      { embedText: "bike" },
    ])
    const [battery, price, plain] = index.score("bike battery")
    expect(battery).toBeGreaterThan(price)
    expect(price).toBeGreaterThan(0)
    expect(plain).toBeLessThan(battery)
    expect(index.score("nothing here")).toEqual([0, 0, 0])
  })
})

describe("buildIndex and search", () => {
  it("embeds every chunk in batches", async () => {
    const embed = vi.fn(fakeEmbed)
    const index = await buildIndex({
      docs,
      strategy: "recursive",
      model: "fake",
      count,
      embed,
      batchSize: 2,
    })
    expect(index.chunks).toHaveLength(3)
    expect(index.dimensions).toBe(3)
    expect(embed).toHaveBeenCalledTimes(2)
  })

  it("finds chunks by meaning with semantic search", async () => {
    const index = await buildIndex({
      docs,
      strategy: "recursive",
      model: "fake",
      count,
      embed: fakeEmbed,
    })
    const hits = await search({
      index,
      query: "Is a repair expensive?",
      method: "semantic",
      k: 2,
      embedQuery: async (q) => (await fakeEmbed([q]))[0],
    })
    expect(hits[0]).toMatchObject({ rank: 1, chunk: { docId: "fix" } })
    expect(hits[0].chunk).not.toHaveProperty("vector")
    expect(hits).toHaveLength(2)
  })

  it("finds chunks by shared words with keyword search, without embedding", async () => {
    const index = await buildIndex({
      docs,
      strategy: "recursive",
      model: "fake",
      count,
      embed: fakeEmbed,
    })
    const embedQuery = vi.fn()
    const hits = await search({
      index,
      query: "monthly price",
      method: "keyword",
      embedQuery,
    })
    expect(embedQuery).not.toHaveBeenCalled()
    expect(hits.map((hit) => hit.chunk.docId)).toEqual(["cost"])
  })
})
