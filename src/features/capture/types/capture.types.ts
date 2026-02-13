import type { CaptureUpscaleFactor } from "./capture-upscale.types";

export type DownloadState = "idle" | "preparing" | "downloading";

export type CaptureModalState = {
  isOpen: boolean;
  previewUrl: string | null;
  downloadState: DownloadState;
  captureUpscaleFactor: CaptureUpscaleFactor;
  isApplyingUpscale: boolean;
};
