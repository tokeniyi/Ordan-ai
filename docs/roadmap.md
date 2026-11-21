# Roadmap and progress

What has been built, what it showed, and what comes next. Each phase adds one concept to the chat, measures what it changed, and ends with a write-up in [phases](phases). The order of later phases is a suggestion. Later phases build on earlier ones, but the order can change.

Phases 0 to 3 are done. Phase 4 is next.

## At a glance

| Phase | Topic                  | Status      | Concepts                                                                                                         | shadcn/ui AI patterns          |
| ----- | ---------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 0     | Foundation             | Done        | Streaming chat, message parts, model gateway                                                                     | Chat, Message, Reasoning       |
| 1     | Prompt engineering     | Done        | System prompts, few-shot examples, structured output, prompt versions, comparing prompts side by side            | Suggestion, Model Selector     |
| 2     | Evaluation             | Done        | Test sets, deterministic checks, LLM as judge, regression runs, cost and latency per run                         | Test Results                   |
| 3     | Conversation history   | Done        | Saving chats, a chat list, context window limits, trimming and summarizing old turns                             | Context, Checkpoint            |
| 4     | NLP pipeline           | Next        | Tokenization, chunking strategies, embeddings, vector stores, semantic search                                    |                                |
| 5     | Basic RAG              | Planned     | Document ingestion, retrieval, grounding the answer in sources, citations, retrieval metrics (recall@k, MRR), faithfulness | Sources, Inline Citation |
| 6     | Advanced RAG           | Planned     | Hybrid search (keyword plus vector), reranking, query rewriting, HyDE, multi-query, contextual retrieval         | Chain of Thought               |
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

## What is next

### Phase 4: NLP pipeline

The groundwork for RAG, with no change yet to how the chat answers:

- **Tokenization:** count tokens with a real tokenizer instead of the four-characters estimate from phase 3, and compare the two.
- **Chunking:** split documents by fixed size, by sentence and paragraph, and recursively by structure, with overlap. Compare the strategies.
- **Embeddings:** turn chunks into vectors. Where they come from is still open, see below.
- **Vector store:** store vectors and search them by cosine similarity, starting in memory.
- **Semantic search:** a search page over a sample document set, and a retrieval test set with recall@k and MRR, so phase 5 can start from measured retrieval.

### Phases 5 to 11

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

- **Real token counts.** Phase 3 estimates tokens at four characters each, which can be 20% off or more for code and other languages. Phase 4 adds a tokenizer. (Phase 3)
- **A budget per model.** The budget is the same for every model, because Kilo's auto models route to models with different context windows. Phase 8 may make the real limit known. (Phase 3)

## Other concepts worth adding

- **Guardrails.** Input and output checks, and defending against prompt injection in retrieved documents.
- **Observability.** Tracing every step of a request: prompt, retrieval, tool calls, tokens, latency.
- **Model Context Protocol (MCP).** Connecting external tools through a standard interface.
- **GraphRAG.** Retrieval over a knowledge graph instead of flat chunks.
- **Multimodal input.** Images and files in the prompt.
- **Fine-tuning and distillation.** When a smaller tuned model beats a bigger prompted one.

## Open questions

- **Embeddings.** The Kilo gateway lists no embedding models, but its `/embeddings` endpoint accepts paid ones such as `openai/text-embedding-3-small`, which need credits. The free alternative is a small model run locally, such as `all-MiniLM-L6-v2` with Transformers.js, which downloads its weights from Hugging Face on first use. Phase 4 decides.
- **Free-tier limits.** Kilo allows 200 free-model requests an hour per IP address, shared by the app and the evals. Larger eval sets, or running every prompt on every set, will need paid models or runs spread over several hours.
