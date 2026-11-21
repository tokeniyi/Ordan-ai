import { MODELS } from "@/lib/ai/models"
import { NewChat } from "@/features/chat/components/new-chat"
import { PROMPT_OPTIONS } from "@/features/prompts"

export default function Page() {
  return <NewChat models={MODELS} prompts={PROMPT_OPTIONS} />
}
