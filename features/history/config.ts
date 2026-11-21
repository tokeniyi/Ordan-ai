import { type HistoryStrategy } from "@/features/history/types"

export const DEFAULT_STRATEGY: HistoryStrategy = "summary"

// Tokens the whole request may use for the system prompt and the history,
// before the reply. Models behind the gateway accept 128k tokens or more, so
// this is a cost limit, not a hard one: every turn resends the whole history,
// so without a limit each message costs more than the last. It is kept small
// so trimming and summarizing are easy to see in the playground.
export const HISTORY_BUDGET = 4000

// When the summary strategy has to make room, it trims the history down to
// this share of the budget, not just under it. The slack means the next few
// turns fit without summarizing again on every message.
export const SUMMARY_TARGET = 0.75

// Room kept for the summary itself when planning what to evict. The prompt
// asks for under 200 words, which is about 270 tokens.
export const SUMMARY_RESERVE_TOKENS = 300

// Output limit for the summarizing call. Reasoning models spend part of it
// on reasoning, so it is well above the length the prompt asks for.
export const SUMMARY_MAX_OUTPUT_TOKENS = 2000
