# Roadmap

Each phase adds one concept to the chat, measures what it changed, and ends with a write-up in [phases](phases). The order below is a suggestion. Later phases build on earlier ones, but the order can change.

| Phase | Topic                  | Concepts                                                                                                         | shadcn/ui AI patterns        |
| ----- | ---------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 0     | Foundation             | Streaming chat, message parts, model gateway                                                                     | Chat, Message, Reasoning     |
| 1     | Prompt engineering     | System prompts, few-shot examples, structured output, prompt versions, comparing prompts side by side            | Suggestion, Model Selector   |
| 2     | Conversation history   | Saving chats, a chat list, context window limits, trimming and summarizing old turns                             | Context, Checkpoint          |
| 3     | NLP pipeline           | Tokenization, chunking strategies, embeddings, vector stores, semantic search                                    |                              |
| 4     | Basic RAG              | Document ingestion, retrieval, grounding the answer in sources, citations                                        | Sources, Inline Citation     |
| 5     | Advanced RAG           | Hybrid search (keyword plus vector), reranking, query rewriting, HyDE, multi-query, contextual retrieval         | Chain of Thought             |
| 6     | Evaluation             | Test sets, retrieval metrics (recall@k, MRR), faithfulness and relevance, LLM as judge, regression runs          | Test Results                 |
| 7     | Cost and caching       | Token and cost tracking, prompt caching, semantic caching, latency budgets                                       | Context                      |
| 8     | Model routing          | Routing by task difficulty, fallbacks, comparing an own router with Kilo's auto models                           | Model Selector               |
| 9     | Tools and agents       | Tool calling, human approval, multi-step loops, planning                                                         | Tool, Confirmation, Plan, Task |
| 10    | Memory                 | Short-term summaries, long-term user memory, deciding what to remember and when to recall it                     |                              |
| 11    | Multi-agent systems    | Orchestrator and subagents, handoffs, agentic RAG                                                                | Subagent, Queue              |

## Other concepts worth adding

- **Guardrails.** Input and output checks, and defending against prompt injection in retrieved documents.
- **Observability.** Tracing every step of a request: prompt, retrieval, tool calls, tokens, latency.
- **Model Context Protocol (MCP).** Connecting external tools through a standard interface.
- **GraphRAG.** Retrieval over a knowledge graph instead of flat chunks.
- **Multimodal input.** Images and files in the prompt.
- **Fine-tuning and distillation.** When a smaller tuned model beats a bigger prompted one.

## Open questions

- **Embeddings.** The Kilo gateway's model list shows no embedding models, so phase 3 needs a decision on where embeddings come from.
- **Evaluation early.** Phase 6 could move before phase 4, so that every RAG change is measured from the start.
