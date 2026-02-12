# FrameSnap Architecture

## 1. Architecture Goals

- Local-first: no backend, no external API calls, no telemetry.
- iOS-first reliability: frame capture accuracy and share flow are top priorities.
- Small footprint: minimal code and dependency surface.
- Offline capability: app shell available after first load.
- Clear boundaries: isolate browser-specific complexity from Preact UI and state orchestration.

## 2. System Context

- Client-only PWA running in browser (iOS Safari, iOS standalone PWA, Android Chrome, desktop browsers).
- Inputs: local video file chosen by user.
- Outputs: captured frame image file shared via Web Share API or downloaded.
- Persistent storage: none in MVP (except browser cache for app shell assets via Service Worker).

## 3. High-Level Component Model

- `App Controller`
  - Bootstraps app, wires modules, and coordinates side effects.
- `State Store`
  - Holds immutable app state and reducer/actions.
- `Preact UI Layer`
  - Components render from state/selectors. No business logic.
- `Video Engine`
  - Manages `<video>`, object URLs, seek logic, metadata, and scrub sync.
- `Capture Engine`
  - Executes iOS-safe capture pipeline (`seeked` -> `requestAnimationFrame` -> `drawImage` -> `toBlob`).
- `Share/Download Service`
  - Handles feature detection and output actions (`navigator.share` first, download fallback).
- `Service Worker Layer`
  - Caches app shell assets and enables offline use.
- `Error Mapper`
  - Converts low-level errors into user-safe messages and typed error codes.

## 4. State Design

Use a single app state object with explicit finite states:

- `idle`: no video selected.
- `loading_video`: user selected file, video metadata pending.
- `video_ready`: video loaded and scrub-capable.
- `capturing`: capture in progress.
- `capture_ready`: image preview available.
- `error`: recoverable error shown to user.

Minimal state shape:

```ts
type AppState = {
  phase: "idle" | "loading_video" | "video_ready" | "capturing" | "capture_ready" | "error";
  video: {
    fileName: string | null;
    objectUrl: string | null;
    durationSec: number | null;
    currentTimeSec: number;
    width: number | null;
    height: number | null;
  };
  capture: {
    blob: Blob | null;
    fileName: string | null;
    timestampSec: number | null;
    width: number | null;
    height: number | null;
  };
  capabilities: {
    canShareFiles: boolean;
    isIOS: boolean;
  };
  error: {
    code: AppErrorCode | null;
    message: string | null;
  };
};
```

Rules:

- All state changes go through typed actions/reducers.
- Preact render layer should be pure from `AppState` to UI.
- Side effects (file handling, capture, share) happen in controller/service modules, not components.

## 5. Recommended Folder Layout

```text
src/
  app/
    app.tsx
    controller.ts
    state.ts
    actions.ts
    reducer.ts
    selectors.ts
  features/
    video/
      video-engine.ts
      video-events.ts
      video-types.ts
    capture/
      capture-engine.ts
      capture-types.ts
    share/
      share-service.ts
    offline/
      sw-register.ts
  ui/
    AppShell.tsx
    format.ts
    components/
      Header.tsx
      Uploader.tsx
      Timeline.tsx
      CapturePanel.tsx
      PreviewPanel.tsx
      ErrorBanner.tsx
    hooks/
      useAppStore.ts
      useCapabilities.ts
    context/
      AppStateContext.tsx
  platform/
    capability.ts
    browser.ts
  shared/
    errors.ts
    logger.ts
    guards.ts
    constants.ts
  styles/
    tokens.css
    base.css
    components.css
  main.tsx
```

## 6. Core Flows

### 6.1 Video Load Flow

1. User picks file.
2. Validate MIME/extension.
3. Revoke previous object URL if exists.
4. Create new object URL and assign to `<video>`.
5. Wait for metadata load.
6. Transition to `video_ready`.

### 6.2 Capture Flow

1. Receive target timestamp (current or manually entered).
2. Transition to `capturing`.
3. Set `video.currentTime`.
4. Await `seeked` with timeout and one retry.
5. Await one `requestAnimationFrame`.
6. Draw frame to canvas (optional scale-down policy).
7. Export with `canvas.toBlob`.
8. Build output `File`.
9. Transition to `capture_ready`.

### 6.3 Share/Download Flow

1. Detect file-sharing support once at startup.
2. If supported, attempt `navigator.share({ files: [file] })`.
3. If unsupported, canceled, or failed, keep preview visible and provide download fallback.
4. Never lose captured image due to share errors.

## 7. Interface Contracts

Define contracts for testability and decoupling.

```ts
export interface CaptureEngine {
  captureAt(timeSec: number, options?: CaptureOptions): Promise<CaptureResult>;
}

export interface ShareService {
  canShareFile(file: File): boolean;
  share(file: File): Promise<"shared" | "canceled" | "failed">;
  download(file: File): void;
}
```

## 8. Error Taxonomy

Use stable internal codes:

- `UNSUPPORTED_FORMAT`
- `VIDEO_LOAD_FAILED`
- `SEEK_TIMEOUT`
- `CAPTURE_FAILED`
- `SHARE_NOT_SUPPORTED`
- `SHARE_FAILED`
- `MEMORY_PRESSURE`

Policy:

- Log technical details internally (console in dev only).
- Show concise user message with recovery action.
- Error state must be recoverable without page reload.

## 9. Performance and Resource Management

- Revoke object URLs when replacing video and on teardown.
- Reuse one canvas instance per capture size profile when possible.
- Prefer `toBlob` over `toDataURL`.
- Throttle timeline UI updates (for example, 30Hz) to reduce layout churn.
- Keep main thread responsive; avoid heavy sync loops.
- Cap output resolution when source is very large if memory risk is detected.

## 10. PWA and Offline Strategy

- Precache app shell (HTML, JS, CSS, icons, manifest).
- Runtime caching not required for MVP because there are no API calls.
- Service worker update flow:
  - Install new SW.
  - Notify user when update is ready.
  - Reload on acceptance.
- Ensure standalone display mode works on iOS and Android.

## 11. Security and Privacy Posture

- No network transfer of user-selected media.
- No persistent storage of raw videos in MVP.
- No analytics SDKs.
- No third-party scripts.
- Restrictive CSP headers in deployment config where feasible.

## 12. Quality Gates

- TypeScript strict mode enabled.
- Unit tests for reducer, timestamp formatting, capability checks, error mapping.
- Browser integration tests for capture and share fallback behavior.
- Manual validation matrix:
  - iOS Safari (latest)
  - iOS standalone PWA
  - Android Chrome
  - Desktop Chrome/Safari
- Lighthouse PWA score target: >= 90.

## 13. ADR Baseline

Architecture decisions for MVP:

- ADR-001: Use Preact + TypeScript for UI, with native Web APIs for media/capture/share (accepted).
- ADR-002: Use single app reducer store (Context-based), with Signals as optional evolution path (accepted).
- ADR-003: Capture pipeline optimized for iOS seek correctness (accepted).
- ADR-004: Keep runtime dependencies minimal (`preact`, `preact/hooks`) (accepted).
