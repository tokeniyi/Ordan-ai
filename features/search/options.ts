import { type ChunkStrategy } from "@/features/search/types"

// The choices in the Chunking picker. The first one is the default.
export const STRATEGY_OPTIONS: {
  id: ChunkStrategy
  name: string
  description: string
}[] = [
  {
    id: "recursive-headings",
    name: "Recursive + headings",
    description:
      "Splits by section, then paragraph, and adds the page title and heading to each chunk.",
  },
  {
    id: "recursive",
    name: "Recursive",
    description: "Splits by section, then paragraph, then sentence.",
  },
  {
    id: "sentence",
    name: "Sentences",
    description: "Packs whole sentences up to 128 tokens. Ignores headings.",
  },
  {
    id: "fixed",
    name: "Fixed size",
    description:
      "Windows of 128 tokens with a little overlap. Ignores structure.",
  },
]
