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

export type ResolvedErrorCode = AppErrorCode | "UNKNOWN";

export function toErrorCode(error: unknown): ResolvedErrorCode {
  if (error instanceof AppError) {
    return error.code;
  }

  return "UNKNOWN";
}
