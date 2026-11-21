"use client"

import * as React from "react"
import { ArrowUpIcon, SquareIcon } from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"

export function PromptForm({
  controls,
  status,
  isBusy,
  onSubmit,
  onStop,
}: {
  // Pickers shown next to the send button.
  controls?: React.ReactNode
  // Shown next to the send button, such as the context usage.
  status?: React.ReactNode
  isBusy: boolean
  onSubmit: (text: string) => void
  onStop: () => void
}) {
  const [input, setInput] = React.useState("")

  function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault()
    const text = input.trim()
    if (!text || isBusy) return
    onSubmit(text)
    setInput("")
  }

  return (
    <form onSubmit={handleSubmit}>
      <InputGroup>
        <InputGroupTextarea
          placeholder="Send a message…"
          className="p-3.5"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault()
              handleSubmit()
            }
          }}
        />
        <InputGroupAddon align="block-end" className="flex-wrap">
          {controls}
          <div className="ml-auto flex items-center gap-1">
            {status}
            {isBusy ? (
              <InputGroupButton
                type="button"
                size="icon-sm"
                variant="outline"
                aria-label="Stop generating"
                onClick={onStop}
              >
                <SquareIcon />
              </InputGroupButton>
            ) : (
              <InputGroupButton
                type="submit"
                size="icon-sm"
                variant="default"
                aria-label="Send message"
                disabled={!input.trim()}
              >
                <ArrowUpIcon />
              </InputGroupButton>
            )}
          </div>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
