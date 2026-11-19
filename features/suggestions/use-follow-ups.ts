"use client"

import * as React from "react"
import { type ChatStatus, type UIMessage } from "ai"

function textOf(message: UIMessage | undefined) {
  return (
    message?.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n\n") ?? ""
  )
}

// Fetches follow-up questions once a reply has finished. Returns them only
// while they still belong to the last message.
export function useFollowUps(messages: UIMessage[], status: ChatStatus) {
  const [result, setResult] = React.useState<{
    messageId: string
    questions: string[]
  }>()

  const last = messages.at(-1)
  const isDone = status === "ready" && last?.role === "assistant"
  const messageId = isDone ? last.id : undefined
  const answer = isDone ? textOf(last) : ""
  const question = isDone
    ? textOf(messages.findLast((message) => message.role === "user"))
    : ""

  React.useEffect(() => {
    if (!messageId || !question || !answer) {
      return
    }

    const controller = new AbortController()

    fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer }),
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : undefined))
      .then((data: { questions?: string[] } | undefined) => {
        if (data?.questions?.length) {
          setResult({ messageId, questions: data.questions })
        }
      })
      // Follow-ups are optional, so a failure just shows nothing.
      .catch(() => {})

    return () => controller.abort()
  }, [messageId, question, answer])

  return result && result.messageId === messageId ? result.questions : []
}
