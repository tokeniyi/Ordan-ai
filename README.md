# Ordan AI

An AI engineering playground inspired by ChatGPT, Claude and Copilot.

The goal is not to build another chatbot. The chat is the test bench: each phase adds one AI engineering concept to it, measures the effect, and documents what was learned.

![Ordan AI chat](docs/assets/chat.png)

## What it explores

- Prompt engineering
- Retrieval augmented generation (RAG) and advanced RAG architectures
- NLP pipelines: chunking, embeddings, semantic and hybrid search
- Conversation memory
- Tool calling and agents
- Multi-model routing
- Caching and cost optimization
- Evaluation systems

## Roadmap

### Current features

- Chat interface built with shadcn/ui AI Elements
- Streaming responses
- Reasoning display, when the model shares its thinking
- Markdown, tables and highlighted code blocks
- Model picker, with copy and retry on each reply
- Versioned prompt library with a prompt picker: zero-shot, structured, few-shot and step by step
- Side-by-side prompt comparison
- Follow-up suggestions, generated as structured output
- Evaluation framework: a test set, deterministic checks and an LLM judge, run with `pnpm eval` and shown on an `/evals` page
- Saved chats in a sidebar, kept in the browser
- History budgeting: a sliding window or a rolling summary keeps long chats inside a token budget, with a context indicator and checkpoints
- Search over a sample help centre: four chunking strategies, local embeddings, semantic and keyword (BM25) search side by side, measured with recall@k and MRR
- Answers from the sample help centre with citations (RAG): a Knowledge picker in the chat, inline citations and a sources list, measured for correctness, faithfulness and retrieval
- Advanced retrieval: a query planner that rewrites follow-ups and skips messages that need no search, hybrid search, a local reranker, and HyDE and multi-query measured side by side, with the steps shown in the chat
- Light and dark themes

### Upcoming features

- Semantic caching
- Multi-model routing
- Agent workflows
- Long-term memory

The full plan, what each finished phase measured, and the backlog are in [docs/roadmap.md](docs/roadmap.md).

## Stack

- [Next.js](https://nextjs.org) and TypeScript
- [shadcn/ui](https://ui.shadcn.com) and its [AI Elements](https://ui.shadcn.com/docs/ai-elements) patterns for every piece of AI UI
- Tailwind CSS
- [AI SDK](https://ai-sdk.dev) for streaming and message types
- [Kilo AI Gateway](https://kilo.ai/docs/gateway) for every model call

## Getting started

You need Node.js 20 or later, pnpm, and a Kilo API key.

```bash
pnpm install
```

```bash
cp .env.example .env.local
```

Set `KILO_API_KEY` in `.env.local`, then start the app:

```bash
pnpm dev
```

Open http://localhost:3000.

| Command          | What it does                                   |
| ---------------- | ---------------------------------------------- |
| `pnpm dev`       | Start the dev server                           |
| `pnpm build`     | Build for production                           |
| `pnpm typecheck` | Check types                                    |
| `pnpm lint`      | Run ESLint                                     |
| `pnpm format`    | Format the code with Prettier                  |
| `pnpm test`      | Run the unit tests                             |
| `pnpm test:e2e`  | Run the browser tests (run `pnpm build` first) |
| `pnpm eval`      | Run the evaluation                             |
| `pnpm index`     | Chunk and embed the search corpus              |
| `pnpm eval:retrieval` | Measure search with recall@k and MRR      |
| `pnpm eval:pipelines` | Measure the retrieval pipelines (query planning, HyDE, multi-query, hybrid, reranking) |

CI runs lint, typecheck, unit tests, the build and the browser tests on every pull request. The browser tests mock model calls, so CI needs no API key.

## Project structure

```
app/              Routes only. Pages and API handlers stay thin.
components/ui/    shadcn/ui components, added with the shadcn CLI.
components/       App shell: header, theme.
features/         One folder per feature. Each can be built and tested alone.
  chat/           The chat UI and its message parts.
  history/        Saved chats and fitting the history into a token budget.
  prompts/        The versioned prompt library.
  search/         Chunking, embeddings, vector and keyword search.
  suggestions/    Follow-up questions after each reply.
  compare/        Side-by-side prompt comparison.
  evals/          Test sets, scoring and the results page.
evals/results/    Saved eval runs, as JSON and Markdown.
data/             The sample corpus and its search indexes.
scripts/          Command line tools, such as the eval runner.
lib/ai/           The Kilo provider and the model list.
docs/             Architecture, roadmap, and one write-up per phase.
```

See [docs/architecture.md](docs/architecture.md) for how the pieces fit and how to add a feature.

## Documentation

- [Architecture](docs/architecture.md)
- [Roadmap and progress](docs/roadmap.md)
- [Guide for AI agents](AGENTS.md)
- [Running evals](docs/evals.md)
- [Phases](docs/phases)

## Credits

The chat started from the [shadcn/ui chatbot template](https://github.com/shadcn-ui/chatbot-template) (MIT).

## License

Apache 2.0. See [LICENSE](LICENSE).
