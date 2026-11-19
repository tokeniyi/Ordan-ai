import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export function NewChatButton() {
  return (
    <Button
      variant="secondary"
      // eslint-disable-next-line @next/next/no-html-link-for-pages
      render={<a href="/" aria-label="New chat" />}
      nativeButton={false}
    >
      <PlusIcon data-icon="inline-start" />
      <span className="hidden sm:inline">New Chat</span>
    </Button>
  )
}
