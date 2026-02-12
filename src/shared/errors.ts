export type AppErrorCode =
  | "UNSUPPORTED_FORMAT"
  | "VIDEO_LOAD_FAILED"
  | "SEEK_TIMEOUT"
  | "CAPTURE_FAILED"
  | "SHARE_FAILED";

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) {
    switch (error.code) {
      case "UNSUPPORTED_FORMAT":
        return "Unsupported video format. Use MP4, MOV, or WebM.";
      case "VIDEO_LOAD_FAILED":
        return "Could not load the video. Please try another file.";
      case "SEEK_TIMEOUT":
        return "Seeking took too long. Try a nearby timestamp.";
      case "CAPTURE_FAILED":
        return "Capture failed. Try again.";
      case "SHARE_FAILED":
        return "Share failed. Use Download instead.";
    }
  }

  return "Something went wrong. Please try again.";
}
