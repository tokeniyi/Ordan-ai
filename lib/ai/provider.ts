import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

// Every model call in the app goes through the Kilo AI Gateway, which is
// OpenAI-compatible. See https://kilo.ai/docs/gateway.
export const KILO_BASE_URL =
  process.env.KILO_BASE_URL ?? "https://ai-gateway.kilo.ai/api/v1"

const kilo = createOpenAICompatible({
  name: "kilo",
  baseURL: KILO_BASE_URL,
  apiKey: process.env.KILO_API_KEY,
  // Send JSON schemas to the gateway, so structured output is enforced.
  supportsStructuredOutputs: true,
})

export function hasApiKey() {
  return Boolean(process.env.KILO_API_KEY)
}

export function getModel(modelId: string) {
  return kilo.chatModel(modelId)
}

// Embeddings run locally with Transformers.js, because the gateway's
// embedding models are paid. The weights (about 90 MB) download from Hugging
// Face on first use and are cached in .cache/transformers.
export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2"

// The model reads at most this many tokens and ignores the rest. Two of them
// are special tokens it adds around every text.
export const EMBEDDING_MAX_TOKENS = 256

type Transformers = typeof import("@huggingface/transformers")

// The small parts of Transformers.js used here. Its own types are too large
// for TypeScript to infer through.
type Extractor = (
  texts: string[],
  options: { pooling: "mean"; normalize: boolean }
) => Promise<{ tolist: () => unknown }>
type Tokenizer = {
  encode: (text: string, options: { add_special_tokens: boolean }) => number[]
}

let transformers: Promise<Transformers> | undefined

// Loaded on first use, so the chat route never pays for it.
function loadTransformers() {
  transformers ??= import("@huggingface/transformers").then((module) => {
    module.env.cacheDir =
      process.env.TRANSFORMERS_CACHE ?? ".cache/transformers"
    return module
  })
  return transformers
}

let extractor: Promise<Extractor> | undefined

// Turns texts into vectors of 384 numbers, normalized to length 1, so the
// dot product of two vectors is their cosine similarity.
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  extractor ??= loadTransformers().then(
    async ({ pipeline }) =>
      (await pipeline("feature-extraction", EMBEDDING_MODEL, {
        dtype: "fp32",
      })) as unknown as Extractor
  )
  const output = await (
    await extractor
  )(texts, {
    pooling: "mean",
    normalize: true,
  })
  return output.tolist() as number[][]
}

let tokenizer: Promise<Tokenizer> | undefined

// Counts tokens the way the embedding model does. The two special tokens it
// adds around every text are left out, so counts of pieces add up to the
// count of the whole.
export async function embeddingTokenCounter() {
  tokenizer ??= loadTransformers().then(
    async ({ AutoTokenizer }) =>
      (await AutoTokenizer.from_pretrained(
        EMBEDDING_MODEL
      )) as unknown as Tokenizer
  )
  const loaded = await tokenizer
  return (text: string) =>
    loaded.encode(text, { add_special_tokens: false }).length
}

// A cross-encoder trained on MS MARCO search queries. It reads a query and a
// passage together and scores how well the passage answers it. About 90 MB,
// downloaded and cached like the embedding model.
export const RERANK_MODEL = "Xenova/ms-marco-MiniLM-L-6-v2"

type CrossEncoder = {
  tokenizer: (
    queries: string[],
    options: { text_pair: string[]; padding: boolean; truncation: boolean }
  ) => unknown
  model: (inputs: unknown) => Promise<{ logits: { tolist: () => unknown } }>
}

let crossEncoder: Promise<CrossEncoder> | undefined

// Scores each text against the query, from 0 (unrelated) to 1. The model
// gives a raw logit; a sigmoid turns it into a score that is easier to read.
export async function rerankScores(
  query: string,
  texts: string[]
): Promise<number[]> {
  if (texts.length === 0) return []
  crossEncoder ??= loadTransformers().then(
    async ({ AutoTokenizer, AutoModelForSequenceClassification }) => ({
      tokenizer: (await AutoTokenizer.from_pretrained(
        RERANK_MODEL
      )) as unknown as CrossEncoder["tokenizer"],
      model: (await AutoModelForSequenceClassification.from_pretrained(
        RERANK_MODEL,
        { dtype: "fp32" }
      )) as unknown as CrossEncoder["model"],
    })
  )
  const { tokenizer, model } = await crossEncoder
  const inputs = tokenizer(new Array(texts.length).fill(query), {
    text_pair: texts,
    padding: true,
    truncation: true,
  })
  const { logits } = await model(inputs)
  return (logits.tolist() as number[][]).map(
    ([logit]) => 1 / (1 + Math.exp(-logit))
  )
}
