// A document in the corpus, read from a Markdown file.
export interface SearchDocument {
  id: string
  title: string
  text: string
}

export const CHUNK_STRATEGIES = [
  "fixed",
  "sentence",
  "recursive",
  "recursive-headings",
] as const

export type ChunkStrategy = (typeof CHUNK_STRATEGIES)[number]

export interface Chunk {
  // `<docId>#<index>`
  id: string
  docId: string
  docTitle: string
  index: number
  // The section heading the chunk starts under, if any.
  heading?: string
  text: string
  // Character offsets of `text` in the document.
  start: number
  end: number
  // Tokens of `embedText`, counted with the embedding model's tokenizer.
  tokens: number
  // What is embedded. Usually `text`, but strategies can add context, such as
  // the document title and heading.
  embedText: string
}

export interface IndexedChunk extends Chunk {
  vector: number[]
}

export interface SearchIndex {
  strategy: ChunkStrategy
  model: string
  dimensions: number
  createdAt: string
  chunks: IndexedChunk[]
}

export const SEARCH_METHODS = ["semantic", "keyword"] as const

export type SearchMethod = (typeof SEARCH_METHODS)[number]

export interface SearchHit {
  rank: number
  score: number
  chunk: Chunk
}

// Counts tokens. The chunkers take it as an argument, so tests can pass a
// simple one and the index script passes the embedding model's tokenizer.
export type CountTokens = (text: string) => number
