import { type PromptDefinition } from "@/features/prompts/types"

// The phase 0 prompt, kept as the control to compare the others against.
export const baseline: PromptDefinition = {
  id: "baseline",
  name: "Baseline",
  version: 1,
  technique: "Zero-shot",
  description: "A two-line prompt. The control for comparisons.",
  system: `You are Ordan, a helpful AI assistant.
Answer clearly and concisely. Use markdown when it makes the answer easier to read.`,
}
