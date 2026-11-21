"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Trash2Icon } from "lucide-react"

import { chatStore, useChatList } from "@/features/history/use-saved-chats"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// The list of saved chats, newest first.
export function ChatSidebar() {
  const chats = useChatList()
  const pathname = usePathname()
  const router = useRouter()

  return (
    <Sidebar aria-label="Chat history">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            {chats.length === 0 ? (
              <p className="px-2 py-1 text-sm text-muted-foreground">
                No saved chats yet.
              </p>
            ) : (
              <SidebarMenu>
                {chats.map((chat) => {
                  const href = `/chat/${chat.id}`
                  const isActive = pathname === href
                  return (
                    <SidebarMenuItem key={chat.id}>
                      <SidebarMenuButton
                        isActive={isActive}
                        render={
                          <Link
                            href={href}
                            aria-current={isActive ? "page" : undefined}
                          />
                        }
                      >
                        <span className="truncate">{chat.title}</span>
                      </SidebarMenuButton>
                      <SidebarMenuAction
                        showOnHover
                        aria-label={`Delete ${chat.title}`}
                        onClick={() => {
                          chatStore.delete(chat.id)
                          if (isActive) {
                            router.push("/")
                          }
                        }}
                      >
                        <Trash2Icon />
                      </SidebarMenuAction>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <p className="px-2 text-xs text-muted-foreground">
          Chats are saved in this browser only.
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
