# Phase 4: NLP pipeline

**Status:** Done

## Goal

Build and measure the steps between a pile of documents and "find the passage that answers this question": counting tokens, cutting documents into chunks, turning chunks into embeddings, storing them, and searching them. Phase 5 puts retrieved chunks into the chat's prompt. This phase makes sure that what it retrieves is measured first, because an answer can only be as good as the passage it is given.

The chat's answers do not change in this phase.

## Concepts

- **Tokens and tokenizers.** Models read tokens, pieces of words, not characters. Every model family has its own tokenizer, so the same text has a different token count for each model. A tokenizer is only "real" for its own model.
- **Chunking.** Documents are too long to embed or to put in a prompt whole, so they are cut into chunks. Where the cuts go decides what a chunk is about. A chunk that mixes two topics matches neither well, and a cut in the middle of a sentence can separate a question's answer from its context.
- **Chunk size and overlap.** Small chunks are precise but lose context. Large chunks keep context but dilute it. Overlap repeats the end of one chunk at the start of the next, so text cut at a boundary is whole in at least one of the two.
- **Embeddings.** A model turns a text into a vector, here 384 numbers, so that texts with similar meaning get vectors that point the same way. "Kitten on the rug" is close to "cat on the mat" (cosine 0.61) and far from "stock prices fell" (0.07).
- **Cosine similarity.** How closely two vectors point the same way, from -1 to 1. Vectors normalized to length 1 make it a plain dot product.
- **Vector store.** Somewhere to keep the vectors and find the ones nearest a query. With 52 chunks, comparing the query with every chunk takes under a millisecond. Large stores use approximate indexes such as HNSW instead.
- **Keyword search and BM25.** The classic alternative: score chunks by the query words they contain, giving more weight to rare words and less to long chunks. It needs no model, and it is exact about names and numbers, but it does not know that "puncture" and "flat tyre" mean the same thing.
- **The embedding model's limit.** The model used here reads at most 256 tokens and silently ignores the rest. A chunk longer than that is embedded by its beginning only, so chunk sizes are measured in the model's own tokens.
- **Retrieval metrics.** Recall@k is the share of questions whose answer is in the top k results. Mean reciprocal rank (MRR) averages 1 / the rank of the first right result, so first place scores 1, second 0.5, and missing 0.

## What was built

### The corpus: `data/corpus/kestrel/`

Eight help-centre pages for Kestrel Cycle Club, a made-up electric bike subscription company in a made-up town. They cover prices, bikes and batteries, repairs, delivery, theft, the app, riding rules and contact details, with Markdown headings, tables and many specific numbers. The company is invented on purpose: in phase 5, a model can only answer "what is the theft excess?" correctly by retrieving it, never from what it learned in training.

### Search: `features/search/`

| File | Purpose |
| --- | --- |
| `types.ts` | Documents, chunks, indexes and search hits. |
| `corpus.ts` | Reads the Markdown files. |
| `chunk/units.ts` | Splits text into words, sentences, paragraphs and sections, keeping character offsets. |
| `chunk/strategies.ts` | The four chunking strategies. |
| `chunk/build.ts` | Packs units into chunks of at most 128 tokens. |
| `build-index.ts` | Chunks and embeds a corpus. The embedding call is passed in. |
| `index-files.ts` | Reads the committed index files. |
| `vectors.ts` | Cosine similarity and top-k. |
| `keyword.ts` | BM25. |
| `search.ts` | Semantic or keyword search over an index: the in-memory vector store. |
| `metrics.ts`, `eval/` | Relevance, recall@k and MRR, the 24 test questions, and the retrieval eval. |
| `components/` | The search page. |

The four chunking strategies, all at most 128 tokens:

| Strategy | How it cuts | Chunks |
| --- | --- | --- |
| Fixed size | Windows of words, with 12 words of overlap. Ignores structure. | 34 |
| Sentences | Whole sentences, with one sentence of overlap. Ignores headings. | 35 |
| Recursive | By section, then paragraph, then sentence, only going deeper when a piece is too big. Never crosses a heading. | 52 |
| Recursive + headings | Recursive, and the page title and heading are added to the text that is embedded, such as "Theft and accidents > If your bike is stolen". | 52 |

### Embeddings in `lib/ai/provider.ts`

`embedTexts` runs `all-MiniLM-L6-v2` locally with Transformers.js, and `embeddingTokenCounter` counts tokens with the same model's tokenizer. The gateway's embedding models need paid credits, so the free local model was chosen. Its weights, about 90 MB, download from Hugging Face on first use and are cached in `.cache/transformers`. Like every other model call, both live in the provider file, so switching to a hosted embedding model later is a change in one place.

### Index files and scripts

- `pnpm index` chunks the corpus with every strategy, embeds it, and writes `data/index/<strategy>.json`. The files are committed, so the app and CI never embed the corpus themselves.
- `pnpm eval:retrieval` runs the 24 questions against every strategy with both search methods and saves a report to `evals/retrieval/`. It is free and takes a few seconds.
- `scripts/compare-tokenizers.ts` compares token estimates with the counts the provider reported in earlier eval runs.

### The search page: `/search`

One query runs semantic and keyword search side by side, with a picker for the chunking strategy. Each result shows the page, the section, the score and the chunk's size in tokens. The endpoint, `/api/search`, embeds the query on the server.

![The search page](../assets/phase-04-search.png)

### Tests

- 34 new unit tests cover the splitters (offsets always point back into the text), every strategy (size limit, full coverage, no cut sentences, no crossed headings), BM25, cosine and top-k, the metrics, the index builder with a fake embedding model, and the committed files themselves. That last test fails if the corpus changes without `pnpm index`, or if a test question's passage is not whole in any chunk.
- A browser test covers the search page with the endpoint mocked.

## Results

### Retrieval

24 questions, 12 worded differently from the pages ("I got a puncture on my way to work") and 12 that reuse their words ("How long is ride history kept?"). A result is right when the chunk contains the whole passage that answers the question. Every passage fits whole in at least one chunk for every strategy, which a unit test checks, so no strategy is marked down for a passage it could not hold. Full results: [evals/retrieval/2026-11-21T11-45-18-306Z.md](../../evals/retrieval/2026-11-21T11-45-18-306Z.md).

Semantic search:

| Chunking | Recall@1 | Recall@3 | Recall@5 | MRR | MRR, paraphrased | MRR, same words |
| --- | --- | --- | --- | --- | --- | --- |
| Fixed size | 0.42 | 0.63 | 0.83 | 0.57 | 0.56 | 0.59 |
| Sentences | 0.63 | 0.79 | 0.88 | 0.73 | 0.65 | 0.90 |
| Recursive | 0.63 | 0.83 | **0.96** | **0.75** | **0.69** | 0.88 |
| Recursive + headings | 0.63 | **0.88** | **0.96** | **0.75** | 0.65 | **0.94** |

Keyword search (BM25):

| Chunking | Recall@1 | Recall@3 | Recall@5 | MRR | MRR, paraphrased | MRR, same words |
| --- | --- | --- | --- | --- | --- | --- |
| Fixed size | 0.25 | 0.42 | 0.50 | 0.37 | 0.21 | 0.69 |
| Sentences | 0.25 | 0.46 | 0.50 | 0.37 | 0.24 | 0.65 |
| Recursive | 0.25 | 0.38 | 0.46 | 0.34 | 0.19 | 0.66 |
| Recursive + headings | 0.25 | 0.38 | 0.46 | 0.35 | 0.20 | 0.66 |

What the numbers say:

- **Semantic search wins clearly.** With recursive chunking it puts the answer in the top 5 for 23 of 24 questions, against 11 for keyword search. On paraphrased questions the gap is widest: MRR 0.69 against 0.19. With recursive chunking, keyword search found nothing in the top 10 for 10 of the 12 paraphrased questions, such as "What happens if my card gets declined?", where the page says "If a payment fails".
- **Keyword search still has its place.** On questions that reuse the pages' words it reaches MRR 0.66 with no model at all. It also fails in a way semantic search does not: "How often is the bike **serviced**?" finds nothing, because BM25 here does not know that "serviced" and "service" are the same word. Stemming would fix that. Phase 6 combines both methods.
- **Structure-aware chunking beats fixed windows.** Fixed-size chunks were worst for semantic search (MRR 0.57 against 0.75), and put the right chunk first for only 10 of 24 questions. A fixed window often starts in one section and ends in the next, so its embedding is a blend of two topics.
- **Smaller, single-topic chunks help.** Recursive chunking makes 52 chunks of about 65 tokens, against 34 to 35 chunks of about 110 for the others, because it never crosses a heading. That costs more chunks to store and search, which is cheap here.
- **Adding headings helped questions that use the pages' words and hurt slightly on paraphrased ones.** Recall@3 rose from 0.83 to 0.88 and MRR on same-word questions from 0.88 to 0.94, but MRR on paraphrased ones fell from 0.69 to 0.65. Overall MRR is the same. With 24 questions, differences of one or two questions are within noise.
- **One question fails almost everywhere.** "Do you bring bikes to people living outside the city?" is answered by "Delivery to Millbrook or Saltmarsh costs €15", which never says "outside the city". Only fixed-size keyword search and sentence chunking found it, at rank 4 to 8. Bridging that gap takes knowledge the chunk does not contain, which is what query rewriting and contextual retrieval in phase 6 are for.

### Tokenizers

To decide whether phase 3's history budget should use a real tokenizer, I rebuilt 28 requests from the phase 3 eval runs and compared estimates with the input tokens the provider reported for them (`scripts/compare-tokenizers.ts`).

| Counter | Mean error | Mean absolute error | Worst |
| --- | --- | --- | --- |
| 4 characters per token (phase 3) | +3.1% | 3.3% | 6.7% |
| OpenAI o200k tokenizer | -8.6% | 8.6% | 9.8% |

The simple estimate is closer for the Nemotron models used in the evals than a real tokenizer from another model family, which undercounts every time. So the history budget keeps its estimate. A real tokenizer is used where it matters: chunk sizes are counted with the embedding model's own tokenizer, because that model cuts off anything after 256 tokens. No chunk in any strategy is cut off.

### The chat

This phase does not change how the chat answers: no prompt, route or history code changed. The core and history eval sets would send exactly the same requests, so they were not re-run. Phase 5 is the first to change answers with retrieval, and will measure them.

## What I learned

- **Measure retrieval before generation.** If the right chunk is not retrieved, no prompt can fix the answer. With a test set of passages, a chunking change is measured in seconds and for free, without a single chat model call.
- **A test set needs a fair definition of "right".** Relevance means "the chunk contains the whole passage". That is strict, so a unit test checks that every passage fits in some chunk for every strategy. Without it, a strategy that cut a passage in two would be marked down for something it could never get right.
- **Token counts are per model.** The tokenizer to trust is the one of the model that reads the text. For the chat models, that tokenizer is not available, and a character estimate is the better guess. For the embedding model it is, and it matters, because the model silently drops text past its limit.
- **Special tokens add up.** The first fixed-size chunks were a third of the size they should have been. Counting word by word added the tokenizer's two special tokens to every word. Counts that are summed must leave them out.
- **Questions and documents use different words.** That is the whole case for embeddings, and the case where keyword search failed most. It is also where embeddings still miss, when the link needs knowledge the text does not state.
- **Free can be enough.** A 90 MB model on the CPU embeds the whole corpus in under a second, and a search takes about 10 ms once the model is loaded.

## Known limits

- 24 questions on 8 pages is small. Differences of one or two questions between strategies may be noise.
- The relevance rule requires the exact passage. A chunk that answers in other words counts as wrong.
- Each question has exactly one right passage. Questions with answers spread over several chunks are not tested yet.
- The search endpoint loads the model on its first request, which takes a few seconds and about 90 MB of memory. A serverless deploy would pay that on every cold start.
- BM25 has no stemming, so "serviced" does not match "service".
- The vector store is a JSON file read into memory. That suits hundreds of chunks, not millions.
- `all-MiniLM-L6-v2` is small and English-only. A larger or multilingual model may rank differently.

## References

- Robertson and Zaragoza, [The Probabilistic Relevance Framework: BM25 and Beyond](https://www.staff.city.ac.uk/~sbrp622/papers/foundations_bm25_review.pdf), 2009
- Reimers and Gurevych, [Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks](https://arxiv.org/abs/1908.10084), 2019
- [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) and [Transformers.js](https://huggingface.co/docs/transformers.js)
- [Pinecone: Chunking strategies for LLM applications](https://www.pinecone.io/learn/chunking-strategies/)
- Anthropic, [Introducing Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval), 2024
- Malkov and Yashunin, [Efficient and robust approximate nearest neighbor search using HNSW graphs](https://arxiv.org/abs/1603.09320), 2016
