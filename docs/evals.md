# Running evals

The eval framework answers one question: did a change make the answers better or worse? It runs every prompt against a fixed test set, scores each answer, and saves the results so runs can be compared.

## Run it

You need `KILO_API_KEY` in `.env.local`, the same as for the app.

```bash
pnpm eval
```

This runs every prompt in `features/prompts` against the `core` test set. It prints a line per case as it goes, then a summary table, and saves two files in `evals/results/`:

- `<timestamp>.json`: everything, including each answer and the judge's reasons.
- `<timestamp>.md`: a short report you can read on GitHub.

A full run makes two model calls per case per prompt: one to answer and one to judge. The default models are free, so it costs nothing, but it takes a few minutes.

### Rate limits and the cache

Kilo allows **200 free-model requests per hour per IP address**, shared by the app and the evals. A full run of the core set is 160 calls, so plan on one full run per hour.

Two things keep runs inside the limit:

- **Cache.** Every answer and judgment is saved in `evals/.cache/`, keyed by a hash of everything that affects it: the model, the prompt text, the examples, the temperature and the question. A re-run only calls the model for prompts or cases that changed. Edit one prompt and only that prompt is re-run. Use `--no-cache` to force fresh calls, for example to check how much answers vary between runs.
- **Stop early.** When a call is refused because of the rate limit, the run stops starting new calls instead of retrying. It saves nothing, because a half-finished run would be misleading next to complete ones. Everything that finished is cached, so running the same command after the limit resets carries on from where it stopped.

The `structured` prompt includes today's date, so its cached answers are reused only on the same day.

### Options

| Option | Example | What it does |
| --- | --- | --- |
| `--prompts` | `--prompts structured,baseline` | Only run these prompts. |
| `--cases` | `--cases reasoning` | Only run these case ids or categories. |
| `--no-judge` | `--no-judge` | Skip the judge and run only the checks. Faster, and half the calls. |
| `--no-cache` | `--no-cache` | Call the models again instead of reusing cached results. |
| `--model` | `--model kilo-auto/balanced` | Answer with another model. |
| `--judge` | `--judge <model id>` | Judge with another model. |
| `--concurrency` | `--concurrency 1` | Calls in flight at once. Lower it if you hit rate limits. |
| `--dataset` | `--dataset core` | Which test set to run: `core` or `history`. |
| `--history` | `--history window` | How multi-turn cases send their history: `summary` (the default, as in the chat), `window` or `full`. |
| `--budget` | `--budget 2000` | The history budget in tokens for multi-turn cases. Defaults to the dataset's. |

Pass options after `--` when your package manager needs it, for example `pnpm eval -- --cases reasoning`.

## See the results

Commit the files in `evals/results/`, then open `/evals` in the app. It shows the latest run: a summary table per prompt, and every case with its answer, failed checks and the judge's reasoning. Older runs are listed at the bottom, each with its own page.

The page is built from the committed files when the app builds, so new runs show up after the next build or deploy.

## How answers are scored

Each case is scored in two ways.

**Deterministic checks** test things that have one right form: a fact that must appear, a word limit, a code block, bare JSON. They are exact, free and never change their mind. They are also brittle, because a right answer in different words fails a keyword check. So checks only test hard facts and format.

**The judge** is a second model that reads the question, a reference answer and the reply, then scores correctness, relevance and clarity from 1 to 5 with a written reason. It handles answers that can be worded many ways. It uses temperature 0 and a different model from the one answering, so a model is not grading its own work.

**Quality** is the mean of the three judge scores, scaled to 0 to 100.

A case **passes** when all its checks pass and its quality is at least 80. The threshold is `QUALITY_THRESHOLD` in `features/evals/status.ts`.

## Add a test case

Add an entry to the `cases` list in `features/evals/datasets/core.ts`:

```ts
{
  id: "fact-boiling-point",
  category: "facts",
  input: "At what temperature does water boil at sea level in Celsius?",
  reference: "100 °C.",
  checks: [{ type: "includesAll", values: ["100"] }],
},
```

- **`reference`** tells the judge what a good answer contains. Write what matters, not exact wording.
- **`checks`** are optional. Use them only for things a right answer must contain or must look like.

The available checks are `includesAll`, `includesAny`, `excludes`, `matches` (a regular expression), `maxWords`, `minWords` and `hasCodeBlock`. They are defined in `features/evals/types.ts`.

If you add a `matches` check, add a unit test for its pattern in `features/evals/datasets/core.test.ts`. A wrong pattern fails every answer without anyone noticing.

### Multi-turn cases

A case can have a `history`: earlier turns of the conversation, oldest first. The runner passes them through the same history code as the chat (`features/history/prepare.ts`), so a run measures what the chat would do with that conversation. Summaries are cached like answers. The `history` test set has eight such cases. Compare strategies by running it once per strategy:

```bash
pnpm eval --dataset history --prompts structured --history full
pnpm eval --dataset history --prompts structured --history window
pnpm eval --dataset history --prompts structured --history summary
```

The report then shows average input tokens per answer and, for the summary strategy, the tokens spent on summarizing.

To add a whole new test set, create a file next to `core.ts` and add it to `datasets/index.ts`.

## Retrieval evals

`pnpm eval:retrieval` measures search, not answers. It runs the 24 questions in `features/search/eval/cases.ts` against every chunking strategy, with semantic and keyword search, and saves a report to `evals/retrieval/`. The embedding model runs locally, so it costs nothing and takes a few seconds. It does not use the Kilo rate limit.

Each question names the passage that answers it. A chunk is relevant when it contains the whole passage. The report shows:

- **Recall@k:** the share of questions with a relevant chunk in the top k, for k = 1, 3 and 5.
- **MRR:** the mean of 1 / rank of the first relevant chunk, and 0 when none is in the top 10. Reported for all questions, and separately for questions worded differently from the pages and questions that reuse their words.
- **The rank per question,** for every strategy and method, so a change can be traced to the questions it moved.

To add a question, add an entry with its `docId` and `evidence`, a short passage copied exactly from that page. `features/search/corpus.test.ts` fails if the passage is not in the page, or is not whole in at least one chunk of every strategy. After changing the corpus or a chunker, run `pnpm index` before the eval.

## Compare runs fairly

- Compare runs that used the same dataset, model and judge. The `/evals` page and the Markdown report show all three.
- Evals use fixed models, set in `features/evals/config.ts`. Kilo's auto models send each request to a different model, which would make runs impossible to compare.
- Models are not fully deterministic. A difference of one case or a few quality points between two runs can be noise. Run twice before trusting a small difference.
