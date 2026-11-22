import { type RetrievalSettings } from "@/features/rag/pipeline"
import { type ChunkStrategy } from "@/features/search/types"

// The best setup measured in phase 4: recursive chunks with the page title
// and heading, searched by meaning.
export const RAG_STRATEGY: ChunkStrategy = "recursive-headings"

// Chunks put in the prompt. Phase 4 found the answer in the top 3 for 21 of
// 24 questions and in the top 5 for 23, and four chunks cost about 300
// tokens.
export const RAG_K = 4

// Chunks below this similarity are dropped. It only removes clear noise:
// questions the corpus cannot answer scored 0.28 to 0.52 on their best chunk,
// as high as many it can, so a threshold cannot decide "not covered". The
// prompt asks the model to decide instead.
export const RAG_MIN_SCORE = 0.2

// How the chat turns a message into sources, chosen in phase 6 from
// `pnpm eval:pipelines`: planning fixed every follow-up and skipped every
// message that needed no search, and reranking moved the most passages into
// the top 4. Hybrid search lowered MRR alone and in every combination, and
// HyDE added a second model call for less than one question's gain. See
// docs/phases/phase-06-advanced-rag.md.
export const RAG_SETTINGS: RetrievalSettings = {
  plan: true,
  expand: "none",
  method: "semantic",
  rerank: true,
  candidates: 20,
  k: RAG_K,
}
