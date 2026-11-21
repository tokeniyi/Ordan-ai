import { type Span } from "@/features/search/chunk/units"
import {
  type Chunk,
  type CountTokens,
  type SearchDocument,
} from "@/features/search/types"

// Packs consecutive spans into chunks of at most `size` tokens. A span larger
// than `size` becomes a chunk of its own; callers split those first. The
// last `overlap` spans of a chunk start the next one.
export function pack(
  spans: Span[],
  {
    size,
    overlap = 0,
    count,
  }: { size: number; overlap?: number; count: CountTokens }
) {
  const groups: Span[][] = []
  let current: Span[] = []
  let tokens = 0

  for (const span of spans) {
    const spanTokens = count(span.text)
    if (current.length > 0 && tokens + spanTokens > size) {
      groups.push(current)
      const kept = overlap > 0 ? current.slice(-overlap) : []
      // Keep the overlap only if the next span still fits with it.
      const keptTokens = kept.reduce((sum, s) => sum + count(s.text), 0)
      current = keptTokens + spanTokens <= size ? kept : []
      tokens = current.reduce((sum, s) => sum + count(s.text), 0)
    }
    current.push(span)
    tokens += spanTokens
  }
  if (current.length > 0) groups.push(current)
  return groups
}

// Turns groups of spans into chunks, taking the text straight from the
// document so the offsets always match.
export function toChunks(
  doc: SearchDocument,
  groups: { spans: Span[]; heading?: string }[],
  { count, context = false }: { count: CountTokens; context?: boolean }
): Chunk[] {
  return groups.map(({ spans, heading }, index) => {
    const start = spans[0].start
    const end = spans.at(-1)!.end
    const text = doc.text.slice(start, end)
    const embedText = context
      ? `${doc.title}${heading ? ` > ${heading}` : ""}\n\n${text}`
      : text
    return {
      id: `${doc.id}#${index}`,
      docId: doc.id,
      docTitle: doc.title,
      index,
      ...(heading && { heading }),
      text,
      start,
      end,
      tokens: count(embedText),
      embedText,
    }
  })
}

// The heading in force at a character offset.
export function headingAt(text: string, offset: number) {
  let heading: string | undefined
  for (const match of text.matchAll(/^#{2,6}\s+(.+)$/gm)) {
    if (match.index > offset) break
    heading = match[1].trim()
  }
  return heading
}
