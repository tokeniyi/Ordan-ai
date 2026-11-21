"use client"

import * as React from "react"
import { CheckIcon, CopyIcon, RefreshCcwIcon, Undo2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { MessageFooter } from "@/components/ui/message"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function MessageActions({
  text,
  onRetry,
  onRestore,
}: {
  text: string
  onRetry?: () => void
  // The Checkpoint pattern: go back to this reply and drop what came after.
  onRestore?: () => void
}) {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!copied) {
      return
    }

    const timeout = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timeout)
  }, [copied])

  return (
    <MessageFooter className="px-0">
      <MessageAction
        label={copied ? "Copied" : "Copy"}
        onClick={() => {
          navigator.clipboard
            .writeText(text)
            .then(() => setCopied(true))
            .catch(() => {})
        }}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </MessageAction>
      {onRetry && (
        <MessageAction label="Retry" onClick={onRetry}>
          <RefreshCcwIcon />
        </MessageAction>
      )}
      {onRestore && (
        <MessageAction label="Restore to here" onClick={onRestore}>
          <Undo2Icon />
        </MessageAction>
      )}
    </MessageFooter>
  )
}

function MessageAction({
  label,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            {...props}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}
