// Cosine similarity: how closely two vectors point the same way, from -1 to
// 1. For text embeddings, closer to 1 means closer in meaning.
export function cosine(a: number[], b: number[]) {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0
}

// Rounds each value, so an index file stays small. Four decimals change
// cosine scores by less than 0.001.
export function compact(vector: number[], digits = 4) {
  const factor = 10 ** digits
  return vector.map((value) => Math.round(value * factor) / factor)
}

// The `k` highest scores, best first, as indexes into `scores`.
export function topK(scores: number[], k: number) {
  return scores
    .map((score, index) => ({ score, index }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}
