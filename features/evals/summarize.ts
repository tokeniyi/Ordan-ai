import { caseStatus } from "@/features/evals/status"
import { type CaseResult, type PromptSummary } from "@/features/evals/types"
import { type PromptDefinition } from "@/features/prompts/types"

function mean(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function summarize(
  prompts: Pick<PromptDefinition, "id" | "version">[],
  results: CaseResult[]
): PromptSummary[] {
  return prompts.map((prompt) => {
    const own = results.filter((result) => result.promptId === prompt.id)
    const answered = own.filter((result) => result.answer)
    const judged = own.flatMap((result) => (result.judge ? [result.judge] : []))
    const checks = own.flatMap((result) => result.checks)

    return {
      promptId: prompt.id,
      promptVersion: prompt.version,
      cases: own.length,
      passed: own.filter((result) => caseStatus(result) === "passed").length,
      errors: own.filter((result) => result.error).length,
      checksPassed: checks.filter((check) => check.passed).length,
      checksTotal: checks.length,
      correctness: round(mean(judged.map((score) => score.correctness))),
      relevance: round(mean(judged.map((score) => score.relevance))),
      clarity: round(mean(judged.map((score) => score.clarity))),
      quality: Math.round(mean(own.flatMap((result) => result.quality ?? []))),
      avgInputTokens: Math.round(
        mean(answered.map((result) => result.inputTokens))
      ),
      ...(answered.some((result) => result.context) && {
        avgSummaryTokens: Math.round(
          mean(
            answered.map(
              (result) =>
                (result.context?.summaryInputTokens ?? 0) +
                (result.context?.summaryOutputTokens ?? 0)
            )
          )
        ),
      }),
      avgOutputTokens: Math.round(
        mean(answered.map((result) => result.outputTokens))
      ),
      avgLatencyMs: Math.round(
        mean(answered.map((result) => result.latencyMs))
      ),
      totalCostUsd: round(
        own.reduce((sum, result) => sum + result.costUsd, 0),
        6
      ),
    }
  })
}
