import { describe, expect, it } from "vitest"

import { withoutOldCitations } from "@/features/rag/history"
import { formatSources, withSources } from "@/features/rag/prompt"
import { parseKnowledge } from "@/features/rag/request"
import { retrievalQuery, retrieve } from "@/features/rag/retrieve"
import { type RagInfo } from "@/features/rag/types"
import { type SearchIndex } from "@/features/search/types"

// Two-dimensional vectors make the ranking easy to follow.
const index: SearchIndex = {
  strategy: "recursive-headings",
  model: "fake",
  dimensions: 2,
  createdAt: "",
  chunks: [
    { x: 1, y: 0, id: "prices#0", heading: "Plans", text: "€29 a month." },
    { x: 0.8, y: 0.6, id: "prices#1", text: "No deposit." },
    { x: 0, y: 1, id: "rules#0", heading: "Age", text: "Riders are 16+." },
  ].map(({ x, y, id, heading, text }, position) => ({
    id,
    docId: id.split("#")[0],
    docTitle: id.startsWith("prices") ? "Prices" : "Rules",
    index: position,
    ...(heading && { heading }),
    text,
    start: 0,
    end: text.length,
    tokens: 3,
    embedText: text,
    vector: [x, y],
  })),
}

const embedQuery = async () => [1, 0]

describe("retrieve", () => {
  it("numbers the closest chunks from 1 and drops weak ones", async () => {
    const sources = await retrieve({
      index,
      query: "price",
      embedQuery,
      k: 3,
      minScore: 0.5,
    })
    expect(sources.map((s) => [s.n, s.chunkId, s.score])).toEqual([
      [1, "prices#0", 1],
      [2, "prices#1", 0.8],
    ])
    expect(sources[0]).toMatchObject({ docTitle: "Prices", heading: "Plans" })
  })

  it("does not search for an empty question", async () => {
    expect(await retrieve({ index, query: "  ", embedQuery })).toEqual([])
  })

  it("searches with the newest user message", () => {
    expect(
      retrievalQuery([
        { role: "user", parts: [{ type: "text", text: "First" }] },
        { role: "assistant", parts: [{ type: "text", text: "Reply" }] },
        {
          role: "user",
          parts: [
            { type: "text", text: "Second" },
            { type: "file" },
            { type: "text", text: "question" },
          ],
        },
      ])
    ).toBe("Second\nquestion")
    expect(retrievalQuery([])).toBe("")
  })
})

describe("the sources prompt", () => {
  const sources = [
    {
      n: 1,
      chunkId: "prices#0",
      docId: "prices",
      docTitle: 'Prices & "plans"',
      heading: "Plans",
      text: "€29 a month.",
      score: 1,
    },
  ]

  it("tags each source with its number and title", () => {
    expect(formatSources(sources)).toBe(
      '<sources>\n<source id="1" title="Prices &amp; &quot;plans&quot; > Plans">\n€29 a month.\n</source>\n</sources>'
    )
  })

  it("says when nothing matched, so the model can say it does not know", () => {
    expect(formatSources([])).toContain("No passages matched")
  })

  it("adds the instructions and sources after the system prompt", () => {
    const system = withSources("Be brief.", sources)
    expect(system.startsWith("Be brief.\n\n<knowledge_instructions>")).toBe(
      true
    )
    expect(system.endsWith("</sources>")).toBe(true)
  })
})

describe("parseKnowledge", () => {
  it("defaults to no documents and rejects unknown ones", () => {
    expect(parseKnowledge(undefined)).toBe("none")
    expect(parseKnowledge("kestrel")).toBe("kestrel")
    expect(parseKnowledge("wikipedia")).toBeUndefined()
  })
})

describe("withoutOldCitations", () => {
  const rag: RagInfo = { knowledge: "kestrel", query: "", sources: [], ms: 0 }

  it("strips citations only from answers that had sources", () => {
    const messages = [
      { role: "user", parts: [{ type: "text", text: "Is it [1]?" }] },
      {
        role: "assistant",
        parts: [{ type: "text", text: "Yes [1]." }],
        metadata: { rag },
      },
      { role: "assistant", parts: [{ type: "text", text: "Use items[1]." }] },
    ]
    expect(withoutOldCitations(messages).map((m) => m.parts[0].text)).toEqual([
      "Is it [1]?",
      "Yes.",
      "Use items[1].",
    ])
  })
})
