import { MODELS } from "@/lib/ai/models"
import { Chat } from "@/features/chat/components/chat"
import { PROMPT_OPTIONS } from "@/features/prompts"

export default function Page() {
  return <Chat models={MODELS} prompts={PROMPT_OPTIONS} />
}
