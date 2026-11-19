// A deterministic check on the answer text. Cheap, exact and repeatable.
export type Check =
  | { type: "includesAll"; values: string[] }
  | { type: "includesAny"; values: string[] }
  | { type: "excludes"; values: string[] }
  | { type: "matches"; pattern: string; flags?: string }
  | { type: "maxWords"; value: number }
  | { type: "minWords"; value: number }
  | { type: "hasCodeBlock" }

export interface EvalCase {
  id: string
  category: string
  input: string
  // What a good answer contains. Given to the judge, never to the model
  // under test.
  reference: string
  checks?: Check[]
}

export interface Dataset {
  id: string
  description: string
  cases: EvalCase[]
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
  error?: string
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
  avgOutputTokens: number
  avgLatencyMs: number
  totalCostUsd: number
}

export interface RunReport {
  id: string
  createdAt: string
  dataset: string
  model: string
  judgeModel: string
  summaries: PromptSummary[]
  results: CaseResult[]
}
