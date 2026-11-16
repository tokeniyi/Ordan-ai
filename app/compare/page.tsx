import type { Metadata } from "next"

import { MODELS } from "@/lib/ai/models"
import { Compare } from "@/features/compare/compare"
import { PROMPT_OPTIONS } from "@/features/prompts"

export const metadata: Metadata = {
  title: "Compare prompts · Ordan AI",
}

export default function Page() {
  return <Compare models={MODELS} prompts={PROMPT_OPTIONS} />
}
