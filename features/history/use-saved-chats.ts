"use client"

import * as React from "react"

import {
  deleteChat,
  getChat,
  listChats,
  saveChat,
  type ChatListItem,
  type SavedChat,
} from "@/features/history/store"

// One shared, cached copy of the chat list, so every component that shows it
// re-renders together when a chat is saved, here or in another tab.
const listeners = new Set<() => void>()
let cachedList: ChatListItem[] | undefined
const EMPTY: ChatListItem[] = []

function storage() {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

function notify() {
  cachedList = undefined
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith("ordan:")) notify()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

function getSnapshot() {
  const store = storage()
  if (!store) return EMPTY
  cachedList ??= listChats(store)
  return cachedList
}

export function useChatList() {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)
}

export const chatStore = {
  get(id: string): SavedChat | undefined {
    const store = storage()
    return store ? getChat(store, id) : undefined
  },
  save(chat: SavedChat) {
    const store = storage()
    const saved = store ? saveChat(store, chat) : false
    notify()
    return saved
  },
  delete(id: string) {
    const store = storage()
    if (store) deleteChat(store, id)
    notify()
  },
}

// Loads one saved chat after the page has mounted, because localStorage does
// not exist on the server. `undefined` while loading, `null` if not found.
export function useSavedChat(id: string) {
  const [chat, setChat] = React.useState<SavedChat | null>()

  React.useEffect(() => {
    // Reading storage is the external system this effect syncs with.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChat(chatStore.get(id) ?? null)
  }, [id])

  return chat
}
