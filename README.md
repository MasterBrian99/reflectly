# Reflectly

> [!CAUTION]
> **Research Project Only**
> This application is a **research tool for clinical psychology validation**. It is **not** intended for general use.
>
> - If you are experiencing a mental health crisis or need support, please contact a qualified professional or reach your local crisis line immediately.
> - Do not use this application as a substitute for therapy, counseling, or medical advice.
> - This application can be habit-forming and is not designed for casual or daily use by the general population.

> [!WARNING]  
> **This project is partially AI-generated.**

---

## What Is This?

Reflectly is a desktop application built by a student researcher to support clinical psychology research. It provides a structured reflective dialogue environment that processes user messages through a multi-stage reasoning pipeline — combining memory retrieval, therapeutic reasoning, curated tool use, and continuous safety monitoring to produce responses informed by psychological frameworks.

This is not a product or a consumer application. It is a research instrument designed to validate reasoning patterns and support the researcher's own clinical thinking.

---

## How to Build

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [pnpm](https://pnpm.io/) for package management
- A workspace folder selected at first launch (all data stays local)

### Setup Steps

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd reflectly
   ```

2. **Add the SQLite vector extension**
   - The vector extension is required for semantic memory retrieval using embeddings
   - Download `sqlite-vector` for your platform from the [sqlite-vector releases page](https://github.com/sqliteai/sqlite-vector/releases)
   - Extract and place the binary under `resources/sqlite-vector/<platform>/<arch>/`:
     - Linux x64: `resources/sqlite-vector/linux/x86_64/vector.so`
     - Linux arm64: `resources/sqlite-vector/linux/aarch64/vector.so`
     - macOS x64: `resources/sqlite-vector/macos/x86_64/vector.dylib`
     - macOS arm64: `resources/sqlite-vector/macos/aarch64/vector.dylib`
     - Windows x64: `resources/sqlite-vector/windows/x86_64/vector.dll`
   - The app will automatically load the extension from this location when vector search is enabled in settings

3. **Install dependencies**

   ```bash
   pnpm install
   ```

4. **Run the development server**

   ```bash
   pnpm dev
   ```

5. **Configure LLM providers**
   - The app supports multiple LLM providers: OpenAI-compatible models, Google (via Vertex AI), Claude (via Anthropic), OpenRouter, and any OpenAI-compatible endpoint including Ollama
   - Configure your provider settings in the app's settings panel after the workspace is set up

### Build Commands

```bash
# Type-check and build for production
pnpm build

# Platform-specific builds
pnpm build:win   # Windows
pnpm build:mac   # macOS
pnpm build:linux # Linux

# Linting and formatting
pnpm lint
pnpm format
```

---

## Contribute

This is a personal research project and **does not accept external contributions**.

You are welcome to clone and modify this repository under the terms of the [MIT License](./LICENSE). Please note:

- The project is built for a specific research workflow and is not designed to generalize to other use cases
- No support, maintenance, or documentation beyond what exists is guaranteed
- Any modifications are entirely your own responsibility
- Always seek professional mental health support rather than relying on this tool

---

## Documentation

- **[architecture.md](./architecture.md)** — Technical architecture of the system. Covers the multi-stage reasoning pipeline (Stage 1–6 with safety gate), session lifecycle, memory system layers, data flow, research infrastructure, tech stack, and key design decisions. Start here if you want to understand how the system is built.

- **[research-flow.md](./research-flow.md)** — Research methodology and data flow. Describes how every session and exchange produces structured research data, how each pipeline stage works from a research perspective, and what analysis paths are enabled by the data architecture. Start here if you want to understand what the system does with the data it collects.
