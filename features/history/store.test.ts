import { describe, expect, it } from "vitest"

import { type ChatUIMessage } from "@/features/chat/types"
import { memoryStorage } from "@/features/history/memory-storage"
import {
  chatKey,
  deleteChat,
  getChat,
  INDEX_KEY,
  listChats,
  saveChat,
  titleFrom,
  type SavedChat,
} from "@/features/history/store"

const message = (id: string, role: "user" | "assistant", text: string) =>
  ({ id, role, parts: [{ type: "text", text }] }) as ChatUIMessage

function chat(id: string, updatedAt: string, text = "Hello"): SavedChat {
  return {
    id,
    title: text,
    createdAt: updatedAt,
    updatedAt,
    model: "kilo-auto/free",
    promptId: "structured",
    strategy: "summary",
    messages: [message(`${id}-1`, "user", text)],
  }
}

describe("titleFrom", () => {
  it("uses the first user message on one line", () => {
    expect(
      titleFrom([
        message("1", "user", "  What is\n\nRAG?  "),
        message("2", "assistant", "Retrieval."),
      ])
    ).toBe("What is RAG?")
  })

  it("cuts long titles", () => {
    const title = titleFrom([message("1", "user", "word ".repeat(40))])
    expect(title.length).toBeLessThanOrEqual(60)
    expect(title.endsWith("…")).toBe(true)
  })

  it("falls back when there is no user text", () => {
    expect(titleFrom([])).toBe("New chat")
  })
})

describe("chat store", () => {
  it("saves, lists newest first and loads chats", () => {
    const storage = memoryStorage()
    saveChat(storage, chat("a", "2026-01-01T00:00:00.000Z", "First"))
    saveChat(storage, chat("b", "2026-01-02T00:00:00.000Z", "Second"))

    expect(listChats(storage).map((item) => item.title)).toEqual([
      "Second",
      "First",
    ])
    expect(getChat(storage, "a")?.messages[0].parts).toEqual([
      { type: "text", text: "First" },
    ])
  })

  it("updates a chat in place and moves it to the top", () => {
    const storage = memoryStorage()
    saveChat(storage, chat("a", "2026-01-01T00:00:00.000Z", "First"))
    saveChat(storage, chat("b", "2026-01-02T00:00:00.000Z", "Second"))
    saveChat(storage, chat("a", "2026-01-03T00:00:00.000Z", "First again"))

    expect(listChats(storage).map((item) => item.id)).toEqual(["a", "b"])
    expect(getChat(storage, "a")?.title).toBe("First again")
  })

  it("deletes a chat and its entry in the list", () => {
    const storage = memoryStorage()
    saveChat(storage, chat("a", "2026-01-01T00:00:00.000Z"))
    deleteChat(storage, "a")

    expect(listChats(storage)).toEqual([])
    expect(getChat(storage, "a")).toBeUndefined()
    expect(storage.data.has(chatKey("a"))).toBe(false)
  })

  it("returns nothing for corrupt data instead of throwing", () => {
    const storage = memoryStorage()
    storage.setItem(INDEX_KEY, "{not json")
    storage.setItem(chatKey("a"), JSON.stringify({ id: "a" }))

    expect(listChats(storage)).toEqual([])
    expect(getChat(storage, "a")).toBeUndefined()
  })

  it("reports a failed write", () => {
    const storage = memoryStorage()
    storage.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError")
    }
    expect(saveChat(storage, chat("a", "2026-01-01T00:00:00.000Z"))).toBe(false)
  })
})
