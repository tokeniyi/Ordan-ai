"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"

import { type ChatModel } from "@/lib/ai/models"
import { type ChatUIMessage } from "@/features/chat/types"
import { ChatThread } from "@/features/chat/components/chat-thread"
import { OptionSelect } from "@/features/chat/components/option-select"
import { PromptForm } from "@/features/chat/components/prompt-form"
import { type PromptOption } from "@/features/prompts/types"
import { Alert, AlertDescription } from "@/components/ui/alert"

function useSide(id: string, initialPromptId: string) {
  const [promptId, setPromptId] = React.useState(initialPromptId)
  const chat = useChat<ChatUIMessage>({ id })
  return { promptId, setPromptId, ...chat }
}

// Sends the same message to two prompts and shows the replies side by side.
export function Compare({
  models,
  prompts,
}: {
  models: ChatModel[]
  prompts: PromptOption[]
}) {
  const [model, setModel] = React.useState(models[0]?.id ?? "")
  const left = useSide("compare-left", prompts[0]?.id ?? "")
  const right = useSide("compare-right", prompts[1]?.id ?? prompts[0]?.id ?? "")
  const sides = [left, right]

  const isBusy = sides.some(
    (side) => side.status === "submitted" || side.status === "streaming"
  )

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-1 divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
        {sides.map((side, index) => (
          <section key={index} className="flex min-h-0 flex-col">
            <div className="flex items-center gap-2 px-6 py-2">
              <span className="text-sm text-muted-foreground">Prompt</span>
              <OptionSelect
                label={index === 0 ? "Left prompt" : "Right prompt"}
                options={prompts}
                value={side.promptId}
                onValueChange={side.setPromptId}
              />
            </div>
            {side.messages.length === 0 ? (
              <p className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
                Replies from this prompt show here.
              </p>
            ) : (
              <ChatThread messages={side.messages} status={side.status} />
            )}
            {side.error && (
              <Alert variant="destructive" className="mx-6 mb-2 w-auto">
                <AlertDescription>{side.error.message}</AlertDescription>
              </Alert>
            )}
          </section>
        ))}
      </div>

      <div className="mx-auto w-full max-w-2xl px-6 pt-2 pb-6">
        <PromptForm
          controls={
            <OptionSelect
              label="Model"
              options={models}
              value={model}
              onValueChange={setModel}
            />
          }
          isBusy={isBusy}
          onSubmit={(text) => {
            for (const side of sides) {
              side.sendMessage(
                { text },
                { body: { model, promptId: side.promptId } }
              )
            }
          }}
          onStop={() => sides.forEach((side) => side.stop())}
        />
      </div>
    </div>
  )
}
