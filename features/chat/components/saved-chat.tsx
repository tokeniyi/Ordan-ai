"use client"

import Link from "next/link"

import { Chat } from "@/features/chat/components/chat"
import { useSavedChat } from "@/features/history/use-saved-chats"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"

type ChatProps = Omit<React.ComponentProps<typeof Chat>, "id" | "initialChat">

// A chat loaded from this browser's storage.
export function SavedChat({ id, ...props }: ChatProps & { id: string }) {
  const chat = useSavedChat(id)

  if (chat === undefined) {
    return <div className="flex-1" aria-busy="true" />
  }

  if (chat === null) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Chat not found</EmptyTitle>
            <EmptyDescription>
              Chats are saved in the browser they were written in. This one is
              not in this browser, or it was deleted.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link href="/" />} nativeButton={false}>
              Start a new chat
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  return <Chat key={id} id={id} initialChat={chat} {...props} />
}
