import { type CaseResult } from "@/features/evals/types"

// Below this judge score a case counts as failed, even if its checks passed.
export const QUALITY_THRESHOLD = 80

export type CaseStatus = "passed" | "failed" | "error"

export function caseStatus(result: CaseResult): CaseStatus {
  if (result.error) return "error"
  if (!result.checksPassed) return "failed"
  if (result.quality !== undefined && result.quality < QUALITY_THRESHOLD) {
    return "failed"
  }
  return "passed"
}

// Why a case failed, in words.
export function failureReasons(result: CaseResult) {
  const reasons = result.checks
    .filter((check) => !check.passed)
    .map((check) => `Failed check: ${check.label}`)
  if (result.quality !== undefined && result.quality < QUALITY_THRESHOLD) {
    reasons.push(`Judge score ${result.quality} is below ${QUALITY_THRESHOLD}`)
  }
  if (result.error) reasons.push(result.error)
  return reasons
}
