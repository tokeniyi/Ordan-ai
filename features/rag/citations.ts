// Citations are written as [1], or [1, 2] for several sources. Anything
// followed by "(" is a Markdown link, and "[ ]" or "[x]" are task lists, so
// neither is matched.
export const CITATION = /\[(\d{1,2}(?:\s*,\s*\d{1,2})*)\](?!\()/g

export function numbersIn(group: string) {
  return group.split(",").map((value) => Number(value.trim()))
}

// Every source number cited in the text, in order of first use.
export function citedNumbers(text: string) {
  const seen = new Set<number>()
  for (const match of text.matchAll(CITATION)) {
    for (const n of numbersIn(match[1])) seen.add(n)
  }
  return [...seen]
}

// Which citations point at a real source, and which do not.
export function checkCitations(text: string, sourceCount: number) {
  const cited = citedNumbers(text)
  return {
    cited,
    invalid: cited.filter((n) => n < 1 || n > sourceCount),
  }
}

// The source number of a link made by linkCitations, if it is one.
export function citationFromHref(href: string | undefined) {
  const match = href?.match(/^#source-(\d+)$/)
  return match ? Number(match[1]) : undefined
}

// Removes citations from an earlier answer. Each reply gets its own numbered
// sources, so "[2]" in an old message would point at the wrong chunk.
export function stripCitations(text: string) {
  return text.replace(/[ \t]*\[\d{1,2}(?:\s*,\s*\d{1,2})*\](?!\()/g, "")
}
