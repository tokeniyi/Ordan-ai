import { type KeyValueStorage } from "@/features/history/store"

// An in-memory stand-in for localStorage, for tests.
export function memoryStorage(): KeyValueStorage & {
  data: Map<string, string>
} {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}
