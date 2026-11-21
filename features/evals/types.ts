import { type HistoryStrategy } from "@/features/history/types"
import { type KnowledgeBase } from "@/features/rag/types"

// A deterministic check on the answer text. Cheap, exact and repeatable.
export type Check =
  | { type: "includesAll"; values: string[] }
  | { type: "includesAny"; values: string[] }
  | { type: "excludes"; values: string[] }
  | { type: "matches"; pattern: string; flags?: string }
  | { type: "maxWords"; value: number }
  | { type: "minWords"; value: number }
  | { type: "hasCodeBlock" }

// An earlier message in a multi-turn case.
export interface HistoryTurn {
  role: "user" | "assistant"
  content: string
}

export interface EvalCase {
  id: string
  category: string
  // The last user message. The answer to it is what gets scored.
  input: string
  // Earlier turns of the conversation, oldest first. They go through the same
  // history handling as the chat: full, window or summary.
  history?: HistoryTurn[]
  // What a good answer contains. Given to the judge, never to the model
  // under test.
  reference: string
  checks?: Check[]
  // For questions about a knowledge base: the passage that answers it, as in
  // the phase 4 retrieval cases. Left out when the documents do not answer
  // the question.
  retrieval?: { docId: string; evidence: string }
}

export interface Dataset {
  id: string
  description: string
  // The history budget in tokens for multi-turn cases. Defaults to the
  // chat's budget.
  historyBudget?: number
  // The documents the cases are about. Runs retrieve from them unless told
  // not to, so the same questions can be asked with and without sources.
  knowledge?: KnowledgeBase
  cases: EvalCase[]
}

// The history settings a run used.
export interface HistorySettings {
  strategy: HistoryStrategy
  budget: number
}

// What happened to a multi-turn case's history.
export interface CaseContext {
  totalMessages: number
  sentMessages: number
  summarized: boolean
  summaryFailed: boolean
  // Tokens used by the summarizing call, on top of the answer's.
  summaryInputTokens: number
  summaryOutputTokens: number
}

// What was retrieved for a case, and how the answer cited it.
export interface CaseRag {
  sources: { n: number; chunkId: string; score: number }[]
  // Rank of the first source holding the case's evidence. Missing when no
  // source holds it, or the case has no evidence.
  evidenceRank?: number
  // Whether the case has evidence to look for.
  hasEvidence: boolean
  // Source numbers the answer cited, and those that do not exist.
  cited: number[]
  invalidCitations: number[]
}

export interface CheckResult {
  check: Check
  label: string
  passed: boolean
}

export interface JudgeScores {
  correctness: number
  relevance: number
  clarity: number
  // 1 to 5: is every claim supported by the sources? Only scored when the
  // answer was given sources.
  faithfulness?: number
  reason: string
}

export interface CaseResult {
  caseId: string
  category: string
  input: string
  promptId: string
  answer: string
  checks: CheckResult[]
  checksPassed: boolean
  judge?: JudgeScores
  // 0 to 100: the mean of the three judge scores, scaled.
  quality?: number
  latencyMs: number
  inputTokens: number
  outputTokens: number
  costUsd: number
  context?: CaseContext
  rag?: CaseRag
  error?: string
}

// Retrieval and grounding over a run's cases. Only for runs with sources.
export interface RagSummary {
  // Cases with evidence, and those where a source held it.
  evidenceCases: number
  evidenceFound: number
  // Mean judge score, 1 to 5.
  faithfulness: number
  // Answers that cited at least one source, out of all answers.
  citedAnswers: number
  answers: number
  invalidCitations: number
}

export interface PromptSummary {
  promptId: string
  promptVersion: number
  cases: number
  // Cases that passed their checks and scored at least QUALITY_THRESHOLD.
  passed: number
  errors: number
  checksPassed: number
  checksTotal: number
  correctness: number
  relevance: number
  clarity: number
  quality: number
  // Missing in runs saved before phase 3.
  avgInputTokens?: number
  avgOutputTokens: number
  // Tokens spent on summarizing, per case. Only for multi-turn runs.
  avgSummaryTokens?: number
  avgLatencyMs: number
  totalCostUsd: number
  rag?: RagSummary
}

export interface RunReport {
  id: string
  createdAt: string
  dataset: string
  model: string
  judgeModel: string
  // Missing in runs saved before phase 3.
  history?: HistorySettings
  // The documents the answers were given. Missing in runs before phase 5,
  // and "none" when a knowledge dataset ran without sources.
  knowledge?: KnowledgeBase
  summaries: PromptSummary[]
  results: CaseResult[]
}
