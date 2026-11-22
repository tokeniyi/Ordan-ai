import { RAG_K, RAG_MIN_SCORE } from "@/features/rag/config"
import {
  hypotheticalPassage,
  planQuery,
  queryVariants,
  type Complete,
  type Turn,
} from "@/features/rag/query"
import { type RagSource, type RetrievalStep } from "@/features/rag/types"
import { reciprocalRankFusion } from "@/features/search/fusion"
import { rerank, type ScorePairs } from "@/features/search/rerank"
import { search, type EmbedQuery } from "@/features/search/search"
import { type SearchHit, type SearchIndex } from "@/features/search/types"

// How a question is turned into sources. Each setting is one technique, so
// the eval can measure them one at a time and together.
export interface RetrievalSettings {
  // Ask a model whether to search and what to search with.
  plan: boolean
  // Search with other texts besides the query: a made-up answer (HyDE) or
  // rewordings of the question (multi-query).
  expand: "none" | "hyde" | "multi"
  method: "semantic" | "hybrid"
  // Reorder the candidates with a cross-encoder.
  rerank: boolean
  // Merge the reranker's order with the search's order by rank, instead of
  // replacing it, so one model's mistake cannot push out a passage the other
  // ranked well.
  fuseRerank?: boolean
  // Candidates found before reranking and fusing.
  candidates: number
  // Sources given to the model.
  k: number
}

// Phase 5's retrieval: the newest message, searched by meaning.
export const BASIC_SETTINGS: RetrievalSettings = {
  plan: false,
  expand: "none",
  method: "semantic",
  rerank: false,
  candidates: 20,
  k: RAG_K,
}

export interface RetrievalCalls {
  embed: EmbedQuery
  // Needed when planning or expanding.
  complete?: Complete
  // Needed when reranking.
  scorePairs?: ScorePairs
}

export interface RetrievalResult {
  // False when the planner decided the message needs no search.
  searched: boolean
  query: string
  // Every candidate, best first. The eval reads ranks beyond k from it.
  ranked: SearchHit[]
  sources: RagSource[]
  steps: RetrievalStep[]
}

export async function runRetrieval({
  index,
  turns,
  settings,
  calls,
}: {
  index: SearchIndex
  // The conversation, oldest first. The last turn is the newest message.
  turns: Turn[]
  settings: RetrievalSettings
  calls: RetrievalCalls
}): Promise<RetrievalResult> {
  const steps: RetrievalStep[] = []
  const timed = async <T>(work: () => Promise<T>) => {
    const started = Date.now()
    const value = await work()
    return { value, ms: Date.now() - started }
  }

  let query = turns.at(-1)?.text.trim() ?? ""
  if (!query) return { searched: false, query, ranked: [], sources: [], steps }

  if (settings.plan) {
    const { value: plan, ms } = await timed(() =>
      planQuery({ turns, complete: need(calls.complete, "complete") })
    )
    steps.push({ type: "plan", search: plan.search, query: plan.query, ms })
    if (!plan.search) {
      return { searched: false, query, ranked: [], sources: [], steps }
    }
    query = plan.query
  }

  // The texts to search with. The query always comes first.
  let texts = [query]
  if (settings.expand !== "none") {
    const complete = need(calls.complete, "complete")
    const { value, ms } = await timed(async () =>
      settings.expand === "hyde"
        ? [await hypotheticalPassage({ query, complete })]
        : await queryVariants({ query, complete })
    )
    steps.push({ type: "expand", kind: settings.expand, texts: value, ms })
    // HyDE searches with the made-up passage alone, as in the paper.
    // Multi-query keeps the question and adds its rewordings.
    texts = settings.expand === "hyde" ? value : [query, ...value]
  }

  const { value: lists, ms: searchMs } = await timed(() =>
    Promise.all(
      texts.map((text) =>
        search({
          index,
          query: text,
          method: settings.method,
          k: settings.candidates,
          embedQuery: calls.embed,
        })
      )
    )
  )
  let ranked = lists.length === 1 ? lists[0] : fuse(lists, settings.candidates)
  steps.push({
    type: "search",
    method: settings.method,
    searches: texts.length,
    candidates: ranked.length,
    ms: searchMs,
  })

  if (settings.rerank) {
    const { value, ms } = await timed(() =>
      rerank({
        query,
        hits: ranked,
        scorePairs: need(calls.scorePairs, "scorePairs"),
      })
    )
    ranked = settings.fuseRerank ? fuse([ranked, value], ranked.length) : value
    steps.push({ type: "rerank", candidates: ranked.length, ms })
  }

  // Only a plain semantic ranking scores in cosine similarity, which is what
  // the threshold was set for. Fused ranks and reranker scores are on other
  // scales.
  const plainCosine =
    settings.method === "semantic" &&
    settings.expand !== "multi" &&
    !settings.rerank
  const sources = ranked
    .slice(0, settings.k)
    .filter((hit) => !plainCosine || hit.score >= RAG_MIN_SCORE)
    .map((hit, position) => toSource(hit, position + 1))

  return { searched: true, query, ranked, sources, steps }
}

// Merges the lists from several searches by rank.
function fuse(lists: SearchHit[][], k: number): SearchHit[] {
  const hits = new Map<string, SearchHit>()
  const ids: string[] = []
  const position = (id: string) => {
    let i = ids.indexOf(id)
    if (i === -1) i = ids.push(id) - 1
    return i
  }
  const rankings = lists.map((list) =>
    list.map((hit) => {
      hits.set(hit.chunk.id, hit)
      return position(hit.chunk.id)
    })
  )
  return reciprocalRankFusion(rankings)
    .slice(0, k)
    .map(({ index, score }, rank) => ({
      ...hits.get(ids[index])!,
      rank: rank + 1,
      score: Math.round(score * 1000) / 1000,
    }))
}

function toSource(hit: SearchHit, n: number): RagSource {
  return {
    n,
    chunkId: hit.chunk.id,
    docId: hit.chunk.docId,
    docTitle: hit.chunk.docTitle,
    ...(hit.chunk.heading && { heading: hit.chunk.heading }),
    text: hit.chunk.text,
    score: hit.score,
  }
}

function need<T>(value: T | undefined, name: string): T {
  if (!value) throw new Error(`These retrieval settings need ${name}.`)
  return value
}
