import Link from "next/link"

import { NewChatButton } from "@/components/new-chat-button"
import { Button } from "@/components/ui/button"

export function SiteHeader() {
  return (
    <header className="flex items-center gap-2 px-6 py-3">
      <Link href="/" className="mr-auto text-sm font-medium">
        Ordan AI
      </Link>
      <Button
        variant="ghost"
        render={<Link href="/compare" />}
        nativeButton={false}
      >
        Compare prompts
      </Button>
      <NewChatButton />
    </header>
  )
}
