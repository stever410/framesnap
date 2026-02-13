import type { CapturePreviewUrlService } from "../interfaces/capture-preview-url-service.interface";

export const capturePreviewUrlService: CapturePreviewUrlService = {
  createPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  },
  revokePreviewUrl(url: string | null): void {
    if (url) {
      URL.revokeObjectURL(url);
    }
  },
};
