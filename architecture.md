# Architecture

## Overview

Reflectly is a local-first Electron desktop application designed to support clinical psychology research. It works as a structured reflective dialogue partner — processing user messages through a multi-stage reasoning pipeline that combines memory retrieval, therapeutic reasoning, curated resource selection, and continuous safety monitoring.

The app is not a general-purpose chatbot. It is a reasoning environment built around how therapeutic conversations work: they have stages, they draw on memory, they use resources selectively, and they must never cause harm.

---

## Design Philosophy

The platform is built around three core principles:

1. **Local-first**: All data stays on-disk in a user-selected workspace folder. No cloud sync, no account required.
2. **Research instrument**: Every exchange is logged, retrievable, and analyzable. The infrastructure exists to support longitudinal clinical research.
3. **Safety as constraint**: The safety gate runs parallel to all reasoning and can override any stage's output at any time.

---

## Application Layers

### Desktop Runtime (Electron)

The app runs as a standard Electron desktop application. The main process owns all filesystem access, database operations, and LLM provider calls. The renderer handles UI only and communicates with the main process through a typed preload bridge.

```
Renderer (React UI)
    ↕ IPC (preload bridge)
Main Process (Node.js)
    ↕ filesystem / SQLite / provider API
Workspace Folder (user-selected)
```

### Workspace Model

A workspace is any local folder the user selects. Reflectly adds only its own bootstrap files (SQLite database, migration metadata, config) and does not mutate existing user content.

The app remembers the last opened workspace and restores it on startup. If the folder is missing or inaccessible, the app prompts for folder selection before continuing.

### Database Schema

SQLite is used for all persistent storage within the workspace. The schema covers:

- **sessions**: The top-level unit of a reflective conversation
- **messages**: The ordered transcript for each session
- **memory_chunks**: Compact text artifacts derived from exchanges, stored with embeddings for retrieval
- **session_summaries**: One rolling summary per session, updated after each exchange
- **stage1_parse_outputs**: Structured Stage 1 extraction results per user message
- **stage1_clarification_requests**: Pending clarification questions
- **safety_events**: Safety gate decisions and crisis interrupts
- **message_agent_activities**: Records of what the reasoning pipeline did during each turn
- **stage3_reasoning_outputs**: Structured Stage 3 reasoning packets (future milestone)

---

## The Multi-Stage Reasoning Pipeline

Every user message passes through a structured pipeline before a response is generated. The pipeline has distinct stages with defined responsibilities and outputs.

### Stage 1 — Parse & Decompose

Extracts structured information from the raw user message. This stage produces:

- Detected emotional tone and valence
- Expressed vs. underlying intent
- Key entities (people, events, relationships mentioned)
- Session goal inference
- Urgency and risk markers

The output is a structured JSON packet consumed by all downstream stages. This stage may also determine that clarification is needed before proceeding — if important context is ambiguous or missing, Stage 1 requests a clarification question instead of proceeding.

### Clarification Branch

When Stage 1 detects context gaps that would materially affect downstream reasoning, the pipeline stops and asks a clarification question. The user can answer with free text, a choice selection, or a scale rating. After the answer, Stage 1 runs again before proceeding. A maximum of two clarification loops are allowed per session segment to avoid interrogation.

### Safety Gate — Always On, Running Parallel

The safety gate monitors Stage 1 risk markers immediately after extraction. It runs parallel to all reasoning, not after it.

**Hard interrupt** (stops the pipeline immediately):
- Suicidal ideation or self-harm language
- Intent to harm others
- High or critical severity risk markers

**Supportive notice** (logs and continues):
- Medium acute distress or abuse signals

When a hard interrupt triggers, a fixed supportive message is persisted to the transcript and the pipeline stops. No memory retrieval, reasoning, or normal generation occurs for that turn.

### Stage 2 — Memory Retrieval

Using the Stage 1 extraction, the system queries the local memory layer to find relevant prior context:

- Prior sessions touching the same themes
- Recurring cognitive patterns
- Past goals and their status
- Named entities (people, relationships) the user has discussed before

Memory retrieval is semantic — it uses vector embeddings to find the most relevant chunks. If embedding is not yet configured, this stage is skipped and generation proceeds with the transcript alone.

### Stage 3 — Reasoning Engine

The core clinical reasoning step. Given the current message, retrieved memory, and session history, this stage produces a structured reasoning packet:

- Which therapeutic support mode fits (reflective, practical, psychoeducation, grounding, values, problem-solving, supportive)
- The depth level for the response (light, moderate, deep)
- The therapeutic goal for this specific response
- An emotional hypothesis with evidence and confidence
- A response plan with opening move, key points, and things to avoid
- Safety notes for this turn

Stage 3 output is internal only and guides Stage 5 response synthesis. If Stage 3 fails, a deterministic fallback is used and generation continues — the pipeline never fails solely because of a reasoning stage failure.

### Stage 4 — Curated Resource Tooling

Before the response is synthesized, the system evaluates whether a local curated resource would help. Resources include:

- Grounding exercises for acute distress or overwhelm
- Values and reflection prompts when the user is stuck
- Between-session practice suggestions when a session is closing
- Psychoeducation content relevant to the current topic

Selection is rule-based. A maximum of one or two resources is selected to avoid crowding out the user's message.

### Stage 5 — Response Synthesis

All outputs from stages 1–4 feed into the final response generation. The synthesis follows a structured therapeutic voice:

1. **Empathic reflection first** — acknowledge what was said before anything else
2. **Psychoeducation or reframing** — only if it directly serves the response goal
3. **Concrete next step or question** — guided by the Stage 3 reasoning goal

The format is structured, not prose. It can include embedded resource references.

### Stage 6 — Memory Write-Back

After the response has been streamed to the user (asynchronous, non-blocking), the system writes memory artifacts:

1. Derive turn-level memory chunks from the exchange
2. Generate embeddings for new artifacts (if configured)
3. Insert memory chunk rows
4. Insert or update the rolling session summary
5. Update entity tracking (people, relationships, events mentioned)
6. Write audit and agent activity records

---

## Session Lifecycle

```
opening → working → closing → completed
```

1. **Session Start**: User opens or creates a session. A session record is created in SQLite.
2. **Intention Setting**: Optionally, the user sets a stated intention for the session ("what would feel useful to focus on today?").
3. **Exchange Loop**: For each user message, the pipeline runs stages 1–6 with the safety gate monitoring continuously.
4. **Session Close**: When the user ends the session, a final summary is written, session status is updated, and any remaining write-back tasks complete.

---

## Data Flow

### Normal Message Flow

```
1. User sends message
2. Main process persists user message immediately
3. Main process loads recent transcript context
4. Stage 1 parses and extracts structured data
5. Safety gate evaluates risk markers
   - If crisis interrupt → persist fixed safety message, stop
   - If clarification needed → persist clarification question, stop
   - Otherwise → continue
6. Memory retrieval (if configured)
7. Stage 3 reasoning produces guidance packet
8. Assistant reply streams to renderer
9. Main process persists assistant message
10. Memory write-back runs asynchronously
```

### Key Guarantees

- **User message persistence**: User messages are persisted immediately, before any generation begins. If generation fails, the user message is never removed or corrupted.
- **Memory write-back isolation**: Memory write-back must never delete or rewrite existing transcript data. If write-back fails, the exchange remains intact.
- **Safety gate precedence**: The safety gate runs alongside all reasoning stages. A crisis signal should never wait for a response to be fully synthesized before being handled.

---

## Memory System

### Three Layers

**Transcript Layer**: The `messages` table is the source of truth for the literal conversation. All exchanges are stored verbatim.

**Memory Chunk Layer**: Compact artifacts derived from exchanges. Stored with embeddings for semantic retrieval. Multiple chunk kinds exist — turn-level summaries, session-level summaries, thematic extractions.

**Session Summary Layer**: One rolling summary per session, refreshed after each completed exchange. Supports quick session preview and retrieval without re-reading the full transcript.

### Retrieval Failure Behavior

- If embedding configuration is missing, semantic retrieval is skipped entirely
- If retrieval fails, transcript-only generation continues without blocking
- If write-back fails, the exchange is logged but not removed

---

## Research Infrastructure

The platform is designed to support longitudinal clinical research. Every session and exchange produces structured data:

- **Turn-level records**: Each exchange stored with Stage 1 extraction and Stage 3 reasoning output
- **Session summaries**: One durable summary per session, updated incrementally
- **Safety events**: Any safety gate triggers logged with severity and action taken
- **Agent activity traces**: Pipeline step records for debugging and analysis
- **Memory artifacts**: Retrievable context for future sessions

---

## Tech Stack

- **Desktop runtime**: Electron
- **Frontend**: React with TypeScript
- **Build tooling**: electron-vite
- **Storage**: Local SQLite per workspace
- **LLM integration**: OpenAI-compatible adapter; supports Google, Claude, OpenRouter, Ollama, and any OpenAI-compatible endpoint
- **Vector search**: SQLite vector extension (local, no cloud dependency)

---

## Key Design Decisions

### Safety Gate Parallelism

The safety gate runs alongside all reasoning stages, not after them. It can interrupt at any point. A crisis signal should never wait for a response to be fully synthesized before being handled.

### Memory Before Generation

Memory retrieval happens before the assistant reply is generated. This gives the model context informed by prior exchanges, not just the current message.

### Transcript as Source of Truth

The conversation transcript is never rewritten by memory operations. Memory artifacts are derived and stored separately. If memory write-back fails, the transcript remains intact.

### Workspace-First Local Storage

The user-selected folder is the boundary of all data. This makes the app entirely local, portable, and under user control. No account, no sync, no server.
