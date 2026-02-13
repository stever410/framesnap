# AGENTS.md

This file is the operating guide for AI coding agents working in this repository.

## 1. Mission

Build and maintain FrameSnap as a local-first, privacy-preserving PWA for precise frame capture from local video files.

Non-negotiables:

- No media uploads to external services.
- No telemetry/tracking additions.
- Keep the app reliable on mobile, especially iOS Safari/PWA mode.

## 2. Tech Stack

- Preact + TypeScript (`strict`).
- Vite.
- Biome for lint/format checks.
- Vitest + Testing Library for tests.
- Service worker in `public/sw.js`.

## 3. Project Layout Expectations

- App state primitives: `src/app/state/*`.
- App providers: `src/app/providers/*`.
- Feature modules: `src/features/<feature>/*`.
- Browser API side effects in hooks/services/engines, not in presentation components.
- Shared utilities/types in `src/shared/*` and `src/platform/*`.

## 4. Coding Rules

- Avoid `any`; prefer strict types and narrowing from `unknown`.
- Keep reducer transitions typed through explicit actions.
- Use selectors for derived state.
- Keep components presentation-oriented.
- Keep business logic in hooks/services/engines.
- Prefer small, focused files and clear naming.
- Follow existing naming/style patterns before introducing new ones.

## 5. Required Validation Before Finishing

Run all of the following when changes affect behavior, build, or types:

```bash
npm run check
npm run typecheck
npm run test
```

If tests or behavior changed significantly, also run:

```bash
npm run test:coverage
```

Coverage thresholds are enforced (80% statements/branches/functions/lines).

## 6. CI/CD Guardrails

- `ci-quality.yml` runs on PRs and pushes to `main`.
- `release-notes.yml` must pass quality checks before creating release/tag outputs.
- `deploy-production.yml` deploys on `v*` tags or manual trigger and re-runs quality gates before deploy.

Do not bypass the quality gate dependency chain in GitHub workflows.

## 7. Deployment Standard (Vercel)

Production deploy target is Vercel.

GitHub Actions deploy requires:

- Secret: `VERCEL_TOKEN`
- Repo variable: `VERCEL_ORG_ID`
- Repo variable: `VERCEL_PROJECT_ID`

Workflow uses Vercel CLI with:

- `vercel pull --environment=production`
- `vercel build --prod`
- `vercel deploy --prebuilt --prod`

## 8. Change Management Rules

- Keep changes minimal and scoped to the request.
- Update docs when behavior, architecture, scripts, or workflows change.
- Preserve compatibility with existing workflows and scripts.
- Do not introduce unrelated refactors in focused fixes.
- If uncertain, prefer explicitness over cleverness.

## 9. High-Risk Areas

- Frame capture timing/accuracy pipeline.
- Video seek behavior and timestamp parsing/formatting.
- Share/download fallback behavior.
- Service worker caching/versioning.
- App reducer phases and error-state transitions.

For these areas, add or adjust tests alongside code changes.

## 10. Useful Commands

```bash
npm install
npm run dev
npm run build
npm run preview
npm run check
npm run typecheck
npm run test
npm run test:coverage
```

## 11. Key References

- `README.MD`
- `docs/CODING_CONVENTIONS.md`
- `docs/ARCHITECTURE.md`
- `docs/FrameSnap_PRD.md`
- `.github/workflows/ci-quality.yml`
- `.github/workflows/release-notes.yml`
- `.github/workflows/deploy-production.yml`
