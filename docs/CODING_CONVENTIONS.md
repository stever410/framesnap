# FrameSnap Coding Conventions

## 1. Scope and Objectives

This document defines engineering standards for FrameSnap:

- Preserve local-first privacy guarantees.
- Keep architecture modular and feature-oriented.
- Maintain predictable reducer-based state transitions.
- Enforce quality with automated checks in local dev and CI.

## 2. Language and Tooling

- Language: TypeScript (`strict: true`).
- UI: Preact.
- Build: Vite.
- Lint + formatting: Biome (`biome.json`).
- Testing: Vitest + `@testing-library/preact`.
- Coverage: Vitest V8 provider with 80% minimum thresholds.

Required TS posture (`tsconfig.json`):

- `strict`
- `noUncheckedIndexedAccess`
- `noImplicitOverride`
- `exactOptionalPropertyTypes`
- `noFallthroughCasesInSwitch`

## 3. Project Structure Rules

- Use feature-based folders (`features/<feature>/...`).
- Keep state primitives in `src/app/state/*`.
- Keep providers in `src/app/providers/*`.
- Keep browser API access in services/engines, not directly in UI components.
- Prefer one responsibility per file.

## 4. State Management Rules

- Single reducer is source of truth for app-critical state.
- All reducer mutations must be done through typed actions.
- Use selectors for derived UI decisions.
- `AppControllerProvider` composes feature hooks and exposes a controller context.
- Avoid deep prop drilling for app-wide state/actions.

Action conventions:

- Type format: `domain/event`.
- Payloads should be minimal and typed.

## 5. UI and Component Rules

- Components in `features/*/components` should be presentation-oriented.
- Hooks in `features/*/hooks` should orchestrate side effects.
- Services/interfaces/types belong under the same feature when feature-specific.
- Keep semantic HTML and accessible labels where possible.
- No inline business logic in component JSX trees.

## 6. TypeScript Style

- No `any`.
- Use `unknown` + narrowing for error and external input handling.
- Explicit return types for exported functions.
- Prefer discriminated unions and narrow types.
- Use `import type` where appropriate.

## 7. CSS Rules

- Layering:
  - `tokens.css`: design tokens
  - `base.css`: global/reset
  - `components.css`: shared component classes
  - `utilities.css`: reusable utility classes (`u-*`)
  - feature CSS files near components
- Naming style: BEM-style class names for component blocks/elements/modifiers.
- Avoid broad/deep selectors and style leakage across features.

## 8. Testing Rules

Required commands before merge:

```bash
npm run check
npm run typecheck
npm run test
```

Coverage command:

```bash
npm run test:coverage
```

Minimum thresholds (enforced in `vitest.config.ts`):

- statements >= 80
- branches >= 80
- functions >= 80
- lines >= 80

Test scope expectations:

- Reducer/action/selector behavior
- Utility formatting/parsing behavior
- Capability and error mapping behavior
- Component interaction behavior for major user flows

## 9. CI/CD Rules

GitHub workflow requirements:

- Pull requests must pass `ci-quality.yml`.
- Production release pipeline (`deploy-production.yml`) must re-run checks before deployment.
- Production release notes must be created only after a successful production deployment.

## 10. Git and PR Rules

Branch naming:

- `feat/<topic>`
- `fix/<topic>`
- `chore/<topic>`

Commit style:

- `feat: ...`
- `fix: ...`
- `chore: ...`
- `test: ...`
- `docs: ...`

PR checklist:

- Architecture boundaries preserved.
- No unintended behavior regressions.
- `check`, `typecheck`, and `test` pass locally.
- Documentation updated when architecture/tooling/flows change.

## 11. Definition of Done

A change is done when:

- Code follows feature-based architecture.
- State changes remain typed and traceable.
- Biome check passes.
- Typecheck passes.
- Tests pass.
- Coverage thresholds remain satisfied.
- Relevant docs (`README.MD`, `docs/*`) are updated.
