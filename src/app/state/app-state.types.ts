import type { ResolvedErrorCode } from "../../shared/errors";

export type AppPhase =
  | "idle"
  | "loading_video"
  | "video_ready"
  | "capturing"
  | "capture_ready"
  | "error";

export type InstallState = {
  isInstallEligible: boolean;
  isInstalled: boolean;
  isMobileViewport: boolean;
  isA2HSHelpOpen: boolean;
};

export type AppState = {
  phase: AppPhase;
  video: {
    fileName: string | null;
    objectUrl: string | null;
    durationSec: number;
    currentTimeSec: number;
    width: number | null;
    height: number | null;
  };
  capture: {
    file: File | null;
    width: number | null;
    height: number | null;
    timestampSec: number | null;
  };
  capabilities: {
    canShareFiles: boolean;
    isIOS: boolean;
    isAndroid: boolean;
  };
  install: InstallState;
  error: {
    code: ResolvedErrorCode | null;
    message: string | null;
  };
};
