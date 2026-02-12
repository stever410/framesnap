import type { AppErrorCode } from "../shared/errors";

export type AppPhase = "idle" | "loading_video" | "video_ready" | "capturing" | "capture_ready" | "error";

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
  };
  error: {
    code: AppErrorCode | null;
    message: string | null;
  };
};

export type AppAction =
  | { type: "app/bootstrap"; payload: { canShareFiles: boolean; isIOS: boolean } }
  | { type: "video/loading" }
  | {
      type: "video/ready";
      payload: {
        fileName: string;
        objectUrl: string;
        durationSec: number;
        width: number;
        height: number;
      };
    }
  | { type: "video/time-updated"; payload: { currentTimeSec: number } }
  | { type: "capture/start" }
  | {
      type: "capture/ready";
      payload: { file: File; width: number; height: number; timestampSec: number };
    }
  | { type: "error/set"; payload: { code: AppErrorCode; message: string } }
  | { type: "error/clear" }
  | { type: "capture/reset" };

export const initialState: AppState = {
  phase: "idle",
  video: {
    fileName: null,
    objectUrl: null,
    durationSec: 0,
    currentTimeSec: 0,
    width: null,
    height: null
  },
  capture: {
    file: null,
    width: null,
    height: null,
    timestampSec: null
  },
  capabilities: {
    canShareFiles: false,
    isIOS: false
  },
  error: {
    code: null,
    message: null
  }
};
