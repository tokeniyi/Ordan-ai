// Fixed models for evaluation. Kilo's auto models route each request to a
// different model, which would make runs impossible to compare, so evals pin
// one model to answer and a different one to judge. Using a different judge
// avoids a model grading its own answers.
export const EVAL_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free"
export const JUDGE_MODEL = "nvidia/nemotron-3.5-super-vl:free"

// Kilo allows 200 free-model requests per hour per IP address, and a full
// run makes two calls per case per prompt. Keep the number of calls in
// flight low, and do not retry much: when the hourly quota is used up,
// retries only use more of it. The runner stops starting new calls instead.
export const CONCURRENCY = 2
export const MAX_RETRIES = 2

// Where answers and judgments are cached between runs. Git ignores it.
export const CACHE_DIR = "evals/.cache"

export const MAX_OUTPUT_TOKENS = 4096
