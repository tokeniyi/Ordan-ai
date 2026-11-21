import { MODELS } from "@/lib/ai/models"
import { SavedChat } from "@/features/chat/components/saved-chat"
import { PROMPT_OPTIONS } from "@/features/prompts"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <SavedChat id={id} models={MODELS} prompts={PROMPT_OPTIONS} />
}
