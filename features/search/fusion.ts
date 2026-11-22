// Reciprocal rank fusion: merges several rankings of the same items into
// one. Each item scores 1 / (k + rank) in every list it appears in, and the
// scores add up. It uses ranks, not scores, so lists scored on different
// scales (cosine similarity, BM25) can be merged without tuning weights. k
// keeps one list's top item from outweighing items that rank well in all of
// them; 60 is the value from the original paper.
export const RRF_K = 60

export function reciprocalRankFusion(
  rankings: number[][],
  k = RRF_K
): { index: number; score: number }[] {
  const scores = new Map<number, number>()
  for (const ranking of rankings) {
    ranking.forEach((index, position) => {
      scores.set(index, (scores.get(index) ?? 0) + 1 / (k + position + 1))
    })
  }
  return [...scores.entries()]
    .map(([index, score]) => ({ index, score }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
}
