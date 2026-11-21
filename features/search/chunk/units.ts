// Splits text into pieces with their character offsets, so every chunk can
// point back to where it came from in the document.

export interface Span {
  text: string
  start: number
  end: number
}

function spans(text: string, pattern: RegExp, offset = 0): Span[] {
  const result: Span[] = []
  for (const match of text.matchAll(pattern)) {
    const value = match[0]
    const trimmed = value.trim()
    if (!trimmed) continue
    const start = offset + match.index + value.indexOf(trimmed)
    result.push({ text: trimmed, start, end: start + trimmed.length })
  }
  return result
}

export function words(text: string, offset = 0) {
  return spans(text, /\S+/g, offset)
}

// Blocks separated by blank lines: paragraphs, tables, lists, headings.
export function paragraphs(text: string, offset = 0) {
  return spans(text, /[\s\S]+?(?:\n\s*\n|$)/g, offset)
}

// Sentences end with . ! or ? before a space or the end. A line break also
// ends one, so headings, table rows and list items stay separate.
export function sentences(text: string, offset = 0) {
  return spans(text, /[^\n]+?(?:[.!?](?=\s|$)|(?=\n)|$)/g, offset)
}

// Splits a Markdown document at its headings. Each section keeps the heading
// it is under. Text before the first `##` belongs to no heading.
export function sections(text: string) {
  const result: (Span & { heading?: string })[] = []
  const pattern = /^#{2,6}\s+(.+)$/gm
  let heading: string | undefined
  let start = 0
  for (const match of text.matchAll(pattern)) {
    if (match.index > start) {
      result.push({
        text: text.slice(start, match.index),
        start,
        end: match.index,
        heading,
      })
    }
    heading = match[1].trim()
    start = match.index
  }
  result.push({ text: text.slice(start), start, end: text.length, heading })
  return result
    .map((section) => {
      const trimmed = section.text.trim()
      const start = section.start + section.text.indexOf(trimmed)
      return { ...section, text: trimmed, start, end: start + trimmed.length }
    })
    .filter((section) => section.text)
}
