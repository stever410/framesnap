import { AppError } from "../../shared/errors";

export type ShareResult = "shared" | "canceled" | "failed";

export async function shareCapture(file: File): Promise<ShareResult> {
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };

  if (typeof nav.share !== "function") {
    return "failed";
  }

  if (typeof nav.canShare === "function" && !nav.canShare({ files: [file] })) {
    return "failed";
  }

  try {
    await nav.share({ files: [file], title: "FrameSnap capture" });
    return "shared";
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "canceled";
    }

    throw new AppError("SHARE_FAILED", "Share operation failed");
  }
}

export function downloadCapture(file: File): void {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  URL.revokeObjectURL(url);
}
