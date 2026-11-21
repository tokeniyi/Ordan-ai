import { headingAt, pack, toChunks } from "@/features/search/chunk/build"
import {
  paragraphs,
  sections,
  sentences,
  words,
  type Span,
} from "@/features/search/chunk/units"
import {
  type Chunk,
  type ChunkStrategy,
  type CountTokens,
  type SearchDocument,
} from "@/features/search/types"

export interface ChunkOptions {
  // Most tokens in a chunk. The embedding model reads at most 256 tokens,
  // and anything after that is cut off, so chunks stay well below it.
  size: number
  count: CountTokens
}

// Words repeated at the start of the next fixed-size chunk: about an eighth
// of a 128-token chunk.
export const FIXED_OVERLAP_WORDS = 12

// Fixed size: windows of words, with the end of each window repeated at the
// start of the next, so a sentence cut at a boundary is more often whole in
// one of the two. Ignores the document's structure.
export function fixedChunks(
  doc: SearchDocument,
  { size, count }: ChunkOptions
): Chunk[] {
  return toChunks(
    doc,
    pack(words(doc.text), {
      size,
      overlap: FIXED_OVERLAP_WORDS,
      count,
    }).map((spans) => ({
      spans,
      heading: headingAt(doc.text, spans[0].start),
    })),
    { count }
  )
}

// Sentence packing: whole sentences up to the size, with one sentence of
// overlap. Never cuts a sentence, but ignores headings.
export function sentenceChunks(
  doc: SearchDocument,
  { size, count }: ChunkOptions
): Chunk[] {
  const units = splitLarge(sentences(doc.text), size, count)
  return toChunks(
    doc,
    pack(units, { size, overlap: 1, count }).map((spans) => ({
      spans,
      heading: headingAt(doc.text, spans[0].start),
    })),
    { count }
  )
}

// Recursive: split by section, then paragraph, then sentence, then word, and
// only go a level deeper when a piece is still too large. Chunks never cross
// a heading, so each one is about one topic.
export function recursiveChunks(
  doc: SearchDocument,
  { size, count }: ChunkOptions,
  { context = false }: { context?: boolean } = {}
): Chunk[] {
  const groups = sections(doc.text).flatMap((section) => {
    const units = splitLarge(
      paragraphs(section.text, section.start),
      size,
      count,
      [sentences, words]
    )
    return pack(units, { size, count }).map((spans) => ({
      spans,
      heading: section.heading,
    }))
  })
  return toChunks(doc, groups, { count, context })
}

// Breaks spans that are over the size into smaller units, trying each
// splitter in turn.
function splitLarge(
  spans: Span[],
  size: number,
  count: CountTokens,
  splitters: ((text: string, offset: number) => Span[])[] = [words]
): Span[] {
  return spans.flatMap((span) => {
    if (count(span.text) <= size || splitters.length === 0) return [span]
    const [next, ...rest] = splitters
    return splitLarge(next(span.text, span.start), size, count, rest)
  })
}

export const CHUNK_SIZE = 128

export function chunkDocument(
  doc: SearchDocument,
  strategy: ChunkStrategy,
  options: ChunkOptions
): Chunk[] {
  switch (strategy) {
    case "fixed":
      return fixedChunks(doc, options)
    case "sentence":
      return sentenceChunks(doc, options)
    case "recursive":
      return recursiveChunks(doc, options)
    case "recursive-headings":
      return recursiveChunks(doc, options, { context: true })
  }
}
