# FrameSnap Architecture

## 1. Architecture Goals

- Local-first: no backend, no external API calls, no telemetry.
- iOS-first reliability: frame capture correctness and export flow are priorities.
- Clear boundaries between state, side effects, and presentation.
- Predictable state transitions with typed actions and selectors.
- CI-enforced quality gate before release/deploy.

## 2. Runtime Context

- Client-only PWA running in modern browsers (iOS Safari, Android Chrome, desktop browsers).
- Input: user-selected local video file.
- Output: captured frame image shared or downloaded.
- Persistent storage: browser cache (service worker) + localStorage (theme/locale).

## 3. High-Level Module Model

- `AppStoreProvider`
  - Owns reducer state and dispatch.
- `AppControllerProvider`
  - Composes feature hooks and app-level UI orchestration.
- `Feature Hooks`
  - Video, capture, install, theme controllers.
- `Feature Components`
  - Presentation-focused UI (no deep side-effect logic).
- `Service Layer`
  - Browser API wrappers: metadata loading, seek, install prompt, theme storage.
- `Engine Layer`
  - Capture engine for frame extraction; video/share engines for media handling.

## 4. State Design

App state lives in `src/app/state/` and is managed by a single reducer.

Primary phase states:

- `idle`
- `loading_video`
- `video_ready`
- `capturing`
- `capture_ready`
- `error`

Current shape (simplified):

```ts
type AppState = {
  phase: AppPhase;
  video: {
    fileName: string | null;
    objectUrl: string | null;
    durationSec: number;
    currentTimeSec: number;
    width: number | null;
    height: number | null;
  };
  capture: {
    file: File | null;
    width: number | null;
    height: number | null;
    timestampSec: number | null;
  };
  capabilities: {
    canShareFiles: boolean;
    isIOS: boolean;
    isAndroid: boolean;
  };
  install: {
    isInstallEligible: boolean;
    isInstalled: boolean;
    isMobileViewport: boolean;
    isA2HSHelpOpen: boolean;
  };
  error: {
    code: ResolvedErrorCode | null;
    message: string | null;
  };
};
```

## 5. Folder Layout

```text
src/
  app/
    app.tsx
    providers/
      app-store.provider.tsx
      app-controller.provider.tsx
    state/
      app-state.types.ts
      app-actions.types.ts
      app-initial-state.ts
      app-reducer.ts
      app-selectors.ts
      app-actions.ts
  features/
    video/
      components/
      hooks/
      services/
      interfaces/
      types/
      video-engine.ts
    capture/
      components/
      hooks/
      services/
      interfaces/
      types/
      capture-engine.ts
    install/
      components/
      hooks/
      services/
      interfaces/
      types/
    shell/
      components/
      hooks/
      services/
      interfaces/
      types/
    share/
      share-service.ts
  platform/
    capability.ts
  shared/
    errors.ts
  ui/
    format.ts
  i18n/
    index.tsx
    locales/
  styles/
    tokens.css
    base.css
    components.css
    utilities.css
```

## 6. Core Flows

### 6.1 Video Load Flow

1. User selects file from hidden input.
2. Validate support (`video-engine`).
3. Revoke previous object URL.
4. Create new URL and read metadata (`video-metadata.service`).
5. Dispatch `video/ready` and reset timestamp input.

### 6.2 Capture Flow

1. Read target timestamp from input/current time.
2. Dispatch `capture/start`.
3. Run `captureFrameAt` with selected upscale factor.
4. Dispatch `capture/ready`.
5. Open modal with preview URL.

### 6.3 Install Flow

1. Detect capabilities + standalone mode.
2. Listen for `beforeinstallprompt` / `appinstalled`.
3. Update install state and render desktop/mobile install UI variants.
4. Handle iOS help modal fallback when needed.

### 6.4 Share / Download Flow

1. If `canShareFiles` capability is true, attempt native share.
2. If unavailable/failed, user downloads file.
3. Capture stays available in modal for retry.

## 7. Interface Contracts

Each feature defines narrow interfaces for service boundaries.

Examples:

- `VideoMetadataService`: `loadMetadata(url)`
- `VideoSeekService`: `seekTo(video, targetSec)`
- `InstallPromptService`: detect + subscribe install/viewport events
- `ThemeStorageService`: read/write theme preference
- `CapturePreviewUrlService`: create/revoke blob URLs

## 8. Error Taxonomy

Stable codes in `src/shared/errors.ts`:

- `UNSUPPORTED_FORMAT`
- `VIDEO_LOAD_FAILED`
- `SEEK_TIMEOUT`
- `CAPTURE_FAILED`
- `SHARE_FAILED`
- `UNKNOWN` (resolved fallback)

## 9. Quality Gates

Automated local/CI gates:

- `npm run check` (Biome)
- `npm run typecheck`
- `npm run test`
- `npm run test:coverage` with thresholds:
  - lines >= 80
  - statements >= 80
  - functions >= 80
  - branches >= 80

GitHub workflows:

- `ci-quality.yml`: PR + main checks
- `deploy-production.yml`: quality + build + deploy
- `release-notes.yml`: quality gate before release job

## 10. Deployment

Primary deployment target: Vercel.

Workflow-based deploy requires:

- `VERCEL_TOKEN` (secret)
- `VERCEL_ORG_ID` (repo variable)
- `VERCEL_PROJECT_ID` (repo variable)

## 11. Current Risks / Tradeoffs

- Some UI component line coverage remains lower than utility/state modules due to SVG-heavy render trees.
- Capture engine internals are integration-heavy; coverage focuses on orchestrators/services and user-facing behavior.
- Accessibility lint rules are selectively tuned in `biome.json` for current modal/video interaction patterns.
