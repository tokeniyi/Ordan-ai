import { type KnowledgeBase } from "@/features/rag/types"

// What the knowledge picker in the chat offers.
export const KNOWLEDGE_OPTIONS: {
  id: KnowledgeBase
  name: string
  description: string
}[] = [
  {
    id: "none",
    name: "No documents",
    description: "A plain chat. The model answers from what it knows.",
  },
  {
    id: "kestrel",
    name: "Kestrel help centre",
    description:
      "Answers from the made-up Kestrel Cycle Club help pages, with citations.",
  },
]

// Questions for the empty chat when the Kestrel help centre is on.
export const KESTREL_SUGGESTIONS = [
  "What does the Family plan cost?",
  "What happens if my bike is stolen?",
  "Can I take the bike abroad?",
  "Do you sell the bikes?",
].map((prompt) => ({ label: prompt, prompt }))
