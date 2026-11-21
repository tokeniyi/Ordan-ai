import {
  SUMMARY_RESERVE_TOKENS,
  SUMMARY_TARGET,
} from "@/features/history/config"
import { estimateMessageTokens } from "@/features/history/tokens"
import {
  type ConversationSummary,
  type HistoryMessage,
  type HistoryStrategy,
} from "@/features/history/types"

export interface ContextPlan<M extends HistoryMessage> {
  // Messages sent to the model in full.
  keep: M[]
  // Messages that leave the window with this reply. The summary strategy
  // folds them into the summary, the window strategy drops them.
  evict: M[]
  // The summary from an earlier reply, if it still matches the messages.
  previousSummary?: ConversationSummary
}

// Splits messages into turns, each starting at a user message, so trimming
// never separates a question from its answer.
export function splitTurns<M extends HistoryMessage>(messages: M[]) {
  const turns: M[][] = []
  for (const message of messages) {
    const last = turns.at(-1)
    if (message.role === "user" || !last) {
      turns.push([message])
    } else {
      last.push(message)
    }
  }
  return turns
}

// Decides which messages to send, without calling a model. Always keeps the
// latest turn, even when it alone is over the budget.
export function planContext<M extends HistoryMessage>({
  messages,
  strategy,
  budget,
  fixedTokens,
  summary,
}: {
  messages: M[]
  strategy: HistoryStrategy
  budget: number
  // Tokens that are sent whatever happens: the system prompt and examples.
  fixedTokens: number
  summary?: ConversationSummary
}): ContextPlan<M> {
  if (strategy === "full") {
    return { keep: messages, evict: [] }
  }

  // A summary is only valid while the message it ends at is still there. A
  // restored checkpoint can remove it, and then the summary is discarded.
  let start = 0
  let previousSummary: ConversationSummary | undefined
  if (strategy === "summary" && summary) {
    const index = messages.findIndex(
      (message) => message.id === summary.throughMessageId
    )
    if (index !== -1 && index < messages.length - 1) {
      start = index + 1
      previousSummary = summary
    }
  }

  const turns = splitTurns(messages.slice(start))
  const turnTokens = turns.map((turn) =>
    turn.reduce((sum, message) => sum + estimateMessageTokens(message), 0)
  )
  const total = (from: number, withSummary: boolean) =>
    fixedTokens +
    (withSummary ? SUMMARY_RESERVE_TOKENS : 0) +
    turnTokens.slice(from).reduce((sum, tokens) => sum + tokens, 0)

  if (total(0, Boolean(previousSummary)) <= budget) {
    return { keep: turns.flat(), evict: [], previousSummary }
  }

  const limit = strategy === "summary" ? budget * SUMMARY_TARGET : budget
  const withSummary = strategy === "summary"
  let from = 0
  while (from < turns.length - 1 && total(from, withSummary) > limit) {
    from++
  }

  return {
    keep: turns.slice(from).flat(),
    evict: turns.slice(0, from).flat(),
    previousSummary,
  }
}
