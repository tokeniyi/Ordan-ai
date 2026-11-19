import { baseline } from "@/features/prompts/library/baseline"
import { fewShot } from "@/features/prompts/library/few-shot"
import { stepByStep } from "@/features/prompts/library/step-by-step"
import { structured } from "@/features/prompts/library/structured"
import {
  type PromptDefinition,
  type PromptOption,
} from "@/features/prompts/types"

// The first entry is the default.
export const PROMPTS: PromptDefinition[] = [
  structured,
  baseline,
  fewShot,
  stepByStep,
]

export const DEFAULT_PROMPT_ID = PROMPTS[0].id

export const PROMPT_OPTIONS: PromptOption[] = PROMPTS.map(
  ({ id, name, description }) => ({ id, name, description })
)

export function getPrompt(id: string) {
  return PROMPTS.find((prompt) => prompt.id === id)
}

export { buildPrompt } from "@/features/prompts/build"
