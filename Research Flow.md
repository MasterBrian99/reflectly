# Research Flow

## Overview

Reflectly is a research instrument for clinical psychology validation. Every user interaction produces structured data that can be analyzed to understand reasoning patterns, therapeutic modality effectiveness, and longitudinal outcomes. This document describes how data moves through the system from a research methodology perspective — not how the code works technically.

The core research question this platform was built to address is: **can a structured multi-stage reasoning pipeline produce therapeutically valid responses that support reflective practice in a clinical research context?**

---

## Research Context

The researcher is a student in clinical psychology who needed a tool to validate and reason through their own clinical research. The platform is not a product — it is a structured environment for studying how AI can support reflective dialogue in a research setting.

The platform is explicitly **not** intended for general use or as a replacement for professional mental health support. The warning in the README and at launch makes this clear.

---

## Research Data Collection Architecture

Every session produces data at multiple levels of granularity. These layers are designed to work together to support both within-session analysis and cross-session longitudinal research.

### Session Level

Each session is a bounded reflective dialogue with a beginning and an end. Sessions are the top-level research unit. The session record captures:

- Session start and end timestamps
- Stated session intention (if the user sets one)
- Session status: opening → working → closing → completed
- Aggregate risk score (highest safety marker severity across all turns)
- Therapeutic modality selected by Stage 3 (if applicable)
- Turn count

### Turn Level

A turn is a single exchange: one user message and one assistant response. Each turn produces:

- The raw user message
- The Stage 1 structured extraction (tone, intent, entities, risk markers, goal inference)
- The Stage 3 reasoning output (support mode, depth, emotional hypothesis, response plan)
- Safety gate decision (proceed, supportive notice, crisis interrupt)
- Any clarification exchanges
- Agent activity trace (what the pipeline did at each step)

### Memory Artifacts

After each successful exchange, the system writes compact memory artifacts:

- Turn-level chunks summarizing the exchange
- Session-level summaries updated incrementally
- Entity records for people, relationships, and events mentioned
- Theme tags extracted for longitudinal pattern detection

### Safety Events

Any safety gate trigger — from low-level supportive notices to hard crisis interrupts — is recorded with:

- Risk type and severity
- The evidence text that triggered it
- Action taken
- Link back to the source message and session

---

## Research Session Flow

This section describes how a research session progresses through the system, using the example message: **"I've been feeling really anxious lately and I don't know why."**

### Stage 0 — Session Opening

The user opens or creates a session. At this point the session is in `opening` state. The user may optionally set a session intention: "what would feel useful to focus on today?"

This intention is embedded and stored. It serves two research purposes: it gives the researcher visibility into what users want to focus on, and it provides Stage 3 with high-signal context about the session direction.

### Stage 1 — Parse & Decompose

The user message enters Stage 1. The parsing stage extracts structured information from the raw text:

**What gets extracted:**

- **Tone**: "anxious" signals negative valence with moderate arousal
- **Intent**: The user wants to understand and process their anxiety — help-seeking, not problem-solving
- **Entities**: No specific people or events mentioned yet
- **Goal inference**: Self-understanding, insight into cause
- **Risk markers**: Low-level anxiety language present but no acute risk signals

Stage 1 also calculates a **clarification score**. If context gaps are detected that would materially change downstream reasoning, Stage 1 requests a clarification question instead of proceeding. The clarification question types are:

- **Open**: "What kind of anxious are you feeling?" — for genuine unknowns
- **Choice**: "Are you looking to explore this or find concrete strategies?" — for bounded options
- **Scale**: "How much is this affecting your day-to-day right now?" — for intensity calibration

In the example "I've been feeling really anxious lately and I don't know why," Stage 1 proceeds directly — the intent is clear even without knowing the cause, and no acute risk markers are present.

**Research output:** A `stage1_parse_outputs` record with the extracted structured data. This record is permanent and queryable. The researcher can analyze: what intents appear most frequently, what tones co-occur with certain risk markers, how often clarification is triggered and by what question types.

### Safety Gate — Parallel Evaluation

Immediately after Stage 1, the safety gate evaluates risk markers in parallel — not sequentially after extraction. This is a critical design decision for research: safety happens at the same time as reasoning, not after it.

The safety gate has three possible outcomes:

**Proceed**: No high-risk markers detected. The pipeline continues normally.

**Supportive notice**: Medium-severity acute distress or abuse signals detected. The event is logged, but the pipeline continues. This enables later research analysis on how often supportive notices occur and what triggers them.

**Crisis interrupt**: High or critical severity markers, or suicidal ideation/self-harm/harm-to-others language detected. The pipeline stops immediately. A fixed supportive message is persisted to the transcript. A safety event record is created.

For the example message, safety gate returns **proceed** — anxiety about an unknown cause does not cross any crisis threshold.

**Research output:** A `safety_events` record if supportive notice or interrupt fires. The researcher can analyze: safety event frequency per session, per user, over time; severity trends; which risk types appear most frequently.

### Clarification Branch

If Stage 1 determines clarification is needed, the pipeline stops and sends a clarification question to the user. This branch is tracked:

- The user message is marked as having triggered clarification
- The clarification question and answer are stored
- Stage 1 runs again on the answer before proceeding
- A maximum of two clarification loops are allowed per session segment

The researcher can analyze: how often clarification is needed, which question types resolve gaps vs. which leave them open, whether clarification meaningfully changes downstream Stage 3 output.

### Stage 2 — Memory Retrieval

After safety clears and clarification is resolved (if any), the system retrieves relevant prior context from memory.

The memory layer uses semantic search over embedded chunks. The retrieval query is built from the Stage 1 extraction — entities, intent, and theme tags are embedded and used to find the most relevant prior chunks.

For the anxiety example, retrieval might find:

- Prior sessions where the user discussed anxiety
- Earlier mentions of specific triggers or patterns
- Any recurring themes across sessions
- Session summaries from recent sessions that touch similar content

Memory retrieval is semantic — it finds content by meaning, not keyword. If embedding is not configured, this stage is skipped and the pipeline proceeds with just the transcript.

**Research output:** The retrieved memory items and their similarity scores. The researcher can analyze: how memory retrieval changes over time as the user's context grows, what the memory "remembering" vs. "forgetting" patterns look like, how retrieval relevance correlates with session outcomes.

### Stage 3 — Reasoning Engine

This is the core clinical reasoning step. Stage 3 consumes:

- The original user message
- The recent transcript window
- Stage 1 structured extraction
- Current session summary
- Retrieved memory items

From this, Stage 3 produces a structured reasoning packet:

**Support mode**: One primary therapeutic strategy for this response. Options include reflective, practical, psychoeducation, grounding, values, problem-solving, or supportive.

**Depth level**: How deep to go in this response. Light (for ambiguous first turns or acute distress), moderate, or deep (for established context and strong reasoning signal).

**Response goal**: What this specific response should accomplish. Not a generic goal — one tied to the specific turn.

**Emotional hypothesis**: What the system hypothesizes is happening emotionally, with evidence from the conversation and confidence level. **Not a diagnosis** — this is a research-grade inference, not a clinical determination.

**Response plan**: Concrete guidance for how to write the response — opening move, key points, suggested question, and things to explicitly avoid.

**Safety notes**: Any non-critical risk markers to keep in mind.

For the anxiety example, Stage 3 might produce:

- **Support mode**: reflective (user wants to understand, not solve)
- **Depth level**: moderate (some context from "lately" but cause unknown)
- **Response goal**: Help the user notice patterns or triggers without forcing premature closure
- **Emotional hypothesis**: Anxiety without identified cause often signals something unexpressed or avoided — the "not knowing why" itself is notable
- **Response plan**: Open with reflection on the anxiety itself, not its cause. Gently invite exploration. Avoid jumping to reassurance or problem-solving.
- **Safety notes**: Low-level anxiety present but no acute markers

If Stage 3 fails, a deterministic fallback is used: support mode defaults to `supportive`, depth defaults to `light`, response goal is derived from Stage 1 summary. The session continues normally — no research data is lost.

**Research output:** A `stage3_reasoning_outputs` record. The researcher can analyze: which support modes are used most frequently, how depth level correlates with session phase, what emotional hypotheses appear repeatedly across sessions, how the reasoning engine's choices compare to what a human clinician would choose.

### Stage 4 — Curated Resource Tooling

Before the response is synthesized, the system evaluates whether a local curated resource would help. Resources are:

- Grounding exercises for acute distress
- Values and reflection prompts when the user is stuck
- Between-session practice suggestions at session close
- Psychoeducation content relevant to the current topic

Selection is rule-based, deterministic, and constrained. A maximum of one or two resources is selected to avoid crowding out the user's message. Stage 4 does not call external APIs or perform web searches in the current milestone.

**Research output:** Which resources were selected and why. The researcher can analyze: how resource selection correlates with support mode, session phase, or user state.

### Stage 5 — Response Synthesis

All prior outputs feed into the final response. The synthesis rules are:

1. **Empathic reflection first** — acknowledge what was said
2. **Psychoeducation or reframing** — only if it serves the response goal
3. **Concrete next step or question** — guided by the Stage 3 response plan

The response is streamed token-by-token to the renderer. The user sees it in real-time.

For the anxiety example, a Stage 5 response might be:
> "Anxiety that doesn't have a clear name or shape can be particularly frustrating. You've noticed it's there, and you're looking for some understanding of where it's coming from — that's a meaningful first step in itself. What comes to mind when you sit with that 'I don't know why' feeling for a moment?"

**Research output:** The assistant message and the agent activity trace for this turn. The researcher can analyze: response patterns by support mode, length and complexity by depth level, how often resources are included vs. not.

### Stage 6 — Memory Write-Back (Asynchronous)

After the response has been streamed, write-back runs asynchronously:

1. Turn-level memory chunks are derived from the exchange
2. Embeddings are generated for new chunks (if configured)
3. Memory chunk rows are inserted
4. Session summary is updated incrementally
5. Entity records are updated (people, relationships, events mentioned)
6. Activity records are written

Write-back must never block the user's experience. If it fails, the exchange remains intact — only memory artifacts are affected.

**Research output:** Memory chunk records, updated session summary, entity records. The researcher can analyze: how memory evolves over sessions, entity co-occurrence patterns, theme frequency across the user's history.

---

## Research Analysis Paths

With this data architecture, several research questions become tractable:

### Within-Session Analysis

- How many turns does a typical session have before closing?
- How often does clarification fire and what question types resolve gaps?
- What is the distribution of safety events across session phases?
- Which support modes appear in which session phases?
- How does depth level change as a session progresses?

### Cross-Session Longitudinal Analysis

- What mood and tone trajectories emerge across sessions for a given user?
- Which patterns of entities and themes appear repeatedly?
- How does the memory system surface relevant prior context over time?
- What is the frequency and severity trend for safety events per user?
- How does session intention correlate with outcomes?

### Therapeutic Modality Analysis

- Which support modes correlate with positive session ratings?
- Does depth level (light/moderate/deep) affect perceived helpfulness?
- Which psychoeducation resources are selected most frequently?
- Does response plan adherence (following vs. deviating from Stage 3 guidance) affect outcomes?

### Pipeline Behavior Analysis

- How often does Stage 3 fallback fire and why?
- What is the distribution of clarification loop counts?
- How does memory retrieval relevance change as context grows?
- Stage timing: how long does each stage take on average?

---

## Example Research Flow

**User first message (Session 1, Turn 1):**
> "I've been feeling really anxious lately and I don't know why."

**Pipeline behavior:**

1. Stage 1 extracts: tone = anxious/negative, intent = understand/process, no entities, low risk, clarification not needed
2. Safety gate: proceed
3. Memory retrieval: no prior sessions, no memory chunks found
4. Stage 3: support mode = reflective, depth = light-moderate (first turn, limited context), response goal = explore the anxiety itself
5. Stage 5 synthesizes and streams response
6. Write-back creates: turn chunk, session summary, entity records (none triggered this turn)

**What the researcher observes:**

- New user, Session 1, Turn 1: "anxious" tone with unknown cause is a common opening
- No prior memory context — the system has nothing to retrieve, session begins from scratch
- Stage 3 chose reflective mode — user intent was help-seeking/understanding, not problem-solving
- First session summary created with initial anxiety theme

**User second message (Session 1, Turn 2):**
> "I think it might have something to do with work."

**Pipeline behavior:**

1. Stage 1 extracts: tone = anxious, intent = understand/cause, entity = work, risk = low
2. Safety gate: proceed
3. Memory retrieval: finds Turn 1 chunk ("feeling anxious about unknown cause")
4. Stage 3: support mode = reflective (same user, same session), depth = moderate (has context now), response goal = explore connection between work and anxiety without forcing
5. Stage 5 synthesizes and streams
6. Write-back updates: session summary now includes work/anxiety theme

**What the researcher observes:**

- Entity "work" introduced and linked to anxiety theme
- Same support mode chosen — therapeutic consistency
- Depth increased from light to moderate — context was established
- Memory retrieval found Turn 1 chunk — longitudinal context building

**User third message (Session 1, Turn 3):**
> "I can't sleep because of it."

**Pipeline behavior:**

1. Stage 1 extracts: tone = distressed, intent = processing, entity = sleep (new), risk markers = low-level sleep disturbance
2. Safety gate: proceed (low-level sleep disturbance does not trigger crisis threshold)
3. Memory retrieval: work/anxiety chunks, earlier session context if any
4. Stage 3: support mode = reflective or grounding (sleep disturbance + anxiety suggests activated state), depth = moderate, response goal = address sleep impact gently
5. Stage 4 might select a sleep-specific resource or grounding exercise
6. Stage 5 synthesizes and streams
7. Write-back creates new chunks including sleep disturbance theme

**What the researcher observes:**

- Sleep emerges as a consequence and a signal — this is clinically meaningful
- Grounding or sleep resource selection expands the resource toolkit
- New entity "sleep" tracked and linked to anxiety
- Session arc is building: unknown cause → work connection → sleep impact

---

## Research Data Privacy

The platform is local-only. All data stays in the user's workspace folder. No data is sent to external servers. No account is required.

For cross-user research analysis, the researcher would need to:

- Anonymize user identifiers before aggregating
- Obtain appropriate research ethics approval for any human subjects research
- Use the research snapshot infrastructure (when implemented) which explicitly separates anonymized research data from personally identifiable session content

The platform's local-first architecture means the researcher controls the data entirely — there is no third-party data handling to audit or regulate.

---

## Deferred Research Capabilities

The following research capabilities are deferred beyond the current milestone but were part of the original research design:

- **Validated clinical scales** (PHQ-9, GAD-7, PCL-5) administered periodically to provide objective outcome measures
- **Therapist review queue** for human expert oversight on session samples
- **A/B framework** for controlled experiments on prompt variants
- **Pattern insights** generated by a weekly analysis job that detects cross-session themes
- **Mood trajectory modeling** with time-series analysis over mood logs
- **User risk profiles** that aggregate safety events over time to detect trends
