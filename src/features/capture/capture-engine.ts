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

function waitForSeek(video: HTMLVideoElement, targetSec: number, timeoutMs: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
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

  await seekWithRetry(video, clampedTarget);
  await nextAnimationFrame();

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
}
