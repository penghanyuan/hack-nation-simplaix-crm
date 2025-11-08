# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a CopilotKit + PydanticAI starter template for building AI agents. It combines:
- **Frontend**: Next.js 15 (React 19) with CopilotKit UI integration
- **Backend Agent**: PydanticAI agent running on FastAPI/Uvicorn (Python 3.12+)
- **Package Manager**: pnpm (recommended), though npm/yarn/bun are supported

The architecture uses CopilotKit to provide a chat sidebar interface that communicates with a PydanticAI agent via HTTP. The agent manages shared state and provides tools for the UI to interact with.

## Development Commands

### Setup
```bash
# Install all dependencies (includes Python agent setup via postinstall)
pnpm install

# Manual agent setup if needed
pnpm run install:agent
```

### Running the Application
```bash
# Start both UI and agent servers concurrently (most common)
pnpm dev

# Start with debug logging
pnpm run dev:debug

# Start only the Next.js UI (port 3000)
pnpm run dev:ui

# Start only the PydanticAI agent (port 8000)
pnpm run dev:agent
```

### Build & Lint
```bash
# Build Next.js for production
pnpm build

# Run production server
pnpm start

# Lint code
pnpm lint
```

### Agent-Specific Commands
```bash
# From the agent/ directory
cd agent

# Sync Python dependencies
uv sync

# Run agent directly
uv run src/main.py
```

## Architecture

### Frontend-Agent Communication Flow

1. **Next.js UI** (src/app/page.tsx) → renders CopilotSidebar component
2. **CopilotRuntime API** (src/app/api/copilotkit/route.ts) → proxies requests to the Python agent
3. **PydanticAI Agent** (agent/src/agent.py) → runs on port 8000, handles tool calls and state management
4. **AG-UI Integration** (agent/src/main.py) → exposes agent via FastAPI

### Key Integration Points

**CopilotKit Runtime Configuration** (src/app/api/copilotkit/route.ts):
- Uses `HttpAgent` to connect to `http://localhost:8000/`
- Agent name: `my_agent`
- Uses `ExperimentalEmptyAdapter` since there's only one agent

**Shared State Management**:
- TypeScript type: `AgentState` (src/lib/types.ts)
- Python model: `ProverbsState` (agent/src/agent.py)
- **CRITICAL**: These must stay in sync. When modifying state structure, update both files.

### Frontend Action Patterns

**Frontend Tools** (executed in browser):
```typescript
useCopilotAction({
  name: "setThemeColor",
  handler({ themeColor }) { /* local state update */ }
})
```

**Generative UI** (render UI from agent actions):
```typescript
useCopilotAction({
  name: "get_weather",
  available: "disabled", // prevents direct user calls
  render: ({ args }) => <WeatherCard location={args.location} />
})
```

**Human-in-the-Loop** (requires user confirmation):
```typescript
useCopilotAction({
  name: "go_to_moon",
  renderAndWaitForResponse: ({ respond, status }) =>
    <MoonCard respond={respond} status={status} />
})
```

### Agent Tool Patterns

**Read-only tools**:
```python
@agent.tool
def get_proverbs(ctx: RunContext[StateDeps[ProverbsState]]) -> list[str]:
    return ctx.deps.state.proverbs
```

**State mutation tools** (must return `StateSnapshotEvent`):
```python
@agent.tool
async def add_proverbs(ctx: RunContext[StateDeps[ProverbsState]], proverbs: list[str]) -> StateSnapshotEvent:
    ctx.deps.state.proverbs.extend(proverbs)
    return StateSnapshotEvent(
        type=EventType.STATE_SNAPSHOT,
        snapshot=ctx.deps.state,
    )
```

## Environment Configuration

**Agent Environment** (agent/.env):
```
OPENAI_API_KEY=sk-...
```

This is required for the PydanticAI agent to function. The agent uses `gpt-4.1-mini` by default.

## File Structure Conventions

- `src/app/page.tsx` - Main UI page with CopilotSidebar
- `src/app/api/copilotkit/route.ts` - CopilotKit runtime endpoint
- `src/components/` - React components (cards for weather, moon, proverbs)
- `src/lib/types.ts` - TypeScript type definitions (must match Python state models)
- `agent/src/agent.py` - PydanticAI agent definition, tools, and state models
- `agent/src/main.py` - FastAPI server entry point
- `scripts/` - Platform-specific setup/run scripts (.sh for Unix, .bat for Windows)

## Important Notes

- The agent runs on port 8000, UI on port 3000
- State synchronization happens automatically when agent tools return `StateSnapshotEvent`
- Frontend actions with `available: "disabled"` can only be triggered by the agent, not directly by users
- The `useCoAgent` hook provides bidirectional state sync between frontend and agent
- Path alias `@/*` maps to `./src/*`
