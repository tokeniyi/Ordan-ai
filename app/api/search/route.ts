import { embedTexts } from "@/lib/ai/provider"
import { loadIndex } from "@/features/search/index-files"
import { searchRequestSchema } from "@/features/search/request"
import { search } from "@/features/search/search"

export const maxDuration = 30

// Searches the Kestrel corpus. Embeddings run locally, so this costs no
// credits, but the first request loads the model, which takes a few seconds.
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = searchRequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Invalid search request." }, { status: 400 })
  }

  const { query, strategy, method, k } = parsed.data
  try {
    const started = Date.now()
    const hits = await search({
      index: await loadIndex(strategy),
      query,
      method,
      k,
      embedQuery: async (text) => (await embedTexts([text]))[0],
    })
    return Response.json({ hits, ms: Date.now() - started })
  } catch (error) {
    console.error(error)
    return Response.json({ error: "Search failed." }, { status: 500 })
  }
}
