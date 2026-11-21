# Roadmap and progress

What has been built, what it showed, and what comes next. Each phase adds one concept to the chat, measures what it changed, and ends with a write-up in [phases](phases). The order of later phases is a suggestion. Later phases build on earlier ones, but the order can change.

Phases 0 to 5 are done. Phase 6 is next.

## At a glance

| Phase | Topic                  | Status      | Concepts                                                                                                         | shadcn/ui AI patterns          |
| ----- | ---------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 0     | Foundation             | Done        | Streaming chat, message parts, model gateway                                                                     | Chat, Message, Reasoning       |
| 1     | Prompt engineering     | Done        | System prompts, few-shot examples, structured output, prompt versions, comparing prompts side by side            | Suggestion, Model Selector     |
| 2     | Evaluation             | Done        | Test sets, deterministic checks, LLM as judge, regression runs, cost and latency per run                         | Test Results                   |
| 3     | Conversation history   | Done        | Saving chats, a chat list, context window limits, trimming and summarizing old turns                             | Context, Checkpoint            |
| 4     | NLP pipeline           | Done        | Tokenization, chunking strategies, embeddings, vector stores, semantic search                                    |                                |
| 5     | Basic RAG              | Done        | Document ingestion, retrieval, grounding the answer in sources, citations, retrieval metrics (recall@k, MRR), faithfulness | Sources, Inline Citation |
| 6     | Advanced RAG           | Next        | Hybrid search (keyword plus vector), reranking, query rewriting, HyDE, multi-query, contextual retrieval         | Chain of Thought               |
| 7     | Cost and caching       | Planned     | Token and cost tracking, prompt caching, semantic caching, latency budgets                                       | Context                        |
| 8     | Model routing          | Planned     | Routing by task difficulty, fallbacks, comparing an own router with Kilo's auto models                           | Model Selector                 |
| 9     | Tools and agents       | Planned     | Tool calling, human approval, multi-step loops, planning                                                         | Tool, Confirmation, Plan, Task |
| 10    | Memory                 | Planned     | Short-term summaries, long-term user memory, deciding what to remember and when to recall it                     |                                |
| 11    | Multi-agent systems    | Planned     | Orchestrator and subagents, handoffs, agentic RAG                                                                | Subagent, Queue                |

Evaluation was moved forward to phase 2, so every later phase can report measured results. Each later phase adds the test cases and metrics it needs to the eval framework.

## What is done

### Phase 0: Foundation

A streaming chat on the Kilo AI Gateway, built from the shadcn/ui chatbot template. Replies are typed parts (text and reasoning), the model can be picked, and each reply can be copied or retried. Every model call goes through `lib/ai/provider.ts`. [Write-up](phases/phase-00-foundation.md)

### Phase 1: Prompt engineering

A versioned prompt library in `features/prompts/` with four prompts: baseline (zero-shot), structured (the default), few-shot tutor and step by step. A prompt picker in the chat, a `/compare` page that sends one message to two prompts side by side, and follow-up questions generated as structured output. [Write-up](phases/phase-01-prompt-engineering.md)

### Phase 2: Evaluation

An eval framework in `features/evals/`: a 20-case core test set, deterministic checks, an LLM judge with a rubric, a cache, and a runner that stops at the rate limit. `pnpm eval` saves runs to `evals/results/` and `/evals` shows them. Vitest and Playwright tests run in CI.

Result: structured matched baseline on quality (20/20) with 46% fewer output tokens, so it stayed the default. Few-shot failed 7 cases by using its tutor format on one-line questions. [Write-up](phases/phase-02-evaluation.md)

### Phase 3: Conversation history

Chats are saved in the browser and listed in a sidebar at `/chat/<id>`. The chat route fits the history into a 4,000-token budget with one of three strategies (full, sliding window or rolling summary), in `features/history/`. A Context indicator shows the budget used and the tokens of each reply, and Checkpoint markers show where the model's view begins and let you restore an earlier point. The eval framework gained multi-turn cases and an 8-case `history` test set.

Result: the summary strategy answered 8 of 8 with 45% fewer input tokens than the full history. The window answered 3 of 8, because it forgot facts from the first turn, but it said so instead of making them up. Over a simulated 40-turn chat, both used about 39% fewer tokens than the full history. [Write-up](phases/phase-03-conversation-history.md)

### Phase 4: NLP pipeline

A made-up help centre of 8 pages (`data/corpus/kestrel/`), four chunking strategies (fixed size, sentences, recursive, recursive with headings), local embeddings with `all-MiniLM-L6-v2` through Transformers.js, an in-memory vector store, BM25 keyword search, and a `/search` page that shows both methods side by side, in `features/search/`. `pnpm index` builds the committed index files, and `pnpm eval:retrieval` measures recall@k and MRR on 24 questions.

Result: semantic search with recursive chunking found the answer in the top 5 for 23 of 24 questions (MRR 0.75), against 11 for keyword search (MRR 0.34). Fixed-size chunks were the worst for semantic search (MRR 0.57), because a window often mixes two sections. A character estimate of tokens turned out closer to the chat models' real counts (3% off) than OpenAI's tokenizer (9% off), so the history budget keeps it. [Write-up](phases/phase-04-nlp-pipeline.md)

### Phase 5: Basic RAG

The chat can answer from the Kestrel help centre, picked with a Knowledge picker. The route retrieves the 4 closest chunks for the newest question, adds them to the system prompt with instructions to cite them and to say when they do not cover the question, and sends them to the browser, which shows inline citations and a sources list, in `features/rag/`. The eval framework gained a 20-case `rag` test set, a `--knowledge` option to ask it with or without sources, a faithfulness score from the judge, and retrieval and citation results per case.

Result: without sources, 0 of 20 passed and the model borrowed figures from other companies. With sources, 18 of 20 passed, with faithfulness 5.0 and no invalid citations, and all 4 questions the help centre does not cover were answered with "not covered". Both failures were retrieval misses: a question worded far from its passage, and a follow-up whose search did not see the turn before. [Write-up](phases/phase-05-basic-rag.md)

## What is next

### Phase 6: Advanced RAG

Improve retrieval, which phase 5 showed is the limit: the model used every passage it was given correctly, and both failures came from passages it was never given. Start with the two failures in the `rag` set: query rewriting from the conversation for follow-ups (searching with the previous question added moved the missing passage to rank 2), and HyDE or multi-query for questions worded far from the page. Then hybrid search (BM25 plus vectors) and reranking. Grow the retrieval and `rag` test sets first, because 20 and 24 cases cannot separate techniques that differ by one or two questions.

### Phases 7 to 11

See the table above. Each phase's write-up will list what it builds.

## Backlog

Follow-ups found in earlier phases that no phase has taken on yet. Pick them up when a phase touches the same code, or as small changes of their own.

### Product

- **Authentication and rate limiting.** `/api/chat` and `/api/suggestions` are public and spend credits on every request. Both are needed before a public deploy. (Phase 0)
- **Server-side chat storage.** Chats live in one browser's localStorage, so they are lost when site data is cleared and do not sync between devices. Needs accounts first. (Phase 3)
- **Chat titles from a model.** Titles are the first message, cut to 60 characters. A short generated title would read better. (Phase 3)
- **Confirm before restoring a checkpoint.** "Restore to here" deletes later messages with one click and has no undo. (Phase 3)
- **Search and rename in the chat list.** (Phase 3)
- **Keep conversations on the compare page.** It forgets them on reload, unlike the chat. (Phase 1)
- **Edit prompts in the browser.** Prompts live in code. (Phase 1)
- **Show summarizing as a step.** The summary call delays the first token with no explanation on screen. A Trace step such as "Summarizing earlier messages" would show why. (Phase 3)

### Evaluation

- **Harder core cases.** Three of four prompts pass almost every core case, so the core set cannot separate good prompts from great ones. Task-specific sets, like the RAG sets in phases 5 and 6, are the plan. (Phase 2)
- **Repeat runs.** Each case runs once per prompt, so small differences may be noise. Running each case several times and reporting the spread would show how much. (Phase 2)
- **Check the judge against people.** The judge's scores have not been compared with human ratings, and it was seen to be lenient. (Phase 2)
- **A multi-turn cost eval.** The history test set scores only the final answer. An eval that plays a whole conversation would measure cost over a chat, not only memory. (Phase 3)
- **Run every prompt on the history set.** Phase 3 ran only the structured prompt, to stay inside the free tier's hourly limit. (Phase 3)

### History

- **Real token counts for the chat models.** Phase 4 measured the four-characters estimate at 3% off the provider's counts on the eval requests, closer than OpenAI's tokenizer. A model's own tokenizer would be better still, where one is published. (Phases 3 and 4)
- **A budget per model.** The budget is the same for every model, because Kilo's auto models route to models with different context windows. Phase 8 may make the real limit known. (Phase 3)

### Search

- **Stemming for keyword search.** BM25 does not match "serviced" with "service". A stemmer would fix that. (Phase 4)
- **Questions with spread-out answers.** Every retrieval question has one passage. Questions that need two chunks would test whether k is large enough. (Phase 4)
- **A bigger retrieval test set.** 24 questions cannot separate strategies that differ by one or two questions. (Phase 4)
- **Model load time.** `/api/search` loads the embedding model on its first request, a few seconds and about 90 MB of memory. Loading it at server start, or a hosted embedding model, would avoid that. (Phase 4)
- **Decide when to search.** With the Kestrel help centre on, every message is searched, even "thanks". (Phase 5)
- **Test the faithfulness judge.** Every phase 5 answer scored 5, so it is not known whether the judge catches an unsupported claim. A few deliberately unfaithful answers would show it. (Phase 5)
- **More than one knowledge base.** The RAG instructions describe Kestrel. A second corpus needs its own description, and the picker would list it. (Phase 5)
- **A real vector database.** The index is a JSON file read into memory, which suits hundreds of chunks. A vector database with an approximate index is needed for more. (Phase 4)

## Other concepts worth adding

- **Guardrails.** Input and output checks, and defending against prompt injection in retrieved documents.
- **Observability.** Tracing every step of a request: prompt, retrieval, tool calls, tokens, latency.
- **Model Context Protocol (MCP).** Connecting external tools through a standard interface.
- **GraphRAG.** Retrieval over a knowledge graph instead of flat chunks.
- **Multimodal input.** Images and files in the prompt.
- **Fine-tuning and distillation.** When a smaller tuned model beats a bigger prompted one.

## Open questions

- **Hosted embeddings.** Phase 4 runs `all-MiniLM-L6-v2` locally, because the gateway's `/embeddings` endpoint only offers paid models such as `openai/text-embedding-3-small`. A larger hosted model may retrieve better. Comparing the two needs credits.
- **Free-tier limits.** Kilo allows 200 free-model requests an hour per IP address, shared by the app and the evals. Larger eval sets, or running every prompt on every set, will need paid models or runs spread over several hours.
