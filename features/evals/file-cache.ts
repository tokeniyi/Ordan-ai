import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { type EvalCache } from "@/features/evals/cache"

// One JSON file per entry, in a folder that git ignores.
export function fileCache(dir: string): EvalCache {
  return {
    async get<T>(key: string) {
      try {
        const text = await readFile(path.join(dir, `${key}.json`), "utf8")
        return JSON.parse(text) as T
      } catch {
        return undefined
      }
    },
    async set(key, value) {
      await mkdir(dir, { recursive: true })
      await writeFile(path.join(dir, `${key}.json`), JSON.stringify(value))
    },
  }
}
