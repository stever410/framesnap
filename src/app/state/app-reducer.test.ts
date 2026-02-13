import { describe, expect, it } from "vitest";
import { appActions } from "./app-actions";
import { initialState } from "./app-initial-state";
import { appReducer } from "./app-reducer";

describe("appReducer", () => {
  it("should transition to video_ready when metadata is loaded", () => {
    const loadingState = appReducer(initialState, appActions.videoLoading());
    const nextState = appReducer(
      loadingState,
      appActions.videoReady({
        fileName: "clip.mp4",
        objectUrl: "blob:video",
        durationSec: 12,
        width: 1920,
        height: 1080,
      }),
    );

    expect(nextState.phase).toBe("video_ready");
    expect(nextState.video.fileName).toBe("clip.mp4");
    expect(nextState.video.currentTimeSec).toBe(0);
    expect(nextState.error.message).toBeNull();
  });

  it("should transition to capture_ready when capture completes", () => {
    const nextState = appReducer(
      initialState,
      appActions.captureReady({
        file: new File(["x"], "frame.png"),
        width: 1280,
        height: 720,
        timestampSec: 3.5,
      }),
    );

    expect(nextState.phase).toBe("capture_ready");
    expect(nextState.capture.file?.name).toBe("frame.png");
  });

  it("should return to idle on clear error when no video exists", () => {
    const errored = appReducer(initialState, appActions.setError("UNKNOWN", "x"));
    const cleared = appReducer(errored, appActions.clearError());

    expect(cleared.phase).toBe("idle");
    expect(cleared.error.message).toBeNull();
  });

  it("should merge install state updates", () => {
    const nextState = appReducer(
      initialState,
      appActions.updateInstallState({ isInstallEligible: true, isMobileViewport: true }),
    );

    expect(nextState.install.isInstallEligible).toBe(true);
    expect(nextState.install.isMobileViewport).toBe(true);
    expect(nextState.install.isInstalled).toBe(false);
  });

  it("should set phase to loading_video and reset capture data while loading", () => {
    const loadedState = appReducer(
      initialState,
      appActions.captureReady({
        file: new File(["x"], "old.png"),
        width: 500,
        height: 400,
        timestampSec: 1,
      }),
    );
    const nextState = appReducer(loadedState, appActions.videoLoading());

    expect(nextState.phase).toBe("loading_video");
    expect(nextState.capture.file).toBeNull();
    expect(nextState.error.message).toBeNull();
  });

  it("should update current video time and capture progress phases", () => {
    const readyState = appReducer(
      initialState,
      appActions.videoReady({
        fileName: "clip.mp4",
        objectUrl: "blob:video",
        durationSec: 12,
        width: 1920,
        height: 1080,
      }),
    );
    const timedState = appReducer(readyState, appActions.videoTimeUpdated(4.2));
    const capturingState = appReducer(timedState, appActions.captureStart());

    expect(timedState.video.currentTimeSec).toBe(4.2);
    expect(capturingState.phase).toBe("capturing");
  });

  it("should set error phase and clear back to video_ready when video exists", () => {
    const withVideo = appReducer(
      initialState,
      appActions.videoReady({
        fileName: "clip.mp4",
        objectUrl: "blob:video",
        durationSec: 12,
        width: 1920,
        height: 1080,
      }),
    );
    const errored = appReducer(withVideo, appActions.setError("UNKNOWN", "Boom"));
    const cleared = appReducer(errored, appActions.clearError());

    expect(errored.phase).toBe("error");
    expect(cleared.phase).toBe("video_ready");
  });

  it("should reset capture state to empty when capture is reset", () => {
    const captured = appReducer(
      initialState,
      appActions.captureReady({
        file: new File(["x"], "frame.png"),
        width: 1280,
        height: 720,
        timestampSec: 3.5,
      }),
    );
    const reset = appReducer(captured, appActions.captureReset());

    expect(reset.phase).toBe("video_ready");
    expect(reset.capture).toEqual({
      file: null,
      width: null,
      height: null,
      timestampSec: null,
    });
  });
});
