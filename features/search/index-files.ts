import { readFile } from "node:fs/promises"
import path from "node:path"

import { type ChunkStrategy, type SearchIndex } from "@/features/search/types"

// Built by `pnpm index` and committed, so the app and CI never embed the
// corpus themselves.
export const INDEX_DIR = "data/index"

export function indexPath(strategy: ChunkStrategy, dir = INDEX_DIR) {
  return path.join(dir, `${strategy}.json`)
}

const loaded = new Map<string, Promise<SearchIndex>>()

export function loadIndex(strategy: ChunkStrategy, dir = INDEX_DIR) {
  const file = path.resolve(indexPath(strategy, dir))
  let index = loaded.get(file)
  if (!index) {
    index = readFile(file, "utf8").then((text) => JSON.parse(text))
    loaded.set(file, index)
  }
  return index
}
