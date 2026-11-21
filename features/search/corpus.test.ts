import { readFile } from "node:fs/promises"

import { describe, expect, it } from "vitest"

import { loadCorpus } from "@/features/search/corpus"
import { RETRIEVAL_CASES } from "@/features/search/eval/cases"
import { indexPath } from "@/features/search/index-files"
import { isRelevant } from "@/features/search/metrics"
import { searchRequestSchema } from "@/features/search/request"
import { CHUNK_STRATEGIES, type SearchIndex } from "@/features/search/types"

// These tests read the committed files, so a corpus edit without
// `pnpm index`, or a test case that no chunk can answer, fails here.
describe("the Kestrel corpus and its indexes", async () => {
  const docs = await loadCorpus()
  const byId = new Map(docs.map((doc) => [doc.id, doc]))

  it("has titled documents", () => {
    expect(docs.length).toBe(8)
    for (const doc of docs) expect(doc.title).not.toBe(doc.id)
  })

  it("has unique cases whose passage is in the named document", () => {
    const ids = RETRIEVAL_CASES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const testCase of RETRIEVAL_CASES) {
      expect(byId.get(testCase.docId)?.text).toContain(testCase.evidence)
    }
  })

  it.each(CHUNK_STRATEGIES)("%s index matches the corpus", async (strategy) => {
    const index = JSON.parse(
      await readFile(indexPath(strategy), "utf8")
    ) as SearchIndex
    expect(index.strategy).toBe(strategy)
    for (const chunk of index.chunks) {
      expect(byId.get(chunk.docId)?.text.slice(chunk.start, chunk.end)).toBe(
        chunk.text
      )
      expect(chunk.vector).toHaveLength(index.dimensions)
      // The model reads 256 tokens, two of them special.
      expect(chunk.tokens).toBeLessThanOrEqual(254)
    }
    for (const testCase of RETRIEVAL_CASES) {
      expect(
        index.chunks.some((chunk) => isRelevant(chunk, testCase)),
        `${testCase.id} has no chunk that contains its passage`
      ).toBe(true)
    }
  })
})

describe("searchRequestSchema", () => {
  it("fills in defaults and rejects bad input", () => {
    expect(searchRequestSchema.parse({ query: " battery " })).toEqual({
      query: "battery",
      strategy: "recursive-headings",
      method: "semantic",
      k: 5,
    })
    expect(searchRequestSchema.safeParse({ query: "" }).success).toBe(false)
    expect(
      searchRequestSchema.safeParse({ query: "a", strategy: "magic" }).success
    ).toBe(false)
  })
})
