import { describe, expect, it } from "vitest"

import {
  chunkDocument,
  fixedChunks,
  recursiveChunks,
  sentenceChunks,
} from "@/features/search/chunk/strategies"
import { paragraphs, sections, sentences } from "@/features/search/chunk/units"
import { parseDocument } from "@/features/search/corpus"
import { CHUNK_STRATEGIES } from "@/features/search/types"

// One token per word keeps the sizes easy to check by hand.
const count = (text: string) => text.split(/\s+/).filter(Boolean).length

const doc = parseDocument(
  "test",
  `# Test page

Intro sentence one. Intro sentence two.

## Prices

The basic plan costs ten euros. The large plan costs twenty euros. Students pay less.

| Plan | Price |
| --- | --- |
| Basic | €10 |

## Repairs

Repairs are free. Call the help line for a flat tyre. A mechanic comes within an hour.`
)

describe("splitting into units", () => {
  it("keeps offsets that point back into the text", () => {
    for (const span of [
      ...paragraphs(doc.text),
      ...sentences(doc.text),
      ...sections(doc.text),
    ]) {
      expect(doc.text.slice(span.start, span.end)).toBe(span.text)
    }
  })

  it("splits sections at headings and keeps the heading", () => {
    expect(sections(doc.text).map((s) => s.heading)).toEqual([
      undefined,
      "Prices",
      "Repairs",
    ])
  })

  it("ends sentences at punctuation and at line breaks", () => {
    const texts = sentences("One. Two!\n| a | b |\nThree? Four").map(
      (s) => s.text
    )
    expect(texts).toEqual(["One.", "Two!", "| a | b |", "Three?", "Four"])
  })
})

describe("chunk strategies", () => {
  it.each(CHUNK_STRATEGIES)("%s: chunks stay within the size", (strategy) => {
    const chunks = chunkDocument(doc, strategy, { size: 12, count })
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(count(chunk.text)).toBeLessThanOrEqual(12)
      expect(doc.text.slice(chunk.start, chunk.end)).toBe(chunk.text)
      expect(chunk.id).toBe(`test#${chunk.index}`)
    }
  })

  it.each(CHUNK_STRATEGIES)("%s: every word is in some chunk", (strategy) => {
    const chunks = chunkDocument(doc, strategy, { size: 12, count })
    const covered = new Set<number>()
    for (const chunk of chunks) {
      for (let i = chunk.start; i < chunk.end; i++) covered.add(i)
    }
    for (const match of doc.text.matchAll(/\S/g)) {
      expect(covered.has(match.index)).toBe(true)
    }
  })

  it("fixed chunks overlap and can cut sentences", () => {
    const chunks = fixedChunks(doc, { size: 20, count })
    expect(chunks[1].start).toBeLessThan(chunks[0].end)
  })

  it("sentence chunks never cut a sentence", () => {
    // A chunk ends with a sentence's punctuation, or at the end of a line,
    // such as a heading or a table row.
    for (const chunk of sentenceChunks(doc, { size: 12, count })) {
      const next = doc.text[chunk.end]
      expect(
        /[.!?]$/.test(chunk.text) || next === undefined || next === "\n"
      ).toBe(true)
    }
  })

  it("recursive chunks never cross a heading", () => {
    const chunks = recursiveChunks(doc, { size: 50, count })
    expect(chunks.map((c) => c.heading)).toEqual([
      undefined,
      "Prices",
      "Repairs",
    ])
    expect(chunks[1].text.startsWith("## Prices")).toBe(true)
    expect(chunks[1].text).not.toContain("Repairs")
  })

  it("recursive chunks split a large section further", () => {
    const chunks = recursiveChunks(doc, { size: 8, count })
    expect(chunks.filter((c) => c.heading === "Prices").length).toBeGreaterThan(
      1
    )
  })

  it("adds the title and heading to what is embedded, not to the text", () => {
    const [, prices] = chunkDocument(doc, "recursive-headings", {
      size: 50,
      count,
    })
    expect(prices.embedText).toBe(`Test page > Prices\n\n${prices.text}`)
    expect(prices.tokens).toBe(count(prices.embedText))
  })
})
