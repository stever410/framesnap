import { useEffect, useMemo, useReducer, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import { reducer } from "./reducer";
import { initialState } from "./types";
import { canShareFiles, isIOS } from "../platform/capability";
import { assertSupportedVideo, createVideoObjectUrl, revokeVideoObjectUrl } from "../features/video/video-engine";
import { captureFrameAt } from "../features/capture/capture-engine";
import { downloadCapture, shareCapture } from "../features/share/share-service";
import { AppError, toUserMessage } from "../shared/errors";
import { formatTimestamp, parseTimestampInput } from "../ui/format";

export function App(): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [timestampInput, setTimestampInput] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
        isIOS: isIOS()
      }
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

  const currentTimestampLabel = useMemo(() => formatTimestamp(state.video.currentTimeSec), [state.video.currentTimeSec]);

  const loadVideoMetadata = (url: string): Promise<{ durationSec: number; width: number; height: number }> => {
    return new Promise<{ durationSec: number; width: number; height: number }>((resolve, reject) => {
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.src = url;

      const onLoaded = (): void => {
        cleanup();
        resolve({
          durationSec: probe.duration,
          width: probe.videoWidth,
          height: probe.videoHeight
        });
      };

      const onError = (): void => {
        cleanup();
        reject(new AppError("VIDEO_LOAD_FAILED", "Video metadata failed to load"));
      };

      const cleanup = (): void => {
        probe.removeEventListener("loadedmetadata", onLoaded);
        probe.removeEventListener("error", onError);
        probe.src = "";
      };

      probe.addEventListener("loadedmetadata", onLoaded, { once: true });
      probe.addEventListener("error", onError, { once: true });
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
          height: metadata.height
        }
      });
      setTimestampInput("");
    } catch (error: unknown) {
      revokeVideoObjectUrl(nextObjectUrl);
      const code = error instanceof AppError ? error.code : "VIDEO_LOAD_FAILED";
      dispatch({
        type: "error/set",
        payload: {
          code,
          message: toUserMessage(error)
        }
      });
    } finally {
      input.value = "";
    }
  };

  const onScrub = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    const nextTime = Number(input.value);
    const video = videoRef.current;
    if (!video || !Number.isFinite(nextTime)) {
      return;
    }

    video.currentTime = nextTime;
    dispatch({ type: "video/time-updated", payload: { currentTimeSec: nextTime } });
  };

  const onTimeUpdate = (): void => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    dispatch({ type: "video/time-updated", payload: { currentTimeSec: video.currentTime } });
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
          timestampSec: result.timestampSec
        }
      });
    } catch (error: unknown) {
      const code = error instanceof AppError ? error.code : "CAPTURE_FAILED";
      dispatch({
        type: "error/set",
        payload: {
          code,
          message: toUserMessage(error)
        }
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
            message: "Share is unavailable. Use Download instead."
          }
        });
      }
    } catch (error: unknown) {
      dispatch({
        type: "error/set",
        payload: {
          code: "SHARE_FAILED",
          message: toUserMessage(error)
        }
      });
    }
  };

  const onDownload = (): void => {
    if (!state.capture.file) {
      return;
    }

    downloadCapture(state.capture.file);
  };

  return (
    <main class="app-shell">
      <header class="glass card hero">
        <div class="hero-top">
          <div class="hero-headline">
            <h1 class="display">FrameSnap</h1>
            <p class="body hero-subtitle">Capture precise frames from local videos. No uploads. No tracking.</p>
          </div>
          <label class="theme-switch">
            <input
              type="checkbox"
              class="theme-switch__input"
              checked={theme === "dark"}
              onChange={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
              aria-label="Toggle dark mode"
            />
            <span class="theme-switch__track" aria-hidden="true">
              <span class="theme-switch__thumb" />
            </span>
            <span class="theme-switch__text">Dark Mode</span>
          </label>
        </div>
      </header>

      {state.error.message ? (
        <section class="error-banner" role="status" aria-live="polite">
          <p>{state.error.message}</p>
          <button type="button" class="btn-secondary" onClick={() => dispatch({ type: "error/clear" })}>
            Dismiss
          </button>
        </section>
      ) : null}

      <section class="glass card upload-card">
        <input
          id="video-upload"
          class="file-input-hidden"
          type="file"
          accept="video/*"
          onChange={(event) => {
            void onSelectVideo(event);
          }}
        />
        <label class="upload-dropzone" htmlFor="video-upload">
          <span class="upload-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 4V15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              <path d="M8 8L12 4L16 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              <path
                d="M4.5 15.5V17.5C4.5 18.6046 5.39543 19.5 6.5 19.5H17.5C18.6046 19.5 19.5 18.6046 19.5 17.5V15.5"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
          </span>
          <span class="upload-title">Drop your video here or browse</span>
          <span class="upload-subtitle">MP4, MOV, WebM. Processed locally on your device.</span>
          <span class="upload-cta">Choose Video</span>
        </label>
        <p class="meta upload-meta">
          {state.video.fileName ? `Current file: ${state.video.fileName}` : "No file selected yet."}
        </p>
      </section>

      {state.video.objectUrl ? (
        <section class="glass card video-panel">
          <video
            ref={videoRef}
            class="video"
            src={state.video.objectUrl}
            controls
            playsInline
            onTimeUpdate={onTimeUpdate}
            aria-label="Video preview"
          />

          <div class="timeline-wrap">
            <label class="meta" htmlFor="timeline">
              Timeline {currentTimestampLabel}
            </label>
            <input
              id="timeline"
              class="timeline"
              type="range"
              min={0}
              max={state.video.durationSec}
              value={state.video.currentTimeSec}
              step={0.001}
              onInput={onScrub}
            />
          </div>

          <div class="capture-controls">
            <label class="meta" htmlFor="timestamp-input">
              Enter timestamp (mm:ss.xxx)
            </label>
            <input
              id="timestamp-input"
              class="timestamp-input"
              value={timestampInput}
              placeholder={currentTimestampLabel}
              onInput={(event) => setTimestampInput((event.target as HTMLInputElement).value)}
            />
            <button
              type="button"
              class="btn-primary"
              disabled={state.phase === "capturing"}
              onClick={() => {
                void onCapture();
              }}
            >
              {state.phase === "capturing" ? "Capturing..." : "Capture Frame"}
            </button>
          </div>
        </section>
      ) : null}

      {previewUrl && state.capture.timestampSec !== null ? (
        <section class="glass card capture-panel">
          <img class="capture-image" src={previewUrl} alt="Captured frame preview" />
          <div class="chip-row">
            <span class="chip">{formatTimestamp(state.capture.timestampSec)}</span>
            <span class="chip">
              {state.capture.width} x {state.capture.height}
            </span>
          </div>

          <div class="action-bar">
            {state.capabilities.canShareFiles ? (
              <button
                type="button"
                class="btn-primary"
                onClick={() => {
                  void onShare();
                }}
              >
                Share
              </button>
            ) : null}
            <button type="button" class="btn-secondary" onClick={onDownload}>
              Download
            </button>
            <button type="button" class="btn-text" onClick={() => dispatch({ type: "capture/reset" })}>
              Capture Again
            </button>
          </div>

          {state.capabilities.isIOS ? <p class="meta">On iPhone, tap Share and choose Save Image.</p> : null}
        </section>
      ) : null}
    </main>
  );
}
