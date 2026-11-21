import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

import { type SearchDocument } from "@/features/search/types"

export const CORPUS_DIR = "data/corpus/kestrel"

// The title is the first `# ` heading, or the file name.
export function parseDocument(id: string, text: string): SearchDocument {
  const title = /^#\s+(.+)$/m.exec(text)?.[1].trim() ?? id
  return { id, title, text: text.trim() }
}

export async function loadCorpus(dir = CORPUS_DIR) {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".md")).sort()
  return Promise.all(
    files.map(async (file) =>
      parseDocument(
        file.replace(/\.md$/, ""),
        await readFile(path.join(dir, file), "utf8")
      )
    )
  )
}
