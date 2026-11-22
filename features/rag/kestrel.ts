import { embedTexts, rerankScores } from "@/lib/ai/provider"
import { RAG_SETTINGS, RAG_STRATEGY } from "@/features/rag/config"
import {
  runRetrieval,
  type RetrievalResult,
  type RetrievalSettings,
} from "@/features/rag/pipeline"
import { type Complete, type Turn } from "@/features/rag/query"
import { loadIndex } from "@/features/search/index-files"

// Retrieves from the committed Kestrel index with the local embedding and
// reranking models. The chat route and the eval runner both use it, so they
// search the same way. `complete` is the model call for planning and
// expanding the query.
export async function retrieveKestrel({
  turns,
  complete,
  settings = RAG_SETTINGS,
}: {
  turns: Turn[]
  complete: Complete
  settings?: RetrievalSettings
}): Promise<RetrievalResult & { ms: number }> {
  const started = Date.now()
  const result = await runRetrieval({
    index: await loadIndex(RAG_STRATEGY),
    turns,
    settings,
    calls: {
      embed: async (text) => (await embedTexts([text]))[0],
      complete,
      scorePairs: rerankScores,
    },
  })
  return { ...result, ms: Date.now() - started }
}
