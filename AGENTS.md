# Repository Guidelines

## Project Structure & Module Organization
The Next.js client lives in `src`: routing/layout files sit in `src/app`, shared UI in `src/components`, and utilities/types in `src/lib`, while static assets belong in `public`. The Python PydanticAI agent is isolated in `agent/src` with its own `pyproject.toml` and `uv.lock`, and shell helpers in `scripts/` coordinate dual-runner workflows; keep new tests or fixtures beside the feature they cover (e.g., `src/components/Weather/Weather.test.tsx`).

## Build, Test, and Development Commands
`npm run dev` (or `pnpm dev`) launches the UI and agent together; `npm run dev:ui` and `npm run dev:agent` start only one side, with the latter invoking `uv run src/main.py`. Use `npm run dev:debug` for verbose logging, `npm run build` + `npm run start` for production checks, `npm run lint` for ESLint/TypeScript/Tailwind gates, and `npm run install:agent` whenever the Python dependencies change.

## Coding Style & Naming Conventions
Stick to 2-space indentation for TS/TSX, PascalCase for components (`CustomerPanel`), and camelCase for hooks or helpers (`useClientFilters`). Tailwind classes should remain grouped by concern (layout → spacing → color) to ease review. Python modules stay snake_case with entrypoints in `agent/src/main.py`. Treat linter warnings as defects—only disable a rule when the PR explains the exception.

## Testing Guidelines
We expect Vitest + React Testing Library coverage for UI work, placing `*.test.tsx` next to the component and naming tests after the behavior (`handles empty CRM state`). Agent logic should be exercised with pytest files under `agent/tests`, executed via `uv run pytest`. Before opening a PR, run `npm run lint`, the relevant Vitest/pytest suites, and a manual smoke test (`npm run dev`, confirm the CopilotKit sidebar connects to port 8000).

## Commit & Pull Request Guidelines
Commit subjects are short, present-tense summaries (`feat: add CRM weather widget`) with optional `Refs #id` lines in the body. PRs must explain the problem, the solution, user-visible impacts, and attach evidence (lint + test commands, screenshots, or terminal output). Call out any setup, port, or env-var adjustments in a dedicated note so agent operators can mirror the change immediately.

## Agent Setup Notes
Secrets live only in `agent/.env` (`OPENAI_API_KEY=...`). During agent-focused work you may run `uv run src/agent.py` directly, but keep `npm run dev` running so the Next.js client continues to proxy requests to port 8000 and you validate the full stack.
