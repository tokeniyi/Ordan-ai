<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules

- Read `docs/architecture.md` before adding code. Features live in `features/<name>/`, routes in `app/` stay thin, and every model call goes through `lib/ai/provider.ts`.
- All AI UI comes from shadcn/ui and its AI Elements patterns (https://ui.shadcn.com/docs/ai-elements). Add components with `npx shadcn@latest add <name>`; do not hand-write files in `components/ui/`.
- Each phase ends with a write-up in `docs/phases/`, started from `docs/phases/TEMPLATE.md`.
- Measure changes that affect answers with `pnpm eval` before and after (see `docs/evals.md`), and report the numbers in the phase write-up. Run `pnpm test` for logic that does not call a model.
