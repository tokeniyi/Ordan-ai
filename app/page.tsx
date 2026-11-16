import { MODELS } from "@/lib/ai/models"
import { Chat } from "@/features/chat/components/chat"

export default function Page() {
  return <Chat models={MODELS} />
}
