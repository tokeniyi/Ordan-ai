import { z } from "zod"

import { KNOWLEDGE_BASES, type KnowledgeBase } from "@/features/rag/types"

// Which documents the browser asked the reply to use.
export function parseKnowledge(value: unknown): KnowledgeBase | undefined {
  const result = z.enum(KNOWLEDGE_BASES).default("none").safeParse(value)
  return result.success ? result.data : undefined
}
