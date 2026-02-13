import { AppError } from "../../../shared/errors";
import type { VideoSeekService } from "../interfaces/video-seek-service.interface";

const SEEK_TIMEOUT_MS = 3000;
const SEEK_EPSILON_SEC = 0.001;

export const videoSeekService: VideoSeekService = {
  seekTo(video: HTMLVideoElement, targetSec: number): Promise<void> {
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
  },
};
