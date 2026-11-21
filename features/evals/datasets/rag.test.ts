import { readFile } from "node:fs/promises"

import { describe, expect, it } from "vitest"

import { runCheck } from "@/features/evals/checks"
import { rag } from "@/features/evals/datasets/rag"
import { RAG_STRATEGY } from "@/features/rag/config"
import { loadCorpus } from "@/features/search/corpus"
import { indexPath } from "@/features/search/index-files"
import { isRelevant } from "@/features/search/metrics"
import { type SearchIndex } from "@/features/search/types"

function passes(id: string, answer: string) {
  const testCase = rag.cases.find((c) => c.id === id)
  if (!testCase?.checks) throw new Error(`No checks for ${id}`)
  return testCase.checks.every((check) => runCheck(check, answer))
}

describe("rag dataset", async () => {
  const docs = new Map((await loadCorpus()).map((doc) => [doc.id, doc]))
  const index = JSON.parse(
    await readFile(indexPath(RAG_STRATEGY), "utf8")
  ) as SearchIndex

  it("has unique ids and asks about the Kestrel help centre", () => {
    const ids = rag.cases.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(rag.knowledge).toBe("kestrel")
  })

  it("names a passage for every case the help centre answers", () => {
    for (const testCase of rag.cases) {
      const covered = testCase.category !== "not-covered"
      expect(Boolean(testCase.retrieval), testCase.id).toBe(covered)
    }
  })

  it("names passages that are in the document and whole in some chunk", () => {
    for (const testCase of rag.cases) {
      if (!testCase.retrieval) continue
      const { docId, evidence } = testCase.retrieval
      expect(docs.get(docId)?.text, testCase.id).toContain(evidence)
      expect(
        index.chunks.some((chunk) => isRelevant(chunk, testCase.retrieval!)),
        `${testCase.id} has no chunk that contains its passage`
      ).toBe(true)
    }
  })

  it("checks facts, not wording", () => {
    expect(passes("login-code", "It expires after **10 minutes** [1].")).toBe(
      true
    )
    expect(passes("cargo-children", "Up to 2 kids aged six or under.")).toBe(
      true
    )
    expect(passes("helmet", "You can add one for €3 a month [2].")).toBe(true)
    expect(passes("wrong-price", "It costs €35 a month.")).toBe(false)
  })
})
