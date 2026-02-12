# 📄 Product Requirements Document (PRD)
# FrameSnap – Local-First Video Frame Capture PWA

---

## 1. Overview

### Product Name
**FrameSnap**

### Summary
FrameSnap is a lightweight, local-first Progressive Web App (PWA) that allows users to:

- Select a local video file from their device
- Preview and scrub through the video
- Capture a frame at a precise timestamp
- Save or share the captured image (optimized for iOS)

All processing is done locally in the browser.  
No uploads. No backend. No analytics.

---

## 2. Product Goals

### Primary Goals
- Enable accurate frame capture from local video files
- Provide the best possible iOS saving/sharing experience
- Work fully offline after first load
- Maintain extremely small bundle size
- Deliver fast performance on mobile devices

### Non-Goals
- No cloud storage
- No streaming video support
- No DRM video capture
- No user accounts
- No image editing tools (crop, filters, etc.)

---

## 3. Target Platforms

| Platform | Priority | Notes |
|----------|----------|-------|
| iOS Safari | High | Primary optimization target |
| iOS Installed PWA | High | Must work in standalone mode |
| Android Chrome | High | Full support |
| Desktop Chrome/Edge | Medium | Fully supported |
| Desktop Safari | Medium | Supported |

---

## 4. Technical Stack

### Core Stack
- **Preact + TypeScript**
- **Vite**
- **vite-plugin-pwa**
- Native Web APIs:
  - `<video>`
  - `<canvas>`
  - `navigator.share`
  - `URL.createObjectURL`
  - Service Worker

### Dependencies
- Minimal runtime dependencies only:
  - `preact`
- No heavy UI framework for MVP (custom UI components preferred)
- Optional:
  - Preact Signals or reducer/context for state management
  - Tiny IndexedDB helper (future phase)

---

## 5. Architecture

### 5.1 Local-First Design
- No backend
- No network requests after initial load
- All processing done in browser memory
- Fully functional offline via Service Worker

### 5.2 UI Architecture
- Preact handles view rendering and component composition
- Business logic remains in service modules (video, capture, share)
- State managed with lightweight patterns (`useReducer` + Context or Signals)
- UI state should remain predictable and testable (explicit screen states)

### 5.3 File Handling

User selects file via:

```html
<input type="file" accept="video/*" />
```

Video loaded using:

```ts
const url = URL.createObjectURL(file)
video.src = url
```

Object URLs must be revoked when switching files.

---

## 6. Core Features

### 6.1 Video Upload

**User Flow**
1. User taps “Select Video”
2. Chooses local video file
3. Video preview loads

**Requirements**
- Accept common formats (mp4, mov, webm)
- Display error if codec unsupported
- Release memory when switching files

---

### 6.2 Video Preview & Scrubbing

**UI Components**
- Play / Pause button
- Timeline scrubber
- Current timestamp display (mm:ss.xxx)
- Optional manual timestamp input

**Requirements**
- Accurate time display
- Smooth scrubbing
- Responsive on mobile devices

---

### 6.3 Frame Capture

User can:
- Capture current frame
OR
- Enter specific timestamp and capture

#### Capture Algorithm (iOS-Safe)

1. Set target time:
```ts
video.currentTime = targetTime
```

2. Wait for:
- `seeked` event

3. Wait one animation frame:
```ts
requestAnimationFrame(() => { /* draw */ })
```

4. Draw frame:
```ts
ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
```

5. Export:
```ts
canvas.toBlob()
```

#### Accuracy Requirements
- Capture must match visible frame
- Precision tolerance: ±1 frame
- Must not capture previous frame on iOS

---

### 6.4 Captured Image Preview

After capture, display:
- Captured image preview
- Timestamp
- Resolution

Actions:
- Share (Primary CTA on iOS)
- Download (Fallback)
- Capture Again

---

## 7. Saving & Sharing (iOS Optimized)

### 7.1 Primary Method – Web Share API

If supported:

```ts
navigator.share({
  files: [imageFile]
})
```

Expected behavior:
- iOS Share Sheet opens
- User can:
  - Save Image
  - Save to Files
  - AirDrop
  - Send via Messages

---

### 7.2 Fallback – Download

If `navigator.share` is not available:
- Create temporary anchor element
- Trigger file download
- File saved to:
  - Files app (iOS)
  - Downloads folder (desktop)

---

### UX Requirement (iOS Tip)

Display helper message on iOS:
> On iPhone: choose “Save Image” in the share sheet.

---

## 8. Performance Requirements

### Bundle Size
- Target **< 50 KB gzipped JS** (excluding video file)

### Memory Safety
- Revoke object URLs when switching videos
- Release canvas references after export
- Avoid `toDataURL()` by default; prefer `toBlob()`

### Large Video Handling
- If resolution is very large (e.g., 4K+), optionally offer **scale-down capture** (e.g., cap width to 1920px)

---

## 9. Offline Support

### Requirements
- Installable PWA
- Service Worker caches:
  - App shell
  - JS
  - CSS
- Fully usable offline after first load

---

## 10. Security & Privacy

- No network transmission of video
- No telemetry / analytics
- Video never leaves device
- No persistence of raw video after session (unless explicitly added later)

---

## 11. UX Requirements

### 11.1 Mobile-First Layout

**State 1 – Initial**
- Centered “Select Video” button
- Privacy note

**State 2 – Video Loaded**
- Video player
- Timestamp display
- Capture button (Primary CTA)

**State 3 – After Capture**
- Image preview
- Share button (Primary on iOS)
- Download button (Secondary)

---

## 12. Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Unsupported format | Show friendly error |
| Large file memory issue | Show scale-down suggestion |
| Share canceled | Remain on preview |
| Seek fails | Retry once, else show error |

---

## 13. MVP Scope

### Included (MVP)
- Local video selection
- Scrubbing
- Accurate frame capture
- Web Share API integration
- Download fallback
- Offline support

### Excluded (MVP)
- Batch export
- Frame stepping
- Crop tool
- Image editing
- IndexedDB persistence

---

## 14. Future Enhancements (Phase 2)
- Frame-by-frame stepping
- Timeline thumbnail strip
- JPEG/PNG format toggle
- Quality control slider
- Batch frame export
- Dark mode
- Keyboard shortcuts (desktop)

---

## 15. Acceptance Criteria
- Works on latest iOS Safari
- Works in iOS standalone (installed PWA)
- Share sheet opens on iOS (when supported)
- Captured frame matches visible preview
- App usable offline after first load
- No console errors
- No external API calls
- Lighthouse PWA score ≥ 90

---

## 16. Deployment Strategy

### Hosting
- Cloudflare Pages (Primary)
- GitHub Pages (Backup)

### Requirements
- HTTPS
- Valid manifest
- Service Worker active
- Installable on iOS home screen

---

## Product Philosophy
FrameSnap should feel:
- Instant
- Lightweight
- Private
- Native-like on iOS
- Zero friction
- Zero account
