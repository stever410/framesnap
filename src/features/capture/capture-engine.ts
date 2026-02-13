import { AppError } from "../../shared/errors";
import { fileSafeTimestamp } from "../../ui/format";
import type { CaptureUpscaleFactor } from "./types/capture-upscale.types";

export type CaptureResult = {
  blob: Blob;
  file: File;
  width: number;
  height: number;
  timestampSec: number;
};

type CaptureOptions = {
  upscaleFactor?: CaptureUpscaleFactor;
};

const SEEK_TIMEOUT_MS = 3000;
const SEEK_EPSILON_SEC = 0.001;
const FRAME_READY_TIMEOUT_MS = 220;
const MAX_UPSCALED_EDGE_PX = 8192;
const BLACK_CHANNEL_MAX = 18;
const EDGE_DARK_RATIO = 0.995;
const EDGE_SCAN_STEP = 2;
const MIN_TRIM_PX = 8;
const MIN_TRIM_RATIO = 0.02;

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
    requestVideoFrameCallback?: (
      callback: (now: DOMHighResTimeStamp, metadata: unknown) => void,
    ) => number;
  };

  if (typeof withFrameCallback.requestVideoFrameCallback === "function") {
    await Promise.race([
      new Promise<void>((resolve) => {
        withFrameCallback.requestVideoFrameCallback?.(() => resolve());
      }),
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, FRAME_READY_TIMEOUT_MS);
      }),
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

function isDarkPixel(r: number, g: number, b: number): boolean {
  return r <= BLACK_CHANNEL_MAX && g <= BLACK_CHANNEL_MAX && b <= BLACK_CHANNEL_MAX;
}

function rowDarkRatio(data: Uint8ClampedArray, width: number, y: number): number {
  let total = 0;
  let dark = 0;

  for (let x = 0; x < width; x += EDGE_SCAN_STEP) {
    const index = (y * width + x) * 4;
    if (isDarkPixel(data[index] ?? 0, data[index + 1] ?? 0, data[index + 2] ?? 0)) {
      dark += 1;
    }
    total += 1;
  }

  return total > 0 ? dark / total : 0;
}

function colDarkRatio(data: Uint8ClampedArray, width: number, height: number, x: number): number {
  let total = 0;
  let dark = 0;

  for (let y = 0; y < height; y += EDGE_SCAN_STEP) {
    const index = (y * width + x) * 4;
    if (isDarkPixel(data[index] ?? 0, data[index + 1] ?? 0, data[index + 2] ?? 0)) {
      dark += 1;
    }
    total += 1;
  }

  return total > 0 ? dark / total : 0;
}

function _trimLetterboxBars(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || width <= 0 || height <= 0) {
    return canvas;
  }

  const frame = ctx.getImageData(0, 0, width, height);
  const data = frame.data;

  let top = 0;
  while (top < height && rowDarkRatio(data, width, top) >= EDGE_DARK_RATIO) {
    top += 1;
  }

  let bottom = height - 1;
  while (bottom >= top && rowDarkRatio(data, width, bottom) >= EDGE_DARK_RATIO) {
    bottom -= 1;
  }

  let left = 0;
  while (left < width && colDarkRatio(data, width, height, left) >= EDGE_DARK_RATIO) {
    left += 1;
  }

  let right = width - 1;
  while (right >= left && colDarkRatio(data, width, height, right) >= EDGE_DARK_RATIO) {
    right -= 1;
  }

  const trimTop = top;
  const trimBottom = height - 1 - bottom;
  const trimLeft = left;
  const trimRight = width - 1 - right;
  const horizontalTrim = trimLeft + trimRight;
  const verticalTrim = trimTop + trimBottom;
  const minHorizontalTrim = Math.max(MIN_TRIM_PX, Math.floor(width * MIN_TRIM_RATIO));
  const minVerticalTrim = Math.max(MIN_TRIM_PX, Math.floor(height * MIN_TRIM_RATIO));
  const shouldTrimHorizontally = horizontalTrim >= minHorizontalTrim;
  const shouldTrimVertically = verticalTrim >= minVerticalTrim;

  if (!shouldTrimHorizontally && !shouldTrimVertically) {
    return canvas;
  }

  const cropLeft = shouldTrimHorizontally ? trimLeft : 0;
  const cropTop = shouldTrimVertically ? trimTop : 0;
  const cropRight = shouldTrimHorizontally ? trimRight : 0;
  const cropBottom = shouldTrimVertically ? trimBottom : 0;
  const croppedWidth = width - cropLeft - cropRight;
  const croppedHeight = height - cropTop - cropBottom;

  if (croppedWidth <= 0 || croppedHeight <= 0) {
    return canvas;
  }

  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = croppedWidth;
  croppedCanvas.height = croppedHeight;
  const croppedCtx = croppedCanvas.getContext("2d", { alpha: false });
  if (!croppedCtx) {
    return canvas;
  }

  croppedCtx.drawImage(
    canvas,
    cropLeft,
    cropTop,
    croppedWidth,
    croppedHeight,
    0,
    0,
    croppedWidth,
    croppedHeight,
  );

  return croppedCanvas;
}

function resolveUpscaleFactor(width: number, height: number, requestedFactor: number): number {
  if (!Number.isFinite(requestedFactor) || requestedFactor <= 1) {
    return 1;
  }

  const edgeLimitedFactor = Math.min(MAX_UPSCALED_EDGE_PX / width, MAX_UPSCALED_EDGE_PX / height);

  if (!Number.isFinite(edgeLimitedFactor) || edgeLimitedFactor <= 1) {
    return 1;
  }

  return Math.min(requestedFactor, edgeLimitedFactor);
}

function upscaleCanvas(sourceCanvas: HTMLCanvasElement, factor: number): HTMLCanvasElement {
  if (factor <= 1) {
    return sourceCanvas;
  }

  const targetWidth = Math.max(1, Math.round(sourceCanvas.width * factor));
  const targetHeight = Math.max(1, Math.round(sourceCanvas.height * factor));
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = targetWidth;
  outputCanvas.height = targetHeight;

  const outputCtx = outputCanvas.getContext("2d", { alpha: false });
  if (!outputCtx) {
    return sourceCanvas;
  }

  outputCtx.imageSmoothingEnabled = true;
  outputCtx.imageSmoothingQuality = "high";
  outputCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
  return outputCanvas;
}

export async function captureFrameAt(
  video: HTMLVideoElement,
  targetSec: number,
  options?: CaptureOptions,
): Promise<CaptureResult> {
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
    // Draw at native decoded frame size (no resampling).
    ctx.drawImage(video, 0, 0);
    const requestedUpscale = options?.upscaleFactor ?? 1;
    const upscaleFactor = resolveUpscaleFactor(width, height, requestedUpscale);
    const outputCanvas = upscaleCanvas(canvas, upscaleFactor);
    const blob = await toBlob(outputCanvas, "image/png");
    const file = new File([blob], `framesnap-${fileSafeTimestamp(clampedTarget)}.png`, {
      type: "image/png",
    });

    return {
      blob,
      file,
      width: outputCanvas.width,
      height: outputCanvas.height,
      timestampSec: clampedTarget,
    };
  } finally {
    if (shouldResumePlayback) {
      void video.play().catch(() => {
        // Ignore autoplay/playback policy failures.
      });
    }
  }
}
