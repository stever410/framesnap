import { useEffect, useMemo, useReducer, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import { reducer } from "./reducer";
import { initialState } from "./types";
import { canShareFiles, isIOS } from "../platform/capability";
import {
  assertSupportedVideo,
  createVideoObjectUrl,
  revokeVideoObjectUrl,
} from "../features/video/video-engine";
import { captureFrameAt } from "../features/capture/capture-engine";
import { downloadCapture, shareCapture } from "../features/share/share-service";
import { AppError, toUserMessage } from "../shared/errors";
import { formatTimestamp, parseTimestampInput } from "../ui/format";

export function App(): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [timestampInput, setTimestampInput] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadState, setDownloadState] = useState<
    "idle" | "preparing" | "downloading"
  >("idle");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem("framesnap-theme");
      if (savedTheme === "dark" || savedTheme === "light") {
        setTheme(savedTheme);
      }
    } catch {
      // Ignore storage access failures and keep in-memory default.
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem("framesnap-theme", theme);
    } catch {
      // Ignore storage access failures and keep in-memory theme only.
    }
  }, [theme]);

  useEffect(() => {
    dispatch({
      type: "app/bootstrap",
      payload: {
        canShareFiles: canShareFiles(),
        isIOS: isIOS(),
      },
    });
  }, []);

  useEffect(() => {
    return () => {
      revokeVideoObjectUrl(state.video.objectUrl);
    };
  }, [state.video.objectUrl]);

  useEffect(() => {
    if (!state.capture.file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(state.capture.file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [state.capture.file]);

  const currentTimestampLabel = useMemo(
    () => formatTimestamp(state.video.currentTimeSec),
    [state.video.currentTimeSec],
  );
  const hasVideo = state.video.objectUrl !== null;
  const appVersion = __APP_VERSION__;
  const SEEK_TIMEOUT_MS = 3000;

  const loadVideoMetadata = (
    url: string,
  ): Promise<{ durationSec: number; width: number; height: number }> => {
    return new Promise<{ durationSec: number; width: number; height: number }>(
      (resolve, reject) => {
        const probe = document.createElement("video");
        probe.preload = "metadata";
        probe.src = url;

        const onLoaded = (): void => {
          cleanup();
          resolve({
            durationSec: probe.duration,
            width: probe.videoWidth,
            height: probe.videoHeight,
          });
        };

        const onError = (): void => {
          cleanup();
          reject(
            new AppError("VIDEO_LOAD_FAILED", "Video metadata failed to load"),
          );
        };

        const cleanup = (): void => {
          probe.removeEventListener("loadedmetadata", onLoaded);
          probe.removeEventListener("error", onError);
          probe.src = "";
        };

        probe.addEventListener("loadedmetadata", onLoaded, { once: true });
        probe.addEventListener("error", onError, { once: true });
      },
    );
  };

  const seekVideoTo = (
    video: HTMLVideoElement,
    targetSec: number,
  ): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      if (Math.abs(video.currentTime - targetSec) <= 0.001) {
        resolve();
        return;
      }

      const onSeeked = (): void => {
        cleanup();
        resolve();
      };

      const onError = (): void => {
        cleanup();
        reject(new AppError("SEEK_TIMEOUT", "Seek failed"));
      };

      const timer = window.setTimeout(() => {
        cleanup();
        reject(new AppError("SEEK_TIMEOUT", "Seek timeout"));
      }, SEEK_TIMEOUT_MS);

      const cleanup = (): void => {
        video.removeEventListener("seeked", onSeeked);
        video.removeEventListener("error", onError);
        window.clearTimeout(timer);
      };

      video.addEventListener("seeked", onSeeked, { once: true });
      video.addEventListener("error", onError, { once: true });
      video.currentTime = targetSec;
    });
  };

  const onSelectVideo = async (event: Event): Promise<void> => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    let nextObjectUrl: string | null = null;

    if (!file) {
      return;
    }

    dispatch({ type: "video/loading" });

    try {
      assertSupportedVideo(file);
      const objectUrl = createVideoObjectUrl(file);
      nextObjectUrl = objectUrl;
      revokeVideoObjectUrl(state.video.objectUrl);
      const metadata = await loadVideoMetadata(objectUrl);

      dispatch({
        type: "video/ready",
        payload: {
          fileName: file.name,
          objectUrl,
          durationSec: metadata.durationSec,
          width: metadata.width,
          height: metadata.height,
        },
      });
      setTimestampInput("");
    } catch (error: unknown) {
      revokeVideoObjectUrl(nextObjectUrl);
      const code = error instanceof AppError ? error.code : "VIDEO_LOAD_FAILED";
      dispatch({
        type: "error/set",
        payload: {
          code,
          message: toUserMessage(error),
        },
      });
    } finally {
      input.value = "";
    }
  };

  const onTimeUpdate = (): void => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    dispatch({
      type: "video/time-updated",
      payload: { currentTimeSec: video.currentTime },
    });
  };

  const onCapture = async (): Promise<void> => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const parsed = parseTimestampInput(timestampInput);
    const target = parsed ?? state.video.currentTimeSec;

    dispatch({ type: "capture/start" });

    try {
      const result = await captureFrameAt(video, target);
      dispatch({
        type: "capture/ready",
        payload: {
          file: result.file,
          width: result.width,
          height: result.height,
          timestampSec: result.timestampSec,
        },
      });
    } catch (error: unknown) {
      const code = error instanceof AppError ? error.code : "CAPTURE_FAILED";
      dispatch({
        type: "error/set",
        payload: {
          code,
          message: toUserMessage(error),
        },
      });
    }
  };

  const onShare = async (): Promise<void> => {
    if (!state.capture.file) {
      return;
    }

    try {
      const result = await shareCapture(state.capture.file);
      if (result === "failed") {
        dispatch({
          type: "error/set",
          payload: {
            code: "SHARE_FAILED",
            message: "Share is unavailable. Use Download instead.",
          },
        });
      }
    } catch (error: unknown) {
      dispatch({
        type: "error/set",
        payload: {
          code: "SHARE_FAILED",
          message: toUserMessage(error),
        },
      });
    }
  };

  const onDownload = (): void => {
    if (!state.capture.file) {
      return;
    }

    if (downloadState !== "idle") {
      return;
    }

    setDownloadState("preparing");
    window.setTimeout(() => {
      setDownloadState("downloading");
      window.setTimeout(() => {
        downloadCapture(state.capture.file as File);
        setDownloadState("idle");
      }, 120);
    }, 80);
  };

  const onOpenVideoPicker = (): void => {
    fileInputRef.current?.click();
  };

  const syncWithCurrentFrame = (): void => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const currentTime = Number.isFinite(video.currentTime)
      ? Math.max(0, video.currentTime)
      : 0;
    dispatch({
      type: "video/time-updated",
      payload: { currentTimeSec: currentTime },
    });
    setTimestampInput(formatTimestamp(currentTime));
  };

  const seekToTimestampInput = async (): Promise<void> => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const parsed = parseTimestampInput(timestampInput);
    if (parsed === null) {
      return;
    }

    const duration = state.video.durationSec;
    const clampedTime =
      Number.isFinite(duration) && duration > 0
        ? Math.max(0, Math.min(parsed, duration))
        : Math.max(0, parsed);

    try {
      await seekVideoTo(video, clampedTime);
      dispatch({
        type: "video/time-updated",
        payload: { currentTimeSec: clampedTime },
      });
      setTimestampInput(formatTimestamp(clampedTime));
    } catch {
      dispatch({
        type: "error/set",
        payload: {
          code: "SEEK_TIMEOUT",
          message: "Could not seek to that timestamp. Try a nearby value.",
        },
      });
    }
  };

  return (
    <main class="app-shell">
      <header
        class={hasVideo ? "glass card hero hero--compact" : "glass card hero"}
      >
        <div class="hero-top">
          <div class="hero-headline">
            <h1 class="display">FrameSnap</h1>
            <p class="body hero-subtitle">
              Capture precise frames from local videos. No uploads. No tracking.
            </p>
          </div>
          <button
            type="button"
            class="theme-icon-toggle"
            onClick={() =>
              setTheme((prev) => (prev === "light" ? "dark" : "light"))
            }
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            title={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            <span class="theme-icon-toggle__sun icon-sm" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="4.2"
                  stroke="currentColor"
                  stroke-width="1.8"
                />
                <path
                  d="M12 2.8V5.2M12 18.8V21.2M21.2 12H18.8M5.2 12H2.8M18.5 5.5L16.8 7.2M7.2 16.8L5.5 18.5M18.5 18.5L16.8 16.8M7.2 7.2L5.5 5.5"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
              </svg>
            </span>
            <span class="theme-icon-toggle__moon icon-sm" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M14.2 3.4a8.8 8.8 0 1 0 6.4 14.8A9.2 9.2 0 0 1 14.2 3.4Z"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
          </button>
        </div>
      </header>

      {state.error.message ? (
        <section class="error-banner" role="status" aria-live="polite">
          <p>{state.error.message}</p>
          <button
            type="button"
            class="btn-secondary"
            onClick={() => dispatch({ type: "error/clear" })}
          >
            Dismiss
          </button>
        </section>
      ) : null}

      <input
        ref={fileInputRef}
        id="video-upload"
        class="file-input-hidden"
        type="file"
        accept="video/*"
        onChange={(event) => {
          void onSelectVideo(event);
        }}
      />

      {!hasVideo ? (
        <section class="glass card upload-card">
          <button
            type="button"
            class="upload-dropzone"
            onClick={onOpenVideoPicker}
          >
            <span class="upload-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 4V15"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
                <path
                  d="M8 8L12 4L16 8"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
                <path
                  d="M4.5 15.5V17.5C4.5 18.6046 5.39543 19.5 6.5 19.5H17.5C18.6046 19.5 19.5 18.6046 19.5 17.5V15.5"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
              </svg>
            </span>
            <span class="upload-title">Drop your video here or browse</span>
            <span class="upload-subtitle">
              MP4, MOV, WebM. Processed locally on your device.
            </span>
            <span class="upload-cta">Choose Video</span>
          </button>
          <p class="meta upload-meta">
            {state.video.fileName
              ? `Current file: ${state.video.fileName}`
              : "No file selected yet."}
          </p>
        </section>
      ) : null}

      {hasVideo ? (
        <section class="glass card video-stage">
          <div class="video-stage__header">
            <p
              class="video-stage__filename"
              title={state.video.fileName ?? undefined}
            >
              {state.video.fileName ?? "Selected video"}
            </p>
            <button
              type="button"
              class="video-stage__change"
              onClick={onOpenVideoPicker}
            >
              <span class="icon-sm" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7.8 8.6A6.6 6.6 0 0 1 18 14.2M16.2 15.4A6.6 6.6 0 0 1 6 9.8"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                  <path
                    d="M17.9 10.4V6.8H14.3M6.1 13.6V17.2H9.7"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
              Change Video
            </button>
          </div>

          <div class="video-stage__viewport">
            <video
              ref={videoRef}
              class="video-stage__media"
              src={state.video.objectUrl ?? undefined}
              controls
              playsInline
              preload="metadata"
              onTimeUpdate={onTimeUpdate}
              onPause={() => {
                syncWithCurrentFrame();
              }}
              onEnded={() => {
                syncWithCurrentFrame();
              }}
              aria-label="Video preview"
            />
          </div>

          <div class="video-stage__controls">
            <div class="capture-controls">
              <p class="meta video-stage__label with-icon">
                <span class="icon-sm" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="12"
                      cy="12"
                      r="8.5"
                      stroke="currentColor"
                      stroke-width="1.8"
                    />
                    <path
                      d="M12 7.5V12L15 13.8"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                    />
                  </svg>
                </span>
                Current time {currentTimestampLabel}
              </p>
              <label
                class="meta video-stage__label with-icon"
                htmlFor="timestamp-input"
              >
                <span class="icon-sm" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect
                      x="4.5"
                      y="6"
                      width="15"
                      height="12"
                      rx="2.2"
                      stroke="currentColor"
                      stroke-width="1.8"
                    />
                    <path
                      d="M8 10.5H16M8 14H13"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                    />
                  </svg>
                </span>
                Enter timestamp (mm:ss.xxx)
              </label>
              <div class="timestamp-input-wrap">
                <input
                  id="timestamp-input"
                  class="timestamp-input"
                  value={timestampInput}
                  placeholder={currentTimestampLabel}
                  inputMode="decimal"
                  onInput={(event) =>
                    setTimestampInput((event.target as HTMLInputElement).value)
                  }
                  onBlur={() => {
                    void seekToTimestampInput();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void seekToTimestampInput();
                    }
                  }}
                />
              </div>
              <button
                type="button"
                class="btn-primary with-icon"
                disabled={state.phase === "capturing"}
                onClick={() => {
                  void onCapture();
                }}
              >
                <span class="icon-sm" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect
                      x="4.5"
                      y="7.5"
                      width="15"
                      height="9"
                      rx="2.2"
                      stroke="currentColor"
                      stroke-width="1.8"
                    />
                    <circle cx="12" cy="12" r="2.4" fill="currentColor" />
                  </svg>
                </span>
                {state.phase === "capturing" ? "Capturing..." : "Capture Frame"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {previewUrl && state.capture.timestampSec !== null ? (
        <section class="glass card capture-panel">
          <img
            class="capture-image"
            src={previewUrl}
            alt="Captured frame preview"
          />
          <div class="chip-row">
            <span class="chip">
              {formatTimestamp(state.capture.timestampSec)}
            </span>
            <span class="chip">
              {state.capture.width} x {state.capture.height}
            </span>
          </div>

          <div class="action-bar">
            {state.capabilities.canShareFiles ? (
              <button
                type="button"
                class="btn-primary with-icon"
                onClick={() => {
                  void onShare();
                }}
              >
                <span class="icon-sm" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 4V14"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                    />
                    <path
                      d="M8.5 7.5L12 4L15.5 7.5"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                    />
                    <rect
                      x="5"
                      y="14.5"
                      width="14"
                      height="5"
                      rx="1.8"
                      stroke="currentColor"
                      stroke-width="1.8"
                    />
                  </svg>
                </span>
                Share
              </button>
            ) : null}
            <button
              type="button"
              class="btn-secondary with-icon"
              onClick={onDownload}
              disabled={downloadState !== "idle"}
            >
              <span class="icon-sm" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 4V14"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                  <path
                    d="M8.5 10.5L12 14L15.5 10.5"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                  <rect
                    x="5"
                    y="15"
                    width="14"
                    height="4.5"
                    rx="1.8"
                    stroke="currentColor"
                    stroke-width="1.8"
                  />
                </svg>
              </span>
              {downloadState === "idle"
                ? "Download"
                : downloadState === "preparing"
                  ? "Preparing..."
                  : "Downloading..."}
            </button>
            <button
              type="button"
              class="btn-text with-icon"
              onClick={() => dispatch({ type: "capture/reset" })}
            >
              <span class="icon-sm" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6.5 12a5.5 5.5 0 1 0 1.3-3.5M6.5 8V4.8M6.5 8H9.7"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
              Capture Again
            </button>
          </div>

          {state.capabilities.isIOS ? (
            <p class="meta">On iPhone, tap Share and choose Save Image.</p>
          ) : null}
        </section>
      ) : null}

      <footer class="app-footer" aria-label="App credits">
        <p class="app-footer__text">
          <span class="app-footer__item">
            <span class="icon-sm app-footer__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 6.5h10M7 12h10M7 17.5h6"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
              </svg>
            </span>
            FrameSnap v{appVersion}
          </span>
          <span class="app-footer__item">
            <span class="icon-sm app-footer__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 4.5a7.5 7.5 0 0 0-2.37 14.61c.38.07.51-.16.51-.37v-1.3c-2.08.45-2.52-.88-2.52-.88-.34-.86-.82-1.09-.82-1.09-.67-.46.05-.45.05-.45.74.05 1.14.75 1.14.75.66 1.12 1.73.8 2.15.61.07-.47.26-.8.47-.99-1.66-.19-3.4-.82-3.4-3.67 0-.81.29-1.47.76-1.99-.08-.19-.33-.95.07-1.98 0 0 .62-.2 2.03.76a7.02 7.02 0 0 1 3.7 0c1.4-.96 2.03-.76 2.03-.76.4 1.03.15 1.79.07 1.98.47.52.76 1.18.76 1.99 0 2.86-1.74 3.48-3.4 3.67.26.23.5.69.5 1.4v2.08c0 .21.14.45.52.37A7.5 7.5 0 0 0 12 4.5Z"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            Made by{" "}
            <a
              class="app-footer__link"
              href="https://github.com/stever410"
              target="_blank"
              rel="noreferrer"
            >
              stever410
            </a>
            for my girlfriend, Orchix.
          </span>
        </p>
      </footer>
    </main>
  );
}
