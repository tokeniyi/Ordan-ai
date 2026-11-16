import { type ModelMessage } from "ai"

import { type PromptDefinition } from "@/features/prompts/types"

type Variables = Record<string, string>

function defaultVariables(): Variables {
  return {
    date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  }
}

// Replaces each {{name}} with its value. Throws on a variable with no value,
// so a typo in a prompt fails loudly instead of reaching the model.
export function fillTemplate(template: string, variables: Variables) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    const value = variables[name]
    if (value === undefined) {
      throw new Error(`Prompt variable "${name}" has no value.`)
    }
    return value
  })
}

// Turns a prompt definition into what streamText needs: the system prompt,
// and the few-shot examples as earlier turns of the conversation.
export function buildPrompt(
  prompt: PromptDefinition,
  variables: Variables = {}
) {
  const examples: ModelMessage[] = (prompt.examples ?? []).flatMap(
    (example) => [
      { role: "user", content: example.user },
      { role: "assistant", content: example.assistant },
    ]
  )

  return {
    system: fillTemplate(prompt.system, {
      ...defaultVariables(),
      ...variables,
    }),
    examples,
    temperature: prompt.temperature,
  }
}
