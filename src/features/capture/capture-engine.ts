import { AppError } from "../../shared/errors";
import { fileSafeTimestamp } from "../../ui/format";

export type CaptureResult = {
  blob: Blob;
  file: File;
  width: number;
  height: number;
  timestampSec: number;
};

const SEEK_TIMEOUT_MS = 3000;
const SEEK_EPSILON_SEC = 0.001;
const FRAME_READY_TIMEOUT_MS = 220;

function waitForSeek(video: HTMLVideoElement, targetSec: number, timeoutMs: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (Math.abs(video.currentTime - targetSec) <= SEEK_EPSILON_SEC) {
      resolve();
      return;
    }

    const onSeeked = (): void => {
      cleanup();
      resolve();
    };

    const onError = (): void => {
      cleanup();
      reject(new AppError("VIDEO_LOAD_FAILED", "Video seek failed"));
    };

    const timer = window.setTimeout(() => {
      cleanup();
      reject(new AppError("SEEK_TIMEOUT", "Seek timeout"));
    }, timeoutMs);

    const cleanup = (): void => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      window.clearTimeout(timer);
    };

    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.currentTime = targetSec;
  });
}

async function seekWithRetry(video: HTMLVideoElement, targetSec: number): Promise<void> {
  try {
    await waitForSeek(video, targetSec, SEEK_TIMEOUT_MS);
  } catch (error: unknown) {
    if (error instanceof AppError && error.code === "SEEK_TIMEOUT") {
      await waitForSeek(video, targetSec, SEEK_TIMEOUT_MS);
      return;
    }

    throw error;
  }
}

function nextAnimationFrame(): Promise<void> {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

async function waitForRenderedFrame(video: HTMLVideoElement): Promise<void> {
  const withFrameCallback = video as HTMLVideoElement & {
    requestVideoFrameCallback?: (callback: (now: DOMHighResTimeStamp, metadata: unknown) => void) => number;
  };

  if (typeof withFrameCallback.requestVideoFrameCallback === "function") {
    await Promise.race([
      new Promise<void>((resolve) => {
        withFrameCallback.requestVideoFrameCallback?.(() => resolve());
      }),
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, FRAME_READY_TIMEOUT_MS);
      })
    ]);
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 50);
    });
  }

  await nextAnimationFrame();
  await nextAnimationFrame();
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new AppError("CAPTURE_FAILED", "Canvas export failed"));
        return;
      }

      resolve(blob);
    }, type);
  });
}

export async function captureFrameAt(video: HTMLVideoElement, targetSec: number): Promise<CaptureResult> {
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  const clampedTarget = Math.max(0, Math.min(targetSec, duration));
  const shouldResumePlayback = !video.paused && !video.ended;

  video.pause();

  await seekWithRetry(video, clampedTarget);
  await waitForRenderedFrame(video);

  const width = video.videoWidth;
  const height = video.videoHeight;

  if (width <= 0 || height <= 0) {
    throw new AppError("CAPTURE_FAILED", "Invalid video dimensions");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    throw new AppError("CAPTURE_FAILED", "Could not acquire canvas context");
  }

  try {
    ctx.drawImage(video, 0, 0, width, height);
    const blob = await toBlob(canvas, "image/png");
    const file = new File([blob], `framesnap-${fileSafeTimestamp(clampedTarget)}.png`, {
      type: "image/png"
    });

    return {
      blob,
      file,
      width,
      height,
      timestampSec: clampedTarget
    };
  } finally {
    if (shouldResumePlayback) {
      void video.play().catch(() => {
        // Ignore autoplay/playback policy failures.
      });
    }
  }
}
