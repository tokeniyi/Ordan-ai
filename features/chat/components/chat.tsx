"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"

import { type ChatModel } from "@/lib/ai/models"
import { type ChatUIMessage } from "@/features/chat/types"
import { ChatThread } from "@/features/chat/components/chat-thread"
import { OptionSelect } from "@/features/chat/components/option-select"
import { PromptForm } from "@/features/chat/components/prompt-form"
import { Suggestions } from "@/features/chat/components/suggestions"
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
  models,
  prompts,
}: {
  models: ChatModel[]
  prompts: PromptOption[]
}) {
  const [model, setModel] = React.useState(models[0]?.id ?? "")
  const [promptId, setPromptId] = React.useState(prompts[0]?.id ?? "")

  const { messages, sendMessage, regenerate, status, stop, error } =
    useChat<ChatUIMessage>()

  const followUps = useFollowUps(messages, status)

  const isBusy = status === "submitted" || status === "streaming"
  const body = { model, promptId }

  function send(text: string) {
    sendMessage({ text }, { body })
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
          onRetry={(messageId) => regenerate({ messageId, body })}
        />
      )}

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-6 pb-6">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Request failed</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
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
            </>
          }
          isBusy={isBusy}
          onSubmit={send}
          onStop={() => stop()}
        />
      </div>
    </div>
  )
}
