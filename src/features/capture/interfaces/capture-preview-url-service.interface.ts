export interface CapturePreviewUrlService {
  createPreviewUrl(file: File): string;
  revokePreviewUrl(url: string | null): void;
}
