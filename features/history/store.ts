import { type ChatUIMessage } from "@/features/chat/types"
import { messageText } from "@/features/history/tokens"
import { type HistoryStrategy } from "@/features/history/types"

// Saved chats live in the browser's localStorage: an index of every chat,
// and one entry per chat with its messages. Nothing is sent to a server, so
// chats stay on this device. The functions take the storage as an argument,
// so tests pass an in-memory one.

export interface SavedChat {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  model: string
  promptId: string
  strategy: HistoryStrategy
  messages: ChatUIMessage[]
}

export type ChatListItem = Pick<SavedChat, "id" | "title" | "updatedAt">

export type KeyValueStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>

export const INDEX_KEY = "ordan:chats"
export const chatKey = (id: string) => `ordan:chat:${id}`

const TITLE_LENGTH = 60

// The first user message, on one line and cut to length. Free and instant,
// unlike asking a model for a title.
export function titleFrom(messages: ChatUIMessage[]) {
  const first = messages.find((message) => message.role === "user")
  const text = (first ? messageText(first) : "").replace(/\s+/g, " ").trim()
  if (!text) return "New chat"
  return text.length > TITLE_LENGTH
    ? `${text.slice(0, TITLE_LENGTH - 1).trimEnd()}…`
    : text
}

function readJson<T>(storage: KeyValueStorage, key: string): T | undefined {
  try {
    const value = storage.getItem(key)
    return value ? (JSON.parse(value) as T) : undefined
  } catch {
    return undefined
  }
}

// Newest first.
export function listChats(storage: KeyValueStorage): ChatListItem[] {
  const index = readJson<ChatListItem[]>(storage, INDEX_KEY)
  if (!Array.isArray(index)) return []
  return index
    .filter((item) => typeof item?.id === "string")
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getChat(storage: KeyValueStorage, id: string) {
  const chat = readJson<SavedChat>(storage, chatKey(id))
  return chat && Array.isArray(chat.messages) ? chat : undefined
}

// Returns false when the browser refuses the write, usually because its
// storage quota is full.
export function saveChat(storage: KeyValueStorage, chat: SavedChat) {
  try {
    storage.setItem(chatKey(chat.id), JSON.stringify(chat))
    const others = listChats(storage).filter((item) => item.id !== chat.id)
    const item: ChatListItem = {
      id: chat.id,
      title: chat.title,
      updatedAt: chat.updatedAt,
    }
    storage.setItem(INDEX_KEY, JSON.stringify([item, ...others]))
    return true
  } catch {
    return false
  }
}

export function deleteChat(storage: KeyValueStorage, id: string) {
  try {
    storage.removeItem(chatKey(id))
    storage.setItem(
      INDEX_KEY,
      JSON.stringify(listChats(storage).filter((item) => item.id !== id))
    )
  } catch {
    // Nothing to do: the chat stays in the list.
  }
}
