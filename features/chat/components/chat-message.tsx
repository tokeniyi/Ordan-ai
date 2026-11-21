"use client"

import {
  type ChatMessagePart,
  type ChatUIMessage,
  type ReasoningMessagePart,
  type TextMessagePart,
} from "@/features/chat/types"
import { MessageActions } from "@/features/chat/components/message-actions"
import { ReasoningPart } from "@/features/chat/components/parts/reasoning-part"
import { TextPart } from "@/features/chat/components/parts/text-part"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageContent } from "@/components/ui/message"
import { Trace } from "@/components/ui/trace"

// A step is anything the model does that is not the answer text. Each new
// part type (tool calls, sources, ...) gets a component in ./parts and a case
// in the switch below.
type StepPart = ReasoningMessagePart

export function ChatMessage({
  message,
  isStreaming = false,
  onRetry,
  onRestore,
}: {
  message: ChatUIMessage
  isStreaming?: boolean
  onRetry?: () => void
  onRestore?: () => void
}) {
  if (message.role === "user") {
    return (
      <Message align="end">
        <MessageContent>
          <Bubble align="end" variant="muted">
            <BubbleContent>
              {message.parts
                .filter((part) => part.type === "text")
                .map((part) => part.text)
                .join("")}
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    )
  }

  const blocks = groupParts(message.parts)
  const reasoningParts = message.parts.filter(
    (part) => part.type === "reasoning"
  )
  const text = blocks
    .flatMap((block) => (Array.isArray(block) ? [] : block.text))
    .join("\n\n")

  return (
    <Message align="start">
      <MessageContent>
        {blocks.map((block, index) =>
          Array.isArray(block) ? (
            <Trace key={index}>
              {block.map((part, partIndex) => {
                switch (part.type) {
                  case "reasoning":
                    return (
                      <ReasoningPart
                        key={partIndex}
                        part={part}
                        isStreaming={isStreaming}
                        duration={
                          message.metadata?.reasoningDurations?.[
                            reasoningParts.indexOf(part)
                          ]
                        }
                      />
                    )
                }
              })}
            </Trace>
          ) : (
            <TextPart key={index} part={block} />
          )
        )}
        {!isStreaming && text && (
          <MessageActions text={text} onRetry={onRetry} onRestore={onRestore} />
        )}
      </MessageContent>
    </Message>
  )
}

// Text splits the steps into runs, and each run of steps gets its own Trace.
function groupParts(parts: ChatMessagePart[]) {
  return parts.reduce<(TextMessagePart | StepPart[])[]>((blocks, part) => {
    if (part.type === "text") {
      if (part.text.trim()) {
        blocks.push(part)
      }
      return blocks
    }

    if (part.type !== "reasoning") {
      return blocks
    }

    const last = blocks.at(-1)
    if (Array.isArray(last)) {
      last.push(part)
    } else {
      blocks.push([part])
    }
    return blocks
  }, [])
}
