import { type Check, type CheckResult } from "@/features/evals/types"

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

// Markdown emphasis and code markers get in the way of plain text matching.
function normalize(text: string) {
  return text.replace(/[*_`]/g, "").toLowerCase()
}

export function describeCheck(check: Check) {
  switch (check.type) {
    case "includesAll":
      return `Mentions all of: ${check.values.join(", ")}`
    case "includesAny":
      return `Mentions one of: ${check.values.join(", ")}`
    case "excludes":
      return `Does not mention: ${check.values.join(", ")}`
    case "matches":
      return `Matches /${check.pattern}/${check.flags ?? ""}`
    case "maxWords":
      return `At most ${check.value} words`
    case "minWords":
      return `At least ${check.value} words`
    case "hasCodeBlock":
      return "Has a code block"
  }
}

export function runCheck(check: Check, answer: string): boolean {
  const text = normalize(answer)
  const has = (value: string) => text.includes(value.toLowerCase())

  switch (check.type) {
    case "includesAll":
      return check.values.every(has)
    case "includesAny":
      return check.values.some(has)
    case "excludes":
      return !check.values.some(has)
    case "matches":
      return new RegExp(check.pattern, check.flags).test(answer)
    case "maxWords":
      return countWords(answer) <= check.value
    case "minWords":
      return countWords(answer) >= check.value
    case "hasCodeBlock":
      return /```[\s\S]*?```/.test(answer)
  }
}

export function runChecks(checks: Check[], answer: string): CheckResult[] {
  return checks.map((check) => ({
    check,
    label: describeCheck(check),
    passed: runCheck(check, answer),
  }))
}
