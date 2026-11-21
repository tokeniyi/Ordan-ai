import { planContext } from "@/features/history/plan"
import { WINDOW_NOTE, withHistory } from "@/features/history/prompt"
import {
  estimateMessageTokens,
  estimateTokens,
} from "@/features/history/tokens"
import {
  type ContextInfo,
  type ConversationSummary,
  type HistoryMessage,
  type HistoryStrategy,
} from "@/features/history/types"

// Folds messages into the previous summary and returns the new one. The chat
// route and the evals each pass their own, so this file never calls a model.
export type Summarize<M extends HistoryMessage> = (input: {
  previous?: string
  messages: M[]
}) => Promise<string>

// Plans the context, summarizes when the plan needs it, and returns the
// system prompt and messages to send, with a description of what was done.
export async function prepareContext<M extends HistoryMessage>({
  system,
  messages,
  strategy,
  budget,
  fixedTokens = 0,
  summary,
  summarize,
}: {
  system: string
  messages: M[]
  strategy: HistoryStrategy
  budget: number
  // Tokens sent besides the system prompt, such as few-shot examples.
  fixedTokens?: number
  summary?: ConversationSummary
  summarize: Summarize<M>
}): Promise<{ system: string; messages: M[]; info: ContextInfo }> {
  const plan = planContext({
    messages,
    strategy,
    budget,
    // The window strategy's note is added only when turns are dropped, but
    // it is counted up front so the request never goes over the budget.
    fixedTokens:
      estimateTokens(system) +
      fixedTokens +
      (strategy === "window" ? estimateTokens(WINDOW_NOTE) : 0),
    summary,
  })

  let nextSummary = plan.previousSummary
  let summarized = false
  let summaryFailed = false

  const last = plan.evict.at(-1)
  if (strategy === "summary" && last) {
    try {
      const text = await summarize({
        previous: plan.previousSummary?.text,
        messages: plan.evict,
      })
      if (!text.trim()) {
        throw new Error("The summary was empty.")
      }
      nextSummary = { text: text.trim(), throughMessageId: last.id }
      summarized = true
    } catch (error) {
      // Answering without the evicted turns is better than not answering.
      // The previous summary still ends where it did, so the next reply
      // tries to summarize these turns again.
      if (error instanceof Error && error.name === "AbortError") {
        throw error
      }
      summaryFailed = true
    }
  }

  const firstSentMessageId =
    plan.keep.length < messages.length ? plan.keep[0]?.id : undefined
  const fullSystem = withHistory(system, {
    strategy,
    firstSentMessageId,
    summary: nextSummary,
  })

  const info: ContextInfo = {
    strategy,
    budget,
    estimatedTokens:
      estimateTokens(fullSystem) +
      fixedTokens +
      plan.keep.reduce(
        (sum, message) => sum + estimateMessageTokens(message),
        0
      ),
    totalMessages: messages.length,
    sentMessages: plan.keep.length,
    ...(firstSentMessageId && { firstSentMessageId }),
    ...(nextSummary && { summary: nextSummary }),
    ...(summarized && { summarized }),
    ...(summaryFailed && { summaryFailed }),
  }

  return { system: fullSystem, messages: plan.keep, info }
}
