import { describe, expect, it } from "vitest"

import { reciprocalRankFusion } from "@/features/search/fusion"
import { rerank } from "@/features/search/rerank"
import { search } from "@/features/search/search"
import { type SearchHit, type SearchIndex } from "@/features/search/types"

describe("reciprocalRankFusion", () => {
  it("adds 1 / (k + rank) from every list", () => {
    const fused = reciprocalRankFusion(
      [
        [0, 1],
        [1, 2],
      ],
      1
    )
    // 1 is second and first: 1/3 + 1/2. 0 is first once: 1/2. 2: 1/3.
    expect(fused.map((f) => f.index)).toEqual([1, 0, 2])
    expect(fused[0].score).toBeCloseTo(1 / 3 + 1 / 2)
  })

  it("favours an item that ranks well in both lists over one that tops one", () => {
    const fused = reciprocalRankFusion([
      [0, 2, 3, 4, 5, 6, 7, 8, 9, 1],
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 0],
    ])
    expect(fused[0].index).toBe(2)
  })
})

// Two chunks: the first is close in meaning, the second shares the word.
const index: SearchIndex = {
  strategy: "recursive-headings",
  model: "fake",
  dimensions: 2,
  createdAt: "",
  chunks: [
    { vector: [1, 0], text: "Monthly plans cost little." },
    { vector: [0.6, 0.8], text: "A deposit of €100 for the cargo bike." },
    { vector: [0, 1], text: "Riders must be sixteen." },
  ].map(({ vector, text }, position) => ({
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

describe("hybrid search", () => {
  it("merges the semantic and keyword rankings", async () => {
    const embedQuery = async () => [1, 0]
    const query = "deposit"
    const semantic = await search({
      index,
      query,
      method: "semantic",
      embedQuery,
    })
    const keyword = await search({
      index,
      query,
      method: "keyword",
      embedQuery,
    })
    const hybrid = await search({ index, query, method: "hybrid", embedQuery })

    expect(semantic.map((h) => h.chunk.id)).toEqual(["doc#0", "doc#1"])
    expect(keyword.map((h) => h.chunk.id)).toEqual(["doc#1"])
    // doc#1 is second by meaning and first by keyword, so it comes first.
    expect(hybrid.map((h) => h.chunk.id)).toEqual(["doc#1", "doc#0"])
    expect(hybrid.map((h) => h.rank)).toEqual([1, 2])
  })
})

describe("rerank", () => {
  const hits = index.chunks.map((chunk, i): SearchHit => ({
    rank: i + 1,
    score: 0.9 - i / 10,
    chunk,
  }))

  it("orders the hits by the reranker's scores and renumbers them", async () => {
    const reranked = await rerank({
      query: "age",
      hits,
      scorePairs: async (_, texts) =>
        texts.map((text) => (text.includes("sixteen") ? 0.9 : 0.1)),
    })
    expect(reranked.map((h) => [h.rank, h.chunk.id, h.score])).toEqual([
      [1, "doc#2", 0.9],
      [2, "doc#0", 0.1],
      [3, "doc#1", 0.1],
    ])
  })

  it("does not call the reranker with nothing to rank", async () => {
    let called = false
    await rerank({
      query: "x",
      hits: [],
      scorePairs: async () => {
        called = true
        return []
      },
    })
    expect(called).toBe(false)
  })
})
