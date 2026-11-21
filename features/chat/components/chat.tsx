"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"

import { type ChatModel } from "@/lib/ai/models"
import { type ChatUIMessage } from "@/features/chat/types"
import { ChatThread } from "@/features/chat/components/chat-thread"
import { OptionSelect } from "@/features/chat/components/option-select"
import { PromptForm } from "@/features/chat/components/prompt-form"
import { Suggestions } from "@/features/chat/components/suggestions"
import { ContextUsage } from "@/features/history/components/context-usage"
import { STRATEGY_OPTIONS } from "@/features/history/options"
import { latestContext, summaryToSend } from "@/features/history/request"
import { titleFrom, type SavedChat } from "@/features/history/store"
import { type HistoryStrategy } from "@/features/history/types"
import { chatStore } from "@/features/history/use-saved-chats"
import { type PromptOption } from "@/features/prompts/types"
import { FollowUps } from "@/features/suggestions/follow-ups"
import { useFollowUps } from "@/features/suggestions/use-follow-ups"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"

export function Chat({
  id,
  initialChat,
  models,
  prompts,
}: {
  id: string
  // A saved chat to continue. Without one, this is a new chat.
  initialChat?: SavedChat
  models: ChatModel[]
  prompts: PromptOption[]
}) {
  const pick = <T extends { id: string }>(options: T[], value?: string) =>
    options.find((option) => option.id === value)?.id ?? options[0]?.id ?? ""

  const [model, setModel] = React.useState(() =>
    pick(models, initialChat?.model)
  )
  const [promptId, setPromptId] = React.useState(() =>
    pick(prompts, initialChat?.promptId)
  )
  const [strategy, setStrategy] = React.useState(
    () => pick(STRATEGY_OPTIONS, initialChat?.strategy) as HistoryStrategy
  )
  const [saveFailed, setSaveFailed] = React.useState(false)
  const createdAt = React.useRef(
    initialChat?.createdAt ?? new Date().toISOString()
  )

  const {
    messages,
    setMessages,
    sendMessage,
    regenerate,
    status,
    stop,
    error,
  } = useChat<ChatUIMessage>({ id, messages: initialChat?.messages })

  // Follow-ups are for replies written now, not for a chat that was opened.
  const [loadedLastId] = React.useState(initialChat?.messages.at(-1)?.id)
  const followUps = useFollowUps(messages, status, loadedLastId)

  const isBusy = status === "submitted" || status === "streaming"
  const context = latestContext(messages)
  const lastReply = messages.findLast((message) => message.metadata?.usage)

  // Save after every change, except while a reply streams in, which would
  // write on every token. The stream's end changes the status and saves.
  React.useEffect(() => {
    if (messages.length === 0 || status === "streaming") return
    const saved = chatStore.save({
      id,
      title: titleFrom(messages),
      createdAt: createdAt.current,
      updatedAt: new Date().toISOString(),
      model,
      promptId,
      strategy,
      messages,
    })
    // The flag mirrors whether the last write reached storage.
    setSaveFailed(!saved)
  }, [id, messages, status, model, promptId, strategy])

  function body(current: ChatUIMessage[] = messages) {
    return {
      model,
      promptId,
      history: { strategy, summary: summaryToSend(current, strategy) },
    }
  }

  function send(text: string) {
    // A new chat gets its own address once it has a message, without a
    // reload. Next.js keeps its router in step with replaceState.
    const path = `/chat/${id}`
    if (window.location.pathname !== path) {
      window.history.replaceState(null, "", path)
    }
    sendMessage({ text }, { body: body() })
  }

  function restore(messageId: string) {
    const index = messages.findIndex((message) => message.id === messageId)
    if (index !== -1) setMessages(messages.slice(0, index + 1))
  }

  return (
    <div className="mx-auto flex min-h-0 w-full flex-1 flex-col">
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>What can I help with?</EmptyTitle>
              <EmptyDescription>
                Pick a model and a prompt, then start chatting. Responses stream
                through the Kilo AI Gateway.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Suggestions onSelect={send} />
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <ChatThread
          messages={messages}
          status={status}
          context={context}
          onRetry={(messageId) => regenerate({ messageId, body: body() })}
          onRestore={restore}
        />
      )}

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-6 pb-6">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Request failed</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        {saveFailed && (
          <Alert>
            <AlertTitle>Chat not saved</AlertTitle>
            <AlertDescription>
              This browser&apos;s storage is full or turned off. The chat works,
              but it will be gone after a reload.
            </AlertDescription>
          </Alert>
        )}
        <FollowUps items={followUps} onSelect={send} />
        <PromptForm
          controls={
            <>
              <OptionSelect
                label="Model"
                options={models}
                value={model}
                onValueChange={setModel}
              />
              <OptionSelect
                label="Prompt"
                options={prompts}
                value={promptId}
                onValueChange={setPromptId}
              />
              <OptionSelect
                label="History"
                options={STRATEGY_OPTIONS}
                value={strategy}
                onValueChange={(value) => setStrategy(value as HistoryStrategy)}
              />
            </>
          }
          status={
            <ContextUsage
              context={context}
              usage={lastReply?.metadata?.usage}
            />
          }
          isBusy={isBusy}
          onSubmit={send}
          onStop={() => stop()}
        />
      </div>
    </div>
  )
}
