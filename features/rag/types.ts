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
  // The score from the ranking that picked it: cosine similarity for a plain
  // semantic search, the fused rank score for hybrid or multi-query search,
  // or the reranker's 0 to 1 score.
  score: number
}

// One step of turning a message into sources, shown in the chat so a reader
// can see what was searched and why.
export type RetrievalStep =
  | { type: "plan"; search: boolean; query: string; ms: number }
  | { type: "expand"; kind: "hyde" | "multi"; texts: string[]; ms: number }
  | {
      type: "search"
      method: "semantic" | "hybrid"
      searches: number
      candidates: number
      ms: number
    }
  | { type: "rerank"; candidates: number; ms: number }

// What the server retrieved for a reply. Sent to the browser as message
// metadata, so the sources and their text stay with the saved chat.
export interface RagInfo {
  knowledge: KnowledgeBase
  // What was searched for: the newest message, or the planner's rewrite.
  query: string
  // False when the planner decided the message needs no search. Saved chats
  // from phase 5 have no such field and were always searched.
  searched?: boolean
  sources: RagSource[]
  steps?: RetrievalStep[]
  // Milliseconds from the newest message to the sources, model calls
  // included.
  ms: number
}
