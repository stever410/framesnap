import { describe, expect, it } from "vitest";
import { appActions } from "./app-actions";

describe("appActions", () => {
  it("should create bootstrap action", () => {
    expect(appActions.bootstrap({ canShareFiles: true, isIOS: true, isAndroid: false })).toEqual({
      type: "app/bootstrap",
      payload: { canShareFiles: true, isIOS: true, isAndroid: false },
    });
  });

  it("should create video actions", () => {
    expect(appActions.videoLoading()).toEqual({ type: "video/loading" });
    expect(
      appActions.videoReady({
        fileName: "v.mp4",
        objectUrl: "blob:v",
        durationSec: 10,
        width: 1920,
        height: 1080,
      }),
    ).toEqual({
      type: "video/ready",
      payload: {
        fileName: "v.mp4",
        objectUrl: "blob:v",
        durationSec: 10,
        width: 1920,
        height: 1080,
      },
    });
    expect(appActions.videoTimeUpdated(2.2)).toEqual({
      type: "video/time-updated",
      payload: { currentTimeSec: 2.2 },
    });
  });

  it("should create capture actions", () => {
    const file = new File(["x"], "f.png");

    expect(appActions.captureStart()).toEqual({ type: "capture/start" });
    expect(appActions.captureReady({ file, width: 100, height: 50, timestampSec: 1 })).toEqual({
      type: "capture/ready",
      payload: { file, width: 100, height: 50, timestampSec: 1 },
    });
    expect(appActions.captureReset()).toEqual({ type: "capture/reset" });
  });

  it("should create error and install actions", () => {
    expect(appActions.setError("UNKNOWN", "oops")).toEqual({
      type: "error/set",
      payload: { code: "UNKNOWN", message: "oops" },
    });
    expect(appActions.clearError()).toEqual({ type: "error/clear" });
    expect(appActions.updateInstallState({ isInstalled: true })).toEqual({
      type: "install/state-updated",
      payload: { isInstalled: true },
    });
  });
});
