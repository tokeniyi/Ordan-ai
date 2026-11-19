"use client"

import { type ChatStatus } from "ai"

import { type ChatUIMessage } from "@/features/chat/types"
import { ChatMessage } from "@/features/chat/components/chat-message"
import { StatusIcon } from "@/features/chat/components/status-icon"
import { Message, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { Trace, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace"
import { cn } from "@/lib/utils"

// The scrolling list of messages. Used by the chat and by the compare page.
export function ChatThread({
  messages,
  status,
  onRetry,
  className,
}: {
  messages: ChatUIMessage[]
  status: ChatStatus
  onRetry?: (messageId: string) => void
  className?: string
}) {
  const isBusy = status === "submitted" || status === "streaming"
  const lastMessage = messages.at(-1)

  return (
    <MessageScrollerProvider>
      <MessageScroller className="flex-1">
        <MessageScrollerViewport>
          <MessageScrollerContent
            className={cn(
              "mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-6",
              className
            )}
          >
            {messages.map((message) => (
              <MessageScrollerItem
                key={message.id}
                messageId={message.id}
                scrollAnchor={message.role === "user"}
              >
                <ChatMessage
                  message={message}
                  isStreaming={isBusy && message.id === lastMessage?.id}
                  onRetry={
                    onRetry && !isBusy && message.id === lastMessage?.id
                      ? () => onRetry(message.id)
                      : undefined
                  }
                />
              </MessageScrollerItem>
            ))}
            {status === "submitted" && (
              <MessageScrollerItem messageId="thinking">
                <Message>
                  <MessageContent>
                    <Trace>
                      <TraceLine status="running">
                        <TraceIcon>
                          <StatusIcon status="running" />
                        </TraceIcon>
                        <TraceTitle>Thinking</TraceTitle>
                      </TraceLine>
                    </Trace>
                  </MessageContent>
                </Message>
              </MessageScrollerItem>
            )}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}
