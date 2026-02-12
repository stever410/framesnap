# FrameSnap

Local-first PWA to capture precise frames from local video files.

- No uploads
- No tracking
- Works offline after first load
- iOS-friendly share/download flow

## Features

- Import local video files (`mp4`, `mov`, `webm`, etc. if browser-supported)
- Large video preview area with modern glass UI
- Timestamp input (`mm:ss.xxx`) with seek-on-enter/blur
- Capture current/target frame to image
- Share captured frame (when `navigator.share` with files is supported)
- Download fallback for unsupported share environments
- Light/dark theme toggle with persistence
- Installable PWA + service worker shell caching

## Tech Stack

- Preact + TypeScript
- Vite
- Custom Service Worker (`public/sw.js`)
- CSS token system (`src/styles/tokens.css`, `src/styles/base.css`, `src/styles/components.css`)

## Getting Started

### Prerequisites

- Node.js 18+ (recommended)
- npm

### Install

```bash
npm install
```

### Run Dev Server

```bash
npm run dev
```

### Typecheck

```bash
npm run typecheck
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Usage Flow

1. Open the app and choose a video file.
2. Scrub video or type timestamp (`mm:ss.xxx`).
3. Tap **Capture Frame** (overlay button on video).
4. Use **Share** (if available) or **Download**.
5. Use **Capture Again** to reset capture result.

## PWA + Update Behavior

FrameSnap uses version-aware service worker registration:

- `vite.config.ts` injects `__APP_VERSION__` from `package.json`
- `src/main.tsx` registers `sw.js?v=<appVersion>`
- `public/sw.js` uses that version in cache name (`framesnap-shell-<version>`)
- Old caches are cleaned on activate

### Releasing an Update

1. Bump version:

```bash
npm version --no-git-tag-version patch
```

2. Build and deploy:

```bash
npm run build
```

Installed PWAs will pick up the new service worker and refresh to the latest build.

## Project Structure

```text
src/
  app/                # App UI, reducer, state flow
  features/
    capture/          # Frame capture engine
    share/            # Share/download helpers
    video/            # Video validation/object URL helpers
  platform/           # Capability detection
  shared/             # Error models/mappers
  styles/             # Tokens, base, component styles
  ui/                 # Formatting helpers
public/
  manifest.webmanifest
  sw.js
  favicon.svg
docs/
  FrameSnap_PRD.md
  ARCHITECTURE.md
  CODING_CONVENTIONS.md
```

## Notes

- iOS web apps cannot be Share Sheet targets like native extensions; FrameSnap supports sharing captured files out of the app when browser APIs allow it.
- All media processing stays on-device in browser memory.

