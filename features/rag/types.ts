// The document collections the chat can answer from. "none" is a plain chat.
export const KNOWLEDGE_BASES = ["none", "kestrel"] as const

export type KnowledgeBase = (typeof KNOWLEDGE_BASES)[number]

// A retrieved chunk, numbered the way the model cites it: [1], [2] ...
export interface RagSource {
  n: number
  chunkId: string
  docId: string
  docTitle: string
  heading?: string
  text: string
  // Cosine similarity with the question.
  score: number
}

// What the server retrieved for a reply. Sent to the browser as message
// metadata, so the sources and their text stay with the saved chat.
export interface RagInfo {
  knowledge: KnowledgeBase
  query: string
  sources: RagSource[]
  // Milliseconds spent embedding the question and searching.
  ms: number
}
