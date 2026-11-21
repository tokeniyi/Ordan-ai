import { z } from "zod"

import { CHUNK_STRATEGIES, SEARCH_METHODS } from "@/features/search/types"

export const DEFAULT_STRATEGY = "recursive-headings"

export const searchRequestSchema = z.object({
  query: z.string().trim().min(1).max(500),
  strategy: z.enum(CHUNK_STRATEGIES).default(DEFAULT_STRATEGY),
  method: z.enum(SEARCH_METHODS).default("semantic"),
  k: z.number().int().min(1).max(20).default(5),
})

export type SearchRequest = z.infer<typeof searchRequestSchema>
