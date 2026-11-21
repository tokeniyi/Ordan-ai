<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Guide for agents working on Ordan AI

Ordan AI is a learning playground for AI engineering. The chat is the test bench: each phase adds one concept (prompts, evals, history, retrieval, agents...), measures what it changed, and writes up what was learned. Read this file first, then the documents it points to.

## Project rules

- Read `docs/architecture.md` before adding code. Features live in `features/<name>/`, routes in `app/` stay thin, and every model call goes through `lib/ai/provider.ts`.
- All AI UI comes from shadcn/ui and its AI Elements patterns (https://ui.shadcn.com/docs/ai-elements). Add components with `npx shadcn@latest add <name>`; do not hand-write files in `components/ui/`.
- Each phase ends with a write-up in `docs/phases/`, started from `docs/phases/TEMPLATE.md`.
- Measure changes that affect answers with `pnpm eval` before and after (see `docs/evals.md`), and report the numbers in the phase write-up. Run `pnpm test` for logic that does not call a model.

## Where to start

1. `docs/roadmap.md`: what is done, what each phase measured, what is next, and the backlog.
2. `docs/architecture.md`: the layout, how a message flows, and how to add a feature.
3. The latest write-up in `docs/phases/`: the most recent decisions and their reasons.
4. `docs/evals.md`: how answers are measured.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm install` | Install dependencies. |
| `pnpm dev` | Start the dev server on port 3000. |
| `pnpm lint`, `pnpm typecheck` | ESLint and TypeScript. |
| `pnpm exec prettier --check "**/*.{ts,tsx}"` | Check formatting. `pnpm format` writes it. |
| `pnpm test` | Vitest unit tests. No model calls, no network. |
| `pnpm build` then `pnpm test:e2e` | Playwright browser tests against the production build. Model calls are mocked in the browser. |
| `pnpm eval` | Run the eval against real models. Needs `KILO_API_KEY`. |
| `pnpm index` | Chunk and embed `data/corpus/kestrel/` into `data/index/`. Run after changing the corpus or a chunker, and commit the output. |
| `pnpm eval:retrieval` | Measure search (recall@k, MRR). Local and free. |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, the build and the browser tests on every pull request. Run the same steps locally before pushing.

## How a phase is done

1. **Plan.** Read the phase's row in `docs/roadmap.md` and the backlog. Decide the scope and write it down before coding.
2. **Measure before.** Add test cases for the phase to the eval framework (`features/evals/datasets/`). Run `pnpm eval` on the current code first, so there is a "before".
3. **Build.** Put the logic in `features/<name>/` as plain functions that take their model calls as arguments, so they can be unit tested with fakes. Connect the feature in one place, usually `app/api/chat/route.ts`.
4. **Test.** Unit tests next to the code as `*.test.ts`. Browser tests in `e2e/` for anything a user clicks, with the model mocked by `e2e/mock-model.ts`.
5. **Measure after.** Run `pnpm eval` again and commit the files in `evals/results/`.
6. **Write up.** Copy `docs/phases/TEMPLATE.md`. Report the numbers, link the runs, and say what did not work. Update `docs/roadmap.md` (status, summary, backlog), `docs/README.md`, `docs/architecture.md` and the README's feature list.
7. **Ship.** Commit in logical steps, open a pull request with the results table, and make sure CI is green.

## Conventions

- **Code.** TypeScript, no semicolons, double quotes, Prettier with the Tailwind plugin. Comments explain why, not what. Keep files small and named after what they do.
- **Features do not reach into each other.** A feature imports from `lib/`, `components/ui/` and other features' public files (types, components), not their internals.
- **Model calls stay out of logic.** Planning, scoring and parsing code takes the model call as a function argument. The chat route and the eval runner pass the real call; tests pass a fake. See `features/history/prepare.ts` and `features/evals/run.ts`.
- **Writing.** Docs and UI text use plain words and short sentences. Say what a thing does and why. Write numbers you measured, not adjectives.
- **Evals.** Pin models in `features/evals/config.ts`, never Kilo's auto models, so runs can be compared. Deterministic checks only for hard facts and format. If you add a `matches` check, add a unit test for the pattern.

## Things that will catch you out

- **Next.js 16.** Route `params` are a Promise (`const { id } = await params`). Read `node_modules/next/dist/docs/` before using an API you remember from older versions.
- **React Compiler lint rules.** `react-hooks/set-state-in-effect` and "cannot access refs during render" are errors. Read state from `useState` instead of a ref during render. Where an effect really does sync with an external system, a commented `eslint-disable-next-line` is acceptable.
- **localStorage is browser-only.** Saved chats load after mount (`features/history/use-saved-chats.ts`). Do not read storage during render, or the server and client HTML will not match.
- **The shadcn CLI asks before overwriting.** `npx shadcn add sidebar` asks whether to overwrite `button.tsx`. Answer no: `yes n | pnpm exec shadcn add <name>`. Generated components import `cn` from the `cn` package.
- **Message metadata carries server facts.** The chat route sends what it did with the history (`context`) and the token usage (`usage`) as message metadata. The browser saves it with the chat and sends the summary back. See `features/chat/types.ts`.
- **The `/evals` page shows the newest run.** A run with one prompt makes the summary table one row long. `e2e/evals.spec.ts` checks the phase 2 run by its own page for that reason.
- **Embeddings run locally.** `embedTexts` in `lib/ai/provider.ts` uses Transformers.js. The first call downloads about 90 MB from Hugging Face into `.cache/transformers` (not committed). Unit tests never load it: they pass a fake embedding function. Chunk sizes are counted with the embedding model's tokenizer without its two special tokens, because counts of pieces must add up.
- **Index files must match the corpus.** `features/search/corpus.test.ts` fails if a page changed without `pnpm index`, or if a retrieval question's passage is not whole in some chunk.
- **Free-tier rate limit.** Kilo allows 200 free-model requests an hour per IP address. A full core run is 160 calls. Use `--prompts` and `--cases` to stay inside it. The eval cache (`evals/.cache/`, not committed) resumes a run that stopped at the limit.

## Running in a cloud container

- The network goes through a proxy. Node's built-in `fetch` ignores `HTTPS_PROXY`, so run evals and scripts with `NODE_USE_ENV_PROXY=1`. The proxy adds the Kilo key, so set `KILO_API_KEY` to any placeholder value: `NODE_USE_ENV_PROXY=1 KILO_API_KEY=placeholder pnpm eval ...`.
- `next start` did not reach the gateway through the proxy, even with that variable. To check a server-side change against real models, call the feature's functions from a `tsx` script, as the eval runner does.
- Playwright and Chromium are installed. Do not run `playwright install`.
- Hosts outside the allowlist are blocked. The Ordan-ai environment allows Hugging Face (`huggingface.co` and its file hosts, such as `us.aws.cdn.hf.co`) so the embedding model can download. Run `pnpm index` and `pnpm eval:retrieval` with `NODE_USE_ENV_PROXY=1`.

## Git and pull requests

- Work on a branch, never on `main`. Open a pull request when the phase is done and every check passes locally.
- The pull request description has a short "what this adds", the eval results table, and the tests that were added.
- Merge only when the owner asks.
