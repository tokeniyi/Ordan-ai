"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { generateId } from "ai"

import { Chat } from "@/features/chat/components/chat"

type ChatProps = Omit<React.ComponentProps<typeof Chat>, "id" | "initialChat">

// A new, empty chat with a fresh id. Once the first message is sent, the
// address becomes /chat/<id>. Going back to / starts another new chat.
export function NewChat(props: ChatProps) {
  const pathname = usePathname()
  const [id, setId] = React.useState(() => generateId())
  const [previousPath, setPreviousPath] = React.useState(pathname)

  if (pathname !== previousPath) {
    setPreviousPath(pathname)
    if (pathname === "/") setId(generateId())
  }

  return <Chat key={id} id={id} {...props} />
}
