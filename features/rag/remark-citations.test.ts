import { describe, expect, it } from "vitest"

import { remarkCitations } from "@/features/rag/remark-citations"

const text = (value: string) => ({ type: "text", value })
const link = (n: number) => ({
  type: "link",
  url: `#source-${n}`,
  children: [text(String(n))],
})

function run(tree: object) {
  remarkCitations()(tree as never)
  return tree
}

describe("remarkCitations", () => {
  it("turns citations in prose into one link per source", () => {
    const tree = run({
      type: "root",
      children: [
        { type: "paragraph", children: [text("Costs €29 [1, 2]. Free [3]")] },
      ],
    })
    expect(tree).toEqual({
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [
            text("Costs €29 "),
            link(1),
            link(2),
            text(". Free "),
            link(3),
          ],
        },
      ],
    })
  })

  it("leaves code and existing links alone", () => {
    const tree = {
      type: "root",
      children: [
        { type: "code", value: "items[1]" },
        {
          type: "paragraph",
          children: [
            { type: "inlineCode", value: "a[2]" },
            { type: "link", url: "x", children: [text("[3]")] },
          ],
        },
      ],
    }
    const before = structuredClone(tree)
    expect(run(tree)).toEqual(before)
  })
})
