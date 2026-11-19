import { createHash } from "node:crypto"

// Stores model results by a hash of everything that affects them. A re-run
// only calls the model for prompts or cases that changed, and a run that was
// cut short resumes where it stopped.
export interface EvalCache {
  get<T>(key: string): Promise<T | undefined>
  set(key: string, value: unknown): Promise<void>
}

export function cacheKey(parts: unknown) {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex")
}

export function memoryCache(): EvalCache {
  const store = new Map<string, unknown>()
  return {
    async get<T>(key: string) {
      return store.get(key) as T | undefined
    },
    async set(key, value) {
      store.set(key, value)
    },
  }
}
