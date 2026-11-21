import { CITATION, numbersIn } from "@/features/rag/citations"

// The few parts of a Markdown syntax tree (mdast) this plugin touches.
interface MdNode {
  type: string
  value?: string
  url?: string
  children?: MdNode[]
}

// Node types whose text must stay as written: code, and links, which cannot
// hold another link.
const SKIP = new Set(["code", "inlineCode", "link", "linkReference", "html"])

// Splits a text node into text and one link per cited number.
function splitText(value: string): MdNode[] {
  const nodes: MdNode[] = []
  let last = 0
  for (const match of value.matchAll(new RegExp(CITATION))) {
    const index = match.index ?? 0
    if (index > last) {
      nodes.push({ type: "text", value: value.slice(last, index) })
    }
    for (const n of numbersIn(match[1])) {
      nodes.push({
        type: "link",
        url: `#source-${n}`,
        children: [{ type: "text", value: String(n) }],
      })
    }
    last = index + match[0].length
  }
  if (nodes.length === 0) return [{ type: "text", value }]
  if (last < value.length) {
    nodes.push({ type: "text", value: value.slice(last) })
  }
  return nodes
}

function visit(node: MdNode) {
  if (!node.children || SKIP.has(node.type)) return
  node.children = node.children.flatMap((child) => {
    if (child.type === "text" && child.value) return splitText(child.value)
    visit(child)
    return [child]
  })
}

// A remark plugin that turns "[1]" and "[1, 2]" in prose into links to
// "#source-<n>", which the chat renders as inline citations. Code is left
// alone, so `items[1]` stays as it is.
export function remarkCitations() {
  return (tree: MdNode) => visit(tree)
}
