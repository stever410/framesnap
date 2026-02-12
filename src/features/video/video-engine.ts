import { AppError } from "../../shared/errors";

const SUPPORTED_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v"];

export function assertSupportedVideo(file: File): void {
  const lowerName = file.name.toLowerCase();
  const hasSupportedExtension = SUPPORTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const hasVideoMime = file.type.startsWith("video/");

  if (!hasSupportedExtension && !hasVideoMime) {
    throw new AppError("UNSUPPORTED_FORMAT", "Unsupported video file");
  }
}

export function createVideoObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function revokeVideoObjectUrl(url: string | null): void {
  if (url) {
    URL.revokeObjectURL(url);
  }
}
