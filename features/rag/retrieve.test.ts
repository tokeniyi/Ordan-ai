import { describe, expect, it } from "vitest"

import { withoutOldCitations } from "@/features/rag/history"
import { formatSources, withSources } from "@/features/rag/prompt"
import { parseKnowledge } from "@/features/rag/request"
import { conversationTurns } from "@/features/rag/retrieve"
import { type RagInfo } from "@/features/rag/types"

describe("conversationTurns", () => {
  it("keeps the text of each turn up to the newest user message", () => {
    expect(
      conversationTurns([
        { role: "user", parts: [{ type: "text", text: "First" }] },
        { role: "assistant", parts: [{ type: "text", text: "Reply" }] },
        { role: "system", parts: [{ type: "text", text: "Ignored" }] },
        {
          role: "user",
          parts: [
            { type: "text", text: "Second" },
            { type: "file" },
            { type: "text", text: "question" },
          ],
        },
        { role: "assistant", parts: [{ type: "text", text: "Not yet" }] },
      ])
    ).toEqual([
      { role: "user", text: "First" },
      { role: "assistant", text: "Reply" },
      { role: "user", text: "Second\nquestion" },
    ])
    expect(conversationTurns([])).toEqual([])
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
