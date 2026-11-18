import Link from "next/link"

import { NewChatButton } from "@/components/new-chat-button"
import { Button } from "@/components/ui/button"

export function SiteHeader() {
  return (
    <header className="flex items-center gap-1 px-4 py-3 sm:gap-2 sm:px-6">
      <Link href="/" className="mr-auto text-sm font-medium whitespace-nowrap">
        Ordan AI
      </Link>
      <Button
        variant="ghost"
        render={<Link href="/compare" />}
        nativeButton={false}
      >
        <span className="sm:hidden">Compare</span>
        <span className="hidden sm:inline">Compare prompts</span>
      </Button>
      <Button
        variant="ghost"
        render={<Link href="/evals" />}
        nativeButton={false}
      >
        Evals
      </Button>
      <NewChatButton />
    </header>
  )
}
