import { type Chunk } from "@/features/search/types"

// Common words that say nothing about the topic. Kept short on purpose: BM25
// already gives frequent words little weight.
const STOP_WORDS = new Set(
  "a an and are as at be by can do does for from has have how i if in is it its my of on or the to was what when where which who will with you your".split(
    " "
  )
)

export function terms(text: string) {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(
    (term) => !STOP_WORDS.has(term)
  )
}

// BM25, the classic keyword ranking. A chunk scores higher when it contains
// the query's rarer words, several times, and is short. k1 limits how much
// repeating a word helps, and b how much length counts.
export function createKeywordIndex(
  chunks: Pick<Chunk, "embedText">[],
  { k1 = 1.2, b = 0.75 } = {}
) {
  const docs = chunks.map((chunk) => {
    const counts = new Map<string, number>()
    const list = terms(chunk.embedText)
    for (const term of list) counts.set(term, (counts.get(term) ?? 0) + 1)
    return { counts, length: list.length }
  })
  const avgLength =
    docs.reduce((sum, doc) => sum + doc.length, 0) / Math.max(1, docs.length)

  const docFrequency = new Map<string, number>()
  for (const doc of docs) {
    for (const term of doc.counts.keys()) {
      docFrequency.set(term, (docFrequency.get(term) ?? 0) + 1)
    }
  }

  const idf = (term: string) => {
    const n = docFrequency.get(term) ?? 0
    return Math.log(1 + (docs.length - n + 0.5) / (n + 0.5))
  }

  return {
    // One score per chunk, in the order the chunks were given.
    score(query: string) {
      const queryTerms = [...new Set(terms(query))]
      return docs.map((doc) =>
        queryTerms.reduce((sum, term) => {
          const tf = doc.counts.get(term) ?? 0
          if (tf === 0) return sum
          const norm = k1 * (1 - b + (b * doc.length) / avgLength)
          return sum + idf(term) * ((tf * (k1 + 1)) / (tf + norm))
        }, 0)
      )
    },
  }
}
