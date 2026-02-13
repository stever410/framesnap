# FrameSnap PRD
# Local-First Video Frame Capture PWA
---

## 1. Overview

### Product Name
FrameSnap

### Summary
FrameSnap is a local-first PWA that lets users:

- Select a video file from their device
- Navigate to an exact timestamp
- Capture the visible frame
- Share or download the result

All processing happens in-browser on the user device.

---

## 2. Product Goals

### Primary Goals
- Accurate frame capture from local video files
- Reliable mobile UX (especially iOS)
- Offline-ready app shell after first load
- Predictable and maintainable frontend architecture
- CI-enforced quality before merge/release/deploy

### Non-Goals
- Cloud upload/storage
- User accounts
- DRM/streaming capture
- Server-side media processing

---

## 3. Target Platforms

| Platform | Priority | Notes |
|----------|----------|-------|
| iOS Safari | High | Primary optimization target |
| iOS Installed PWA | High | Standalone install support |
| Android Chrome | High | Full support |
| Desktop Chrome/Edge | Medium | Supported |
| Desktop Safari | Medium | Supported |

---

## 4. Current Technical Implementation

### Core Stack
- Preact + TypeScript
- Vite + PWA plugin
- Biome (lint/format validation)
- Vitest + Testing Library

### Architecture Pattern
- Reducer store (`AppStoreProvider`) for app-critical state
- Controller context (`AppControllerProvider`) for app-level orchestration
- Feature-based modules (`video`, `capture`, `install`, `shell`, `share`)

### State Model (Implemented)
- `idle`
- `loading_video`
- `video_ready`
- `capturing`
- `capture_ready`
- `error`

### Key User Features (Implemented)
- Video selection and metadata loading
- Timestamp-based seek and capture
- Upscale capture options (1x, 1.5x, 2x, 3x)
- Share (supported environments)
- Download fallback
- Theme toggle (light/dark)
- Locale switch (`en`, `vi`)
- Install prompts and iOS add-to-home help

---

## 5. Functional Requirements

### 5.1 Video Upload and Validation
- Accept common local video formats.
- Reject unsupported formats with clear error messaging.
- Revoke obsolete object URLs when switching files.

### 5.2 Timeline / Timestamp Navigation
- Display current timestamp in `mm:ss.xxx`.
- Support manual input and seek on enter/blur.
- Keep input synchronized with video state when not being edited.

### 5.3 Frame Capture
- Capture the exact target frame.
- Maintain iOS-safe seek/render behavior.
- Expose upscale options for output quality/size.

### 5.4 Export Flow
- Use native share where file-sharing APIs exist.
- Provide reliable download fallback everywhere else.
- Keep capture modal open after recoverable errors.

---

## 6. Non-Functional Requirements

### Privacy and Security
- No media upload to external servers.
- No analytics/tracking SDK.
- No backend dependency for core functionality.

### Performance and Reliability
- Offline app shell through service worker cache.
- Deterministic error handling and recoverable UI states.
- Type-safe reducer/actions/selectors.

### Quality Gates
Must pass before merge/release/deploy:

- `npm run check`
- `npm run typecheck`
- `npm run test`

Coverage requirement (`npm run test:coverage`):
- statements >= 80
- branches >= 80
- functions >= 80
- lines >= 80

---

## 7. CI/CD Requirements

### Pull Requests
- Every PR must pass `ci-quality.yml`.
- Quality checks include Biome validation, typecheck, and tests.

### Production Deploy
- Deploy pipeline must re-run quality checks and build before deployment.
- Deploy target: Vercel.
- Required repo config:
  - `VERCEL_TOKEN` (secret)
  - `VERCEL_ORG_ID` (repo variable)
  - `VERCEL_PROJECT_ID` (repo variable)

### Releases
- Production release workflow must pass quality checks before deployment and generate release notes only after deploy succeeds.

---

## 8. Acceptance Criteria

- Works on latest iOS Safari and iOS standalone install mode.
- Works on Android Chrome and modern desktop browsers.
- Captured frame matches selected/visible video frame.
- Share/download export path is always available.
- Offline shell works after first successful load.
- No blocking console/runtime errors in core flows.
- CI quality gates are enforced on PR and production workflows.

---

## 9. Out of Scope

- Cloud storage or sync
- Multi-user collaboration
- Batch processing pipeline
- Advanced editor features (crop/filter/timeline thumbnails)

---

## 10. Product Philosophy

FrameSnap should remain:
- Fast
- Private
- Local-first
- Lightweight
- Reliable on mobile
