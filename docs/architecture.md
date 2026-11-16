# Architecture

Ordan AI is one Next.js app. The code is split so that each AI concept lives in its own folder and plugs into the chat at one known place.

## Layout

```
app/
  api/chat/route.ts     The chat endpoint. Validates the request, calls the model, streams the reply.
  layout.tsx, page.tsx  The shell and the chat page.
components/
  ui/                   shadcn/ui components. Added with the CLI, not written by hand.
features/
  chat/
    components/         The chat thread, prompt form, model picker, message actions.
    components/parts/   One component per message part type: text, reasoning.
    prompt.ts           The system prompt.
    types.ts            The message types shared by the route and the UI.
lib/
  ai/provider.ts        The Kilo AI Gateway client. The only file that knows the provider.
  ai/models.ts          The models the picker offers and the route accepts.
docs/                   This folder.
```

## How a message flows

1. `features/chat/components/chat.tsx` sends the messages and the chosen model to `/api/chat` with `useChat`.
2. `app/api/chat/route.ts` checks the model against `lib/ai/models.ts`, validates the messages, and calls `streamText` with the model from `lib/ai/provider.ts` and the prompt from `features/chat/prompt.ts`.
3. The reply streams back as typed parts. `chat-message.tsx` switches on the part type and renders each one with a component from `components/parts/`.

## Rules

- **Routes stay thin.** Files in `app/` wire things together. Logic lives in `features/` or `lib/`.
- **One feature, one folder.** A feature keeps its components, server code, types and tests together in `features/<name>/`. Features import from `lib/` and `components/ui/`, not from each other's internals.
- **One provider file.** Every model call goes through `lib/ai/provider.ts`, so routing, caching and cost tracking can be added in one place.
- **All AI UI comes from shadcn/ui.** Use the [AI Elements](https://ui.shadcn.com/docs/ai-elements) patterns (Chat, Message, Reasoning, Tool, Sources, Plan and so on) and the components they build on. Add components with `npx shadcn@latest add <name>`.

## Adding a feature

1. Create `features/<name>/` with its own code. Server-only logic should be plain functions that can be run and tested without the UI.
2. Connect it to the chat in `app/api/chat/route.ts`, for example by adding retrieved context to the prompt or by adding a tool.
3. If it streams a new kind of part, add a component in `features/chat/components/parts/` and a case in `chat-message.tsx`.
4. Write it up in `docs/phases/`.

Because each feature connects at one place, turning it off is a one-line change, which makes it easy to find which feature caused a problem.

## Environment

| Variable        | Required | Purpose                                                    |
| --------------- | -------- | ---------------------------------------------------------- |
| `KILO_API_KEY`  | Yes      | Kilo AI Gateway API key.                                   |
| `KILO_BASE_URL` | No       | Overrides the gateway URL. Defaults to the public gateway. |
