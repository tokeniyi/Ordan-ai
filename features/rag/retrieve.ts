import { RAG_K, RAG_MIN_SCORE } from "@/features/rag/config"
import { type RagSource } from "@/features/rag/types"
import { search, type EmbedQuery } from "@/features/search/search"
import { type SearchIndex } from "@/features/search/types"

// Finds the chunks to answer from, numbered from 1 in rank order.
export async function retrieve({
  index,
  query,
  embedQuery,
  k = RAG_K,
  minScore = RAG_MIN_SCORE,
}: {
  index: SearchIndex
  query: string
  embedQuery: EmbedQuery
  k?: number
  minScore?: number
}): Promise<RagSource[]> {
  if (!query.trim()) return []

  const hits = await search({
    index,
    query,
    method: "semantic",
    k,
    embedQuery,
  })

  return hits
    .filter((hit) => hit.score >= minScore)
    .map((hit, position) => ({
      n: position + 1,
      chunkId: hit.chunk.id,
      docId: hit.chunk.docId,
      docTitle: hit.chunk.docTitle,
      ...(hit.chunk.heading && { heading: hit.chunk.heading }),
      text: hit.chunk.text,
      score: hit.score,
    }))
}

// The question to search with: the newest user message. Follow-ups such as
// "how much is it?" lose the topic of earlier turns. Rewriting the query
// from the conversation is part of phase 6.
export function retrievalQuery(
  messages: {
    role: string
    parts: { type: string; text?: string }[]
  }[]
) {
  const last = messages.findLast((message) => message.role === "user")
  return (
    last?.parts
      .flatMap((part) => (part.type === "text" && part.text ? part.text : []))
      .join("\n")
      .trim() ?? ""
  )
}
