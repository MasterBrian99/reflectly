# Repository Guidelines

## Project Structure & Module Organization

The app is an Electron desktop project with React and TypeScript. Core process code lives in `src/main`, preload bridge code in `src/preload`, and the UI in `src/renderer/src`. Shared renderer assets are under `src/renderer/src/assets`, and small reusable UI pieces belong in `src/renderer/src/components`. Build and packaging metadata lives in `electron.vite.config.ts`, `electron-builder.yml`, `build/`, and `resources/`.

## Build, Test, and Development Commands

Install dependencies with `pnpm install`. Use `pnpm dev` for the Electron + Vite development loop and `pnpm start` to preview the built app. Run `pnpm build` to type-check and produce production bundles. Platform packages are created with `pnpm build:win`, `pnpm build:mac`, and `pnpm build:linux`. Use `pnpm lint` for ESLint and `pnpm format` for Prettier.

## Coding Style & Naming Conventions

Follow the repository formatting rules: 2-space indentation, LF line endings, single quotes, no semicolons, and `printWidth: 100`. ESLint is configured in `eslint.config.mjs`; Prettier is configured in `.prettierrc.yaml`. Use TypeScript for all new code. Prefer `PascalCase` for React components (`Versions.tsx`), `camelCase` for variables/functions, and keep Electron entry files simple and descriptive (`src/main/index.ts`, `src/preload/index.ts`). Use the `@renderer` alias for renderer imports when it improves clarity.

## Testing Guidelines

There is no test runner configured yet. Until one is added, treat `pnpm lint` and `pnpm build` as the minimum verification before opening a PR. When adding tests, place renderer tests next to the feature or under a local `__tests__` directory, and use `*.test.ts` or `*.test.tsx` naming.

## Commit & Pull Request Guidelines

Git history currently contains only a single `initial commit`, so no strict convention is established yet. Use short, imperative commit subjects such as `Add onboarding screen` or `Wire preload IPC types`. Keep pull requests focused, describe user-visible changes, list verification steps, and include screenshots for renderer changes. Link the relevant issue when one exists.

## Configuration Tips

Do not commit secrets or machine-specific config. Generated output such as `dist/` and `out/` should remain build artifacts, not hand-edited source.

## Documentation Guide

read `DOCUMENT_GUIDE.md` for documentation.
