import type { ResolvedErrorCode } from "../../shared/errors";
import type { AppAction } from "./app-actions.types";
import type { InstallState } from "./app-state.types";

export const appActions = {
  bootstrap(payload: { canShareFiles: boolean; isIOS: boolean; isAndroid: boolean }): AppAction {
    return { type: "app/bootstrap", payload };
  },
  videoLoading(): AppAction {
    return { type: "video/loading" };
  },
  videoReady(payload: {
    fileName: string;
    objectUrl: string;
    durationSec: number;
    width: number;
    height: number;
  }): AppAction {
    return { type: "video/ready", payload };
  },
  videoTimeUpdated(currentTimeSec: number): AppAction {
    return { type: "video/time-updated", payload: { currentTimeSec } };
  },
  captureStart(): AppAction {
    return { type: "capture/start" };
  },
  captureReady(payload: {
    file: File;
    width: number;
    height: number;
    timestampSec: number;
  }): AppAction {
    return { type: "capture/ready", payload };
  },
  captureReset(): AppAction {
    return { type: "capture/reset" };
  },
  setError(code: ResolvedErrorCode, message: string): AppAction {
    return { type: "error/set", payload: { code, message } };
  },
  clearError(): AppAction {
    return { type: "error/clear" };
  },
  updateInstallState(payload: Partial<InstallState>): AppAction {
    return { type: "install/state-updated", payload };
  },
};
