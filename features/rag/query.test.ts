import { describe, expect, it } from "vitest"

import {
  hypotheticalPassage,
  parsePlan,
  parseVariants,
  planPrompt,
  planQuery,
  queryVariants,
  type Complete,
} from "@/features/rag/query"

describe("parsePlan", () => {
  it("reads a search with a rewritten query", () => {
    expect(
      parsePlan("SEARCH: yes\nQUERY: How far does the K2 go?", "How far?")
    ).toEqual({ search: true, query: "How far does the K2 go?" })
  })

  it("reads a skipped search", () => {
    expect(parsePlan("SEARCH: no\nQUERY: none", "thanks")).toEqual({
      search: false,
      query: "thanks",
    })
  })

  it("tolerates Markdown, case and quotes", () => {
    expect(
      parsePlan('**Search:** Yes\n**Query:** "What does the K1 weigh?"', "x")
    ).toEqual({ search: true, query: "What does the K1 weigh?" })
  })

  it("searches with the message when the reply cannot be read", () => {
    expect(parsePlan("I think you should search.", "deposit?")).toEqual({
      search: true,
      query: "deposit?",
    })
    expect(parsePlan("SEARCH: yes\nQUERY: none", "deposit?")).toEqual({
      search: true,
      query: "deposit?",
    })
  })
})

describe("planQuery", () => {
  it("sends the earlier turns without citations and the newest message", async () => {
    let prompt = ""
    const complete: Complete = async (request) => {
      prompt = request.prompt
      return "SEARCH: yes\nQUERY: What is the range of the K2 cargo bike?"
    }
    const plan = await planQuery({
      turns: [
        { role: "user", text: "Tell me about the cargo bike." },
        { role: "assistant", text: "The K2 weighs 38 kg [1, 2]." },
        { role: "user", text: "How far does it go?" },
      ],
      complete,
    })
    expect(plan).toEqual({
      search: true,
      query: "What is the range of the K2 cargo bike?",
    })
    expect(prompt).toContain("assistant: The K2 weighs 38 kg.")
    expect(prompt).toContain("<newest_message>\nHow far does it go?")
  })

  it("says so when there are no earlier turns", () => {
    expect(planPrompt([{ role: "user", text: "hi" }])).toContain(
      "(no earlier messages)"
    )
  })
})

describe("query expansion", () => {
  it("searches with the made-up passage, or the question if it is empty", async () => {
    expect(
      await hypotheticalPassage({
        query: "q",
        complete: async () => " A passage. ",
      })
    ).toBe("A passage.")
    expect(
      await hypotheticalPassage({ query: "q", complete: async () => "" })
    ).toBe("q")
  })

  it("reads one variant per line, without numbers, repeats or the question", async () => {
    expect(
      parseVariants(
        '1. Family plan deposit refund\n- "deposit refund time"\n\nFamily plan deposit refund\nIs there a deposit?\nfourth\nfifth',
        "Is there a deposit?"
      )
    ).toEqual(["Family plan deposit refund", "deposit refund time", "fourth"])
    expect(
      await queryVariants({ query: "q", complete: async () => "a\nb" })
    ).toEqual(["a", "b"])
  })
})
