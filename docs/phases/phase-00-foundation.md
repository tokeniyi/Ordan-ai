# Phase 0: Foundation

**Status:** Done

## Goal

A working chat to use as the test bench for every later phase: send a message, pick a model, watch the reply stream.

## Concepts

- **Streaming.** The reply arrives token by token over server-sent events, so the first words show within a second or two.
- **Message parts.** A reply is a list of typed parts, not one string. Text and reasoning are the two parts so far. Tool calls and sources will be added as parts in later phases.
- **Model gateway.** One API and one key give access to many models. The app calls the Kilo AI Gateway, which is OpenAI-compatible.

## What was built

- The chat UI in `features/chat/`, started from the [shadcn/ui chatbot template](https://github.com/shadcn-ui/chatbot-template) and built on shadcn/ui's Message Scroller, Message, Bubble, Trace, Code Block and Typeset.
- The chat endpoint in `app/api/chat/route.ts`. It validates the request, limits models to the list in `lib/ai/models.ts`, and caps output tokens.
- The Kilo provider in `lib/ai/provider.ts`, using `@ai-sdk/openai-compatible`. This package was chosen over `@ai-sdk/openai` because it passes the model's reasoning through to the UI.
- The system prompt in `features/chat/prompt.ts`.

The template's tools (web search, GitHub lookup, clarifying questions) were left out. Tool calling is its own phase.

## Results

Checked by hand: the chat streams text and reasoning from `kilo-auto/free`, renders markdown tables and highlighted code, and copy, retry, stop and the model picker work. There are no automated tests yet.

## Known limits

- Conversations are lost on reload. Nothing is saved.
- The endpoint has no authentication or rate limit. Add both before deploying it publicly.

## References

- [shadcn/ui AI Elements](https://ui.shadcn.com/docs/ai-elements)
- [AI SDK](https://ai-sdk.dev)
- [Kilo AI Gateway](https://kilo.ai/docs/gateway)
