import type { AppState } from "./app-state.types";

export const initialState: AppState = {
  phase: "idle",
  video: {
    fileName: null,
    objectUrl: null,
    durationSec: 0,
    currentTimeSec: 0,
    width: null,
    height: null,
  },
  capture: {
    file: null,
    width: null,
    height: null,
    timestampSec: null,
  },
  capabilities: {
    canShareFiles: false,
    isIOS: false,
    isAndroid: false,
  },
  install: {
    isInstallEligible: false,
    isInstalled: false,
    isMobileViewport: false,
    isA2HSHelpOpen: false,
  },
  error: {
    code: null,
    message: null,
  },
};
