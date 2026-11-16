export interface FewShotExample {
  user: string
  assistant: string
}

// One version of a system prompt. Changing the wording means adding a new
// version, so results can always be traced back to the exact prompt.
export interface PromptDefinition {
  id: string
  name: string
  version: number
  // The prompt engineering technique this prompt demonstrates.
  technique: string
  description: string
  // May contain {{variables}}, filled in by buildSystemPrompt.
  system: string
  // Sent as earlier turns of the conversation, before the real messages.
  examples?: FewShotExample[]
  temperature?: number
}

// What the picker needs. Safe to send to the browser.
export interface PromptOption {
  id: string
  name: string
  description: string
}
