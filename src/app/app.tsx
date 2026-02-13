import { useEffect, useMemo, useReducer, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import { reducer } from "./reducer";
import { initialState } from "./types";
import { canShareFiles, isAndroid, isIOS } from "../platform/capability";
import {
  assertSupportedVideo,
  createVideoObjectUrl,
  revokeVideoObjectUrl,
} from "../features/video/video-engine";
import {
  CAPTURE_UPSCALE_FACTORS,
  captureFrameAt,
  type CaptureUpscaleFactor,
} from "../features/capture/capture-engine";
import { downloadCapture, shareCapture } from "../features/share/share-service";
import { AppError, toUserMessage } from "../shared/errors";
import {
  formatFileSize,
  formatTimestamp,
  parseTimestampInput,
} from "../ui/format";

export function App(): JSX.Element {
  type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{
      outcome: "accepted" | "dismissed";
      platform: string;
    }>;
  };
  type IOSNavigator = Navigator & { standalone?: boolean };

  const [state, dispatch] = useReducer(reducer, initialState);
  const [timestampInput, setTimestampInput] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isA2HSHelpOpen, setIsA2HSHelpOpen] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallEligible, setIsInstallEligible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [downloadState, setDownloadState] = useState<
    "idle" | "preparing" | "downloading"
  >("idle");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [captureUpscaleFactor, setCaptureUpscaleFactor] =
    useState<CaptureUpscaleFactor>(1);
  const [isApplyingUpscale, setIsApplyingUpscale] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isEditingTimestampRef = useRef(false);

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
        isAndroid: isAndroid(),
      },
    });
  }, []);

  useEffect(() => {
    const detectStandalone = (): boolean => {
      const mediaStandalone = window.matchMedia(
        "(display-mode: standalone)",
      ).matches;
      const iosStandalone = Boolean((navigator as IOSNavigator).standalone);
      return mediaStandalone || iosStandalone;
    };
    const isAndroidMobile = (): boolean =>
      isAndroid() && window.matchMedia("(max-width: 680px)").matches;

    setIsInstalled(detectStandalone());

    const onBeforeInstallPrompt = (event: Event): void => {
      // Use native banner on Android mobile instead of custom deferred prompt.
      if (isAndroidMobile()) {
        setDeferredInstallPrompt(null);
        setIsInstallEligible(false);
        return;
      }

      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      setDeferredInstallPrompt(installEvent);
      setIsInstallEligible(true);
    };

    const onAppInstalled = (): void => {
      setIsInstalled(true);
      setIsInstallEligible(false);
      setDeferredInstallPrompt(null);
      setIsA2HSHelpOpen(false);
    };

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = (): void => {
      if (detectStandalone()) {
        onAppInstalled();
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    mediaQuery.addEventListener("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      mediaQuery.removeEventListener("change", onDisplayModeChange);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 680px)");
    const onViewportChange = (): void => {
      setIsMobileViewport(mediaQuery.matches);
    };

    onViewportChange();
    mediaQuery.addEventListener("change", onViewportChange);

    return () => {
      mediaQuery.removeEventListener("change", onViewportChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      revokeVideoObjectUrl(state.video.objectUrl);
    };
  }, [state.video.objectUrl]);

  useEffect(() => {
    if (!state.capture.file) {
      setPreviewUrl(null);
      setIsCaptureModalOpen(false);
      return;
    }

    const objectUrl = URL.createObjectURL(state.capture.file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [state.capture.file]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }

      if (isA2HSHelpOpen) {
        setIsA2HSHelpOpen(false);
        return;
      }

      if (isCaptureModalOpen) {
        setIsCaptureModalOpen(false);
        dispatch({ type: "capture/reset" });
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dispatch, isA2HSHelpOpen, isCaptureModalOpen]);

  const currentTimestampLabel = useMemo(
    () => formatTimestamp(state.video.currentTimeSec),
    [state.video.currentTimeSec],
  );
  const hasVideo = state.video.objectUrl !== null;
  const showInstallButton = !isInstalled && isInstallEligible;
  const showAddToHomeScreenButton =
    !isInstalled && state.capabilities.isIOS && !isInstallEligible;
  const showDesktopInstallButton = !isMobileViewport && showInstallButton;
  const showDesktopAddToHomeScreenButton =
    !isMobileViewport && showAddToHomeScreenButton;
  const showMobileIOSInstallFab =
    isMobileViewport && !isInstalled && state.capabilities.isIOS;
  const showMobileAndroidInstallCard =
    isMobileViewport &&
    !isInstalled &&
    state.capabilities.isAndroid &&
    showInstallButton;
  const showMobileFallbackInstallFab =
    isMobileViewport &&
    !isInstalled &&
    !state.capabilities.isIOS &&
    !state.capabilities.isAndroid;
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

    const currentTime = Number.isFinite(video.currentTime)
      ? Math.max(0, video.currentTime)
      : 0;

    dispatch({
      type: "video/time-updated",
      payload: { currentTimeSec: currentTime },
    });

    if (!isEditingTimestampRef.current) {
      setTimestampInput(formatTimestamp(currentTime));
    }
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
      const result = await captureFrameAt(video, target, {
        upscaleFactor: captureUpscaleFactor,
      });
      dispatch({
        type: "capture/ready",
        payload: {
          file: result.file,
          width: result.width,
          height: result.height,
          timestampSec: result.timestampSec,
        },
      });
      setIsCaptureModalOpen(true);
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

  const isValidUpscaleFactor = (
    value: number,
  ): value is CaptureUpscaleFactor => {
    return CAPTURE_UPSCALE_FACTORS.includes(value as CaptureUpscaleFactor);
  };

  const onChangeUpscaleFactor = async (
    nextFactor: CaptureUpscaleFactor,
  ): Promise<void> => {
    setCaptureUpscaleFactor(nextFactor);

    if (!isCaptureModalOpen || state.capture.timestampSec === null) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    setIsApplyingUpscale(true);
    dispatch({ type: "capture/start" });

    try {
      const result = await captureFrameAt(video, state.capture.timestampSec, {
        upscaleFactor: nextFactor,
      });
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
    } finally {
      setIsApplyingUpscale(false);
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

  const closeCaptureModal = (): void => {
    setIsCaptureModalOpen(false);
    dispatch({ type: "capture/reset" });
  };

  const onCaptureAgain = (): void => {
    closeCaptureModal();
  };

  const onInstallApp = async (): Promise<void> => {
    if (!deferredInstallPrompt) {
      return;
    }

    try {
      await deferredInstallPrompt.prompt();
      const choiceResult = await deferredInstallPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
      }
    } finally {
      setDeferredInstallPrompt(null);
      setIsInstallEligible(false);
    }
  };

  const onMobileInstallFabPress = (): void => {
    if (showInstallButton) {
      void onInstallApp();
      return;
    }

    setIsA2HSHelpOpen(true);
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
    <main
      class={
        hasVideo
          ? "app-shell app-shell--unified app-shell--video"
          : "app-shell app-shell--unified app-shell--upload-focus"
      }
    >
      <header class="glass card hero hero--compact">
        <div class="hero-headline">
          <div class="brand-title">
            <img
              class="brand-title__logo"
              src="/favicon.svg"
              alt=""
              width="34"
              height="34"
              aria-hidden="true"
            />
            <h1 class="display">FrameSnap</h1>
          </div>
          <p class="body hero-subtitle">
            Capture precise frames from local videos. No uploads. No tracking.
          </p>
        </div>
        <div class="hero-actions">
          {showDesktopInstallButton ? (
            <button
              type="button"
              class="btn-secondary with-icon hero-install-btn"
              onClick={() => {
                void onInstallApp();
              }}
            >
              <span class="icon-sm" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 4V13.8"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                  <path
                    d="M8.8 10.9L12 13.9L15.2 10.9"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <rect
                    x="5"
                    y="15.5"
                    width="14"
                    height="4"
                    rx="1.6"
                    stroke="currentColor"
                    stroke-width="1.8"
                  />
                </svg>
              </span>
              Install App
            </button>
          ) : null}
          {showDesktopAddToHomeScreenButton ? (
            <button
              type="button"
              class="btn-secondary hero-install-btn"
              onClick={() => setIsA2HSHelpOpen(true)}
            >
              Add to Home Screen
            </button>
          ) : null}
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

      {showMobileAndroidInstallCard ? (
        <section class="glass card mobile-install-card">
          <p class="mobile-install-card__title">Install FrameSnap</p>
          <button
            type="button"
            class="btn-primary with-icon mobile-install-card__button"
            onClick={() => {
              void onInstallApp();
            }}
          >
            <span class="icon-sm" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 4V13.8"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
                <path
                  d="M8.8 10.9L12 13.9L15.2 10.9"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <rect
                  x="5"
                  y="15.5"
                  width="14"
                  height="4"
                  rx="1.6"
                  stroke="currentColor"
                  stroke-width="1.8"
                />
              </svg>
            </span>
            Install App
          </button>
        </section>
      ) : null}

      {showMobileIOSInstallFab || showMobileFallbackInstallFab ? (
        <div class="floating-install-wrap">
          <button
            type="button"
            class="floating-install-fab"
            onClick={onMobileInstallFabPress}
            aria-label={
              showInstallButton
                ? "Install app"
                : state.capabilities.isIOS
                  ? "Add to Home Screen"
                  : "Install app help"
            }
            title={
              showInstallButton
                ? "Install App"
                : state.capabilities.isIOS
                  ? "Add to Home Screen"
                  : "Install App"
            }
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
          </button>
        </div>
      ) : null}

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
            <span class="upload-title">Drop your video here or browse</span>
            <span class="upload-subtitle">
              MP4, MOV, WebM. Processed locally on your device.
            </span>
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
            <div class="video-stage__title-wrap">
              <p class="video-stage__filename">Video Preview</p>
            </div>
            <button
              type="button"
              class="video-stage__change"
              onClick={onOpenVideoPicker}
            >
              <span class="icon-sm" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6.5 7.5H14.5L17.5 10V16.5H6.5V7.5Z"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M10.2 11.2L13.1 12.9L10.2 14.6V11.2Z"
                    stroke="currentColor"
                    stroke-width="1.8"
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
              onSeeked={() => {
                syncWithCurrentFrame();
              }}
              aria-label="Video preview"
            />
            <button
              type="button"
              class="btn-primary with-icon video-stage__capture-overlay"
              disabled={state.phase === "capturing"}
              onClick={() => {
                void onCapture();
              }}
              aria-label={
                state.phase === "capturing"
                  ? "Capturing frame"
                  : "Capture frame"
              }
              title={
                state.phase === "capturing"
                  ? "Capturing frame"
                  : "Capture frame"
              }
            >
              <span class="icon-sm" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <rect
                    x="5"
                    y="8"
                    width="14"
                    height="9"
                    rx="2"
                    stroke="currentColor"
                    stroke-width="1.8"
                  />
                  <path
                    d="M8.5 8L10 5.8H14L15.5 8"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="12.5"
                    r="2.3"
                    stroke="currentColor"
                    stroke-width="1.8"
                  />
                </svg>
              </span>
            </button>
          </div>

          <div class="video-stage__controls">
            <div class="capture-controls">
              <div class="timestamp-input-wrap">
                <input
                  id="timestamp-input"
                  class="timestamp-input"
                  value={timestampInput}
                  placeholder={currentTimestampLabel}
                  inputMode="decimal"
                  aria-label="Timestamp (mm:ss.xxx)"
                  onFocus={() => {
                    isEditingTimestampRef.current = true;
                  }}
                  onInput={(event) =>
                    setTimestampInput((event.target as HTMLInputElement).value)
                  }
                  onBlur={() => {
                    isEditingTimestampRef.current = false;
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
            </div>
          </div>
        </section>
      ) : null}

      {isCaptureModalOpen &&
      previewUrl &&
      state.capture.timestampSec !== null ? (
        <div
          class="modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeCaptureModal();
            }
          }}
        >
          <section
            class="glass card capture-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="capture-modal-title"
          >
            <div class="capture-modal__header">
              <h2 id="capture-modal-title" class="capture-modal__title">
                Captured Frame
              </h2>
              <button
                type="button"
                class="modal-close"
                onClick={closeCaptureModal}
                aria-label="Close captured frame preview"
              >
                <span class="icon-sm" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 7L17 17M17 7L7 17"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                    />
                  </svg>
                </span>
              </button>
            </div>
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
              <span class="chip">
                {state.capture.file
                  ? formatFileSize(state.capture.file.size)
                  : "0 B"}
              </span>
            </div>
            <div class="capture-upscale-panel">
              <div class="capture-output-wrap">
                <label class="capture-output-label" htmlFor="upscale-select">
                  Download size
                </label>
                <select
                  id="upscale-select"
                  class="capture-output-select"
                  value={`${captureUpscaleFactor}`}
                  disabled={isApplyingUpscale}
                  onChange={(event) => {
                    const nextValue = Number(
                      (event.target as HTMLSelectElement).value,
                    );
                    if (isValidUpscaleFactor(nextValue)) {
                      void onChangeUpscaleFactor(nextValue);
                    }
                  }}
                >
                  {CAPTURE_UPSCALE_FACTORS.map((factor) => (
                    <option key={factor} value={factor}>
                      {factor === 1
                        ? "Original (1x)"
                        : `Upscaled (${factor}x)`}
                    </option>
                  ))}
                </select>
              </div>
              <p class="capture-upscale-note">
                Upscale increases output dimensions for export. It may look
                smoother but does not add real detail.
              </p>
              {isApplyingUpscale ? (
                <p class="capture-upscale-status">Updating captured frame...</p>
              ) : null}
            </div>

            <div class="capture-modal__actions">
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
                onClick={onCaptureAgain}
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
        </div>
      ) : null}

      {isA2HSHelpOpen ? (
        <div
          class="modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsA2HSHelpOpen(false);
            }
          }}
        >
          <section
            class="glass card a2hs-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="a2hs-modal-title"
          >
            <div class="capture-modal__header">
              <h2 id="a2hs-modal-title" class="capture-modal__title">
                {state.capabilities.isIOS
                  ? "📲 Add FrameSnap to Home Screen"
                  : "🚀 Install FrameSnap"}
              </h2>
              <button
                type="button"
                class="modal-close"
                onClick={() => setIsA2HSHelpOpen(false)}
                aria-label="Close add to home screen help"
              >
                <span class="icon-sm" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 7L17 17M17 7L7 17"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                    />
                  </svg>
                </span>
              </button>
            </div>
            <ol class="a2hs-modal__steps">
              {state.capabilities.isIOS ? (
                <>
                  <li>Tap the Share button in Safari.</li>
                  <li>Scroll down and tap Add to Home Screen.</li>
                  <li>Tap Add to install FrameSnap on your iPhone.</li>
                </>
              ) : (
                <>
                  <li>Open your browser menu.</li>
                  <li>Tap Install App or Add to Home Screen.</li>
                  <li>Confirm install to pin FrameSnap.</li>
                </>
              )}
            </ol>
          </section>
        </div>
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
