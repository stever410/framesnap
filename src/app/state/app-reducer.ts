import type { AppAction } from "./app-actions.types";
import type { AppState } from "./app-state.types";

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "app/bootstrap":
      return {
        ...state,
        capabilities: action.payload,
      };
    case "video/loading":
      return {
        ...state,
        phase: "loading_video",
        error: { code: null, message: null },
        capture: {
          file: null,
          width: null,
          height: null,
          timestampSec: null,
        },
      };
    case "video/ready":
      return {
        ...state,
        phase: "video_ready",
        video: {
          fileName: action.payload.fileName,
          objectUrl: action.payload.objectUrl,
          durationSec: action.payload.durationSec,
          currentTimeSec: 0,
          width: action.payload.width,
          height: action.payload.height,
        },
        error: { code: null, message: null },
      };
    case "video/time-updated":
      return {
        ...state,
        video: {
          ...state.video,
          currentTimeSec: action.payload.currentTimeSec,
        },
      };
    case "capture/start":
      return {
        ...state,
        phase: "capturing",
        error: { code: null, message: null },
      };
    case "capture/ready":
      return {
        ...state,
        phase: "capture_ready",
        capture: {
          file: action.payload.file,
          width: action.payload.width,
          height: action.payload.height,
          timestampSec: action.payload.timestampSec,
        },
      };
    case "capture/reset":
      return {
        ...state,
        phase: "video_ready",
        capture: {
          file: null,
          width: null,
          height: null,
          timestampSec: null,
        },
      };
    case "error/set":
      return {
        ...state,
        phase: "error",
        error: action.payload,
      };
    case "error/clear":
      return {
        ...state,
        phase: state.video.objectUrl ? "video_ready" : "idle",
        error: { code: null, message: null },
      };
    case "install/state-updated":
      return {
        ...state,
        install: {
          ...state.install,
          ...action.payload,
        },
      };
    default:
      return state;
  }
}
