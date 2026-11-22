# Architecture

Ordan AI is one Next.js app. The code is split so that each AI concept lives in its own folder and plugs into the chat at one known place.

## Layout

```
app/
  api/chat/route.ts         The chat endpoint. Validates the request, calls the model, streams the reply.
  api/suggestions/route.ts Returns follow-up questions for a finished reply.
  api/search/route.ts      Searches the Kestrel corpus, semantic or keyword.
  chat/[id]/page.tsx       A saved chat, loaded from the browser's storage.
  search/page.tsx          The search page.
  compare/page.tsx         The compare page.
  evals/                   The eval results pages, built from evals/results.
  layout.tsx, page.tsx     The shell and the chat page.
components/
  ui/                   shadcn/ui components. Added with the CLI, not written by hand.
features/
  chat/
    components/         The chat thread, prompt form, model picker, message actions.
    components/parts/   One component per message part type: text, reasoning.
    types.ts            The message types shared by the route and the UI.
  history/              Saved chats, the chat list, and fitting the history into a token budget.
  prompts/              The versioned prompt library and the prompt builder.
  rag/                  Retrieval for the chat: the query planner, HyDE and multi-query (query.ts), the pipeline that combines them with search and reranking (pipeline.ts), the grounding prompt, citations, and the Chain of Thought, Sources and Inline Citation components.
  search/               Chunking, embeddings, the vector store, BM25, hybrid search (rank fusion), reranking and retrieval metrics.
  suggestions/          Follow-up questions, generated as structured output.
  compare/              The side-by-side prompt comparison.
  evals/                Test sets, checks, the LLM judge, the runner and the results page.
evals/results/          Saved eval runs, as JSON and Markdown.
evals/retrieval/        Saved retrieval runs, as JSON and Markdown.
data/corpus/kestrel/    The made-up help centre that search and RAG use.
data/index/             One search index per chunking strategy, built by `pnpm index`.
scripts/eval.ts         Runs the evaluation from the command line.
scripts/build-index.ts  Chunks and embeds the corpus.
scripts/eval-retrieval.ts  Measures recall@k and MRR for every strategy.
scripts/eval-pipelines.ts  Measures the retrieval pipelines: planning, HyDE, multi-query, hybrid search and reranking.
lib/
  ai/provider.ts        The Kilo AI Gateway client and the local embedding and reranking models. The only file that knows the providers.
  ai/models.ts          The models the picker offers and the route accepts.
docs/                   This folder.
```

## How a message flows

1. `features/chat/components/chat.tsx` sends the messages, the chosen model, the chosen prompt id, the knowledge base (none or the Kestrel help centre) and the history settings (strategy and the last summary) to `/api/chat` with `useChat`.
2. `app/api/chat/route.ts` checks the model against `lib/ai/models.ts`, validates the messages and builds the prompt with `features/prompts`. With the Kestrel help centre on, `features/rag/kestrel.ts` runs the retrieval pipeline: a model call decides whether the newest message needs a search and rewrites it as a standalone question, then semantic search finds 20 candidates and a local reranker keeps the best 4. The route adds them to the system prompt with `features/rag/prompt.ts` (or a note that no search was run), and strips old citations from earlier answers. Then it fits the history into the budget with `features/history/prepare.ts` (trimming or summarizing old turns), and calls `streamText` with the model from `lib/ai/provider.ts`.
3. The reply streams back as typed parts. `chat-message.tsx` switches on the part type and renders each one with a component from `components/parts/`. The message metadata says what was done with the history, the retrieval steps and the sources the reply was given, and how many tokens it used. Citations such as [1] in the text become inline citations, and a Sources line lists the passages.
4. When the reply finishes, `features/suggestions` asks `/api/suggestions` for follow-up questions and shows them above the input, and the chat is saved to the browser's localStorage by `features/history/store.ts`.

## How a search flows

1. `pnpm index` reads `data/corpus/kestrel/`, chunks every page with each strategy in `features/search/chunk/`, embeds the chunks with `embedTexts` from `lib/ai/provider.ts`, and writes `data/index/<strategy>.json`. The files are committed.
2. `/search` sends the query, the strategy and the method to `/api/search`.
3. The route loads the index file, embeds the query with the same model, and ranks every chunk by cosine similarity, or by BM25 for keyword search (`features/search/search.ts`).

The chat uses the same index for RAG, with recursive chunks with headings, and the settings in `RAG_SETTINGS` (`features/rag/config.ts`): query planning, semantic search and reranking. `/search` shows semantic, keyword and hybrid results side by side.

## Rules

- **Routes stay thin.** Files in `app/` wire things together. Logic lives in `features/` or `lib/`.
- **One feature, one folder.** A feature keeps its components, server code, types and tests together in `features/<name>/`. Features import from `lib/` and `components/ui/`, not from each other's internals.
- **One provider file.** Every model call goes through `lib/ai/provider.ts`, so routing, caching and cost tracking can be added in one place.
- **All AI UI comes from shadcn/ui.** Use the [AI Elements](https://ui.shadcn.com/docs/ai-elements) patterns (Chat, Message, Reasoning, Tool, Sources, Plan and so on) and the components they build on. Add components with `npx shadcn@latest add <name>`.

## Adding a feature

1. Create `features/<name>/` with its own code. Server-only logic should be plain functions that can be run and tested without the UI.
2. Connect it to the chat in `app/api/chat/route.ts`, for example by adding retrieved context to the prompt or by adding a tool.
3. If it streams a new kind of part, add a component in `features/chat/components/parts/` and a case in `chat-message.tsx`.
4. Add test cases for it to the eval set and run `pnpm eval` before and after, so the write-up can report measured results.
5. Add unit tests next to the code, as `*.test.ts`, for any logic that does not call a model.
6. Write it up in `docs/phases/`.

Because each feature connects at one place, turning it off is a one-line change, which makes it easy to find which feature caused a problem.

## Environment

| Variable        | Required | Purpose                                                    |
| --------------- | -------- | ---------------------------------------------------------- |
| `KILO_API_KEY`  | Yes      | Kilo AI Gateway API key.                                   |
| `KILO_BASE_URL` | No       | Overrides the gateway URL. Defaults to the public gateway. |
| `TRANSFORMERS_CACHE` | No  | Where the embedding model's weights are cached. Defaults to `.cache/transformers`. |

## Testing

- `pnpm test` runs unit tests with Vitest. They cover code that does not call a model, so they are fast and free.
- `pnpm eval` runs the evaluation against real models. See [evals.md](evals.md).
- `pnpm eval:retrieval` measures search on the Kestrel corpus. It runs the embedding model locally, so it is free.
- `pnpm eval:pipelines` measures the retrieval pipelines. Search and reranking are local; query planning and expansion call the eval model and are cached.
