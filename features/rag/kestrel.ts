import { embedTexts } from "@/lib/ai/provider"
import { RAG_K, RAG_STRATEGY } from "@/features/rag/config"
import { retrieve } from "@/features/rag/retrieve"
import { type RagSource } from "@/features/rag/types"
import { loadIndex } from "@/features/search/index-files"

// Retrieves from the committed Kestrel index with the local embedding model.
// The chat route and the eval runner both use it, so they search the same
// way.
export async function retrieveKestrel(
  query: string,
  k = RAG_K
): Promise<{ sources: RagSource[]; ms: number }> {
  const started = Date.now()
  const sources = await retrieve({
    index: await loadIndex(RAG_STRATEGY),
    query,
    k,
    embedQuery: async (text) => (await embedTexts([text]))[0],
  })
  return { sources, ms: Date.now() - started }
}
