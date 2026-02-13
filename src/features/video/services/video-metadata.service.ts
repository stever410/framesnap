import { AppError } from "../../../shared/errors";
import type { VideoMetadataService } from "../interfaces/video-metadata-service.interface";

export const videoMetadataService: VideoMetadataService = {
  loadMetadata(url: string): Promise<{ durationSec: number; width: number; height: number }> {
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
          reject(new AppError("VIDEO_LOAD_FAILED", "Video metadata failed to load"));
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
  },
};
