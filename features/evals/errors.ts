import { APICallError, RetryError } from "ai"

// True when the provider refused the call because of a rate limit or usage
// quota. Retrying such a call within the run only uses up more quota.
export function isRateLimitError(error: unknown): boolean {
  if (RetryError.isInstance(error)) {
    return isRateLimitError(error.lastError)
  }
  if (APICallError.isInstance(error)) {
    return error.statusCode === 429
  }
  return /too many requests|rate limit/i.test(String(error))
}
