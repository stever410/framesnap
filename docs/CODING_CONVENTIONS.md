# FrameSnap Coding Conventions

## 1. Scope and Objectives

This document defines coding standards for FrameSnap MVP:

- Maximize reliability on iOS and mobile browsers.
- Keep code small, readable, and testable.
- Prevent regressions in video seek/capture behavior.
- Preserve local-first privacy guarantees.

## 2. Language and Tooling

- Language: TypeScript (`strict: true`).
- UI Layer: Preact (`preact`, `preact/hooks`).
- Build: Vite.
- Runtime dependencies: minimal only (`preact`, `preact/hooks`).
- Linting: ESLint with TypeScript rules (dev dependency only).
- Formatting: Prettier or ESLint formatting rules; enforce one formatting approach only.

Required `tsconfig` posture:

- `"strict": true`
- `"noUncheckedIndexedAccess": true`
- `"noImplicitOverride": true`
- `"exactOptionalPropertyTypes": true`
- `"noFallthroughCasesInSwitch": true`

## 3. File and Module Rules

- One module should have one clear responsibility.
- Keep files under ~250 lines where practical.
- Avoid circular imports.
- Use named exports by default; avoid default exports except app entry points.
- Do not place business logic in UI rendering files.

Naming:

- Files: `kebab-case.ts`
- Types/interfaces: `PascalCase`
- Variables/functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE` only for true constants
- Event handlers: `onXxx` prefix
- Async functions: verb-based names, optional `Async` suffix only if needed for clarity

## 4. TypeScript Style

- Do not use `any`. If unavoidable, use `unknown` and narrow with guards.
- Prefer union types and discriminated unions for state.
- Explicit return types required for exported functions.
- Use readonly where mutation is not needed.
- Use `satisfies` for config-like objects to validate shapes.

Example:

```ts
export function formatTimestamp(totalSec: number): string {
  const safe = Number.isFinite(totalSec) && totalSec >= 0 ? totalSec : 0;
  const min = Math.floor(safe / 60);
  const sec = Math.floor(safe % 60);
  const ms = Math.floor((safe % 1) * 1000);
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}
```

## 5. State Management Conventions

- Primary pattern: `useReducer` + Context with typed actions.
- Optional pattern: `@preact/signals` for localized reactive state where it reduces boilerplate.
- All app-critical state transitions must go through typed actions and reducer.
- Reducers must be pure and side-effect free.
- Side effects belong in controller/service layer only.
- Components subscribe to state and re-render from selectors/hooks.
- Never mutate state objects in place.

Action conventions:

- Action type format: `"domain/event"` (example: `"video/loaded"`).
- Action payloads must be minimal and typed.
- Invalid transitions should be ignored or mapped to error state explicitly.

## 6. Preact and UI Conventions

- Use semantic HTML elements first.
- Prefer `data-*` selectors for JS hooks; do not bind logic to styling class names.
- Keep component render logic idempotent and deterministic.
- Components should stay presentation-focused; move media/capture logic to services.
- Avoid direct inline styles in TS/TSX except for dynamic pixel-critical rendering.
- Keep accessible labels for buttons and inputs (`aria-label`, visible text).

Component rules:

- One component per file for non-trivial components.
- Component names use `PascalCase` and `.tsx` extension.
- Keep hooks at top level and follow deterministic hook order.
- Prefer controlled inputs for timestamp entry and capture settings.

Mobile-first:

- Minimum touch target size: 44x44 CSS px.
- Respect safe-area insets on iOS.
- Primary CTA must be reachable by thumb in portrait mode.

## 7. CSS Conventions

- Use CSS custom properties for tokens (`--color-*`, `--space-*`, `--radius-*`, `--font-*`).
- Layering:
  - `tokens.css`: design tokens only
  - `base.css`: resets and global element styles
  - `components.css`: component-level styles
- Class naming: component-scoped (`capture-panel__button` pattern).
- Avoid deep selectors and `!important`.
- Animations must be subtle and purposeful; keep duration between 120-300ms for common transitions.

## 8. Browser API Conventions

- Gate all optional APIs with feature detection.
- Wrap browser APIs in thin service modules for easier testing.
- Use explicit timeout and retry behavior for media seek operations.
- Revoke object URLs in `finally` paths or deterministic teardown.
- Prefer `canvas.toBlob` over `toDataURL`.

## 9. Error Handling Standards

- Throw typed errors with stable `code` values from `AppErrorCode`.
- Convert low-level errors to user-friendly messages in one mapper.
- Do not swallow errors silently.
- Share cancel is not an error state; treat as user action and keep preview.

Pattern:

```ts
try {
  // operation
} catch (error: unknown) {
  return { ok: false, error: mapError(error) };
}
```

## 10. Logging Standards

- Dev: `console.debug/info/warn/error` allowed with concise context.
- Prod: no verbose logs; only critical error diagnostics if needed.
- Never log user file names or media metadata unless required for debugging and only in dev mode.

## 11. Testing Conventions

Minimum required coverage for MVP:

- Unit:
  - reducer transitions
  - timestamp formatter
  - feature detection
  - error mapper
- Integration (browser-level):
  - video load happy path
  - seek + capture correctness path
  - share-supported and fallback flow
  - error recovery from seek failure

Test naming:

- `should_<expected_behavior>_when_<condition>`

Examples:

- `should_transition_to_video_ready_when_metadata_loaded`
- `should_fallback_to_download_when_share_not_supported`

## 12. Git and Review Conventions

Branch naming:

- `feat/<short-topic>`
- `fix/<short-topic>`
- `chore/<short-topic>`

Commit format:

- `feat: add iOS-safe capture pipeline`
- `fix: retry seek once on timeout`
- `chore: enforce strict tsconfig rules`

PR checklist:

- No runtime dependencies added without ADR.
- No violation of privacy/local-first principles.
- Manual iOS Safari validation performed for media flow changes.
- Bundle-size impact noted for UI changes.

## 13. Definition of Done

A task is done when:

- Code follows this convention and architecture boundaries.
- Types pass strict compile.
- Required tests pass.
- No console errors in target browsers.
- UX matches PRD state and CTA priorities.
- No regression in local-first behavior.
