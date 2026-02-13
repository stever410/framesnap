import type { ResolvedErrorCode } from "../../shared/errors";
import type { InstallState } from "./app-state.types";

export type AppAction =
  | {
      type: "app/bootstrap";
      payload: { canShareFiles: boolean; isIOS: boolean; isAndroid: boolean };
    }
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
  | { type: "capture/reset" }
  | { type: "error/set"; payload: { code: ResolvedErrorCode; message: string } }
  | { type: "error/clear" }
  | { type: "install/state-updated"; payload: Partial<InstallState> };
