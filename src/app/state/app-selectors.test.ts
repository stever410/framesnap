import { describe, expect, it } from "vitest";
import {
  selectHasVideo,
  selectShowAddToHomeScreenButton,
  selectShowDesktopAddToHomeScreenButton,
  selectShowDesktopInstallButton,
  selectShowInstallButton,
  selectShowMobileAndroidInstallCard,
  selectShowMobileFallbackInstallFab,
  selectShowMobileIOSInstallFab,
} from "./app-selectors";
import type { AppState } from "./app-state.types";

function createState(partial: Partial<AppState>): AppState {
  return {
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
    ...partial,
  };
}

describe("app selectors", () => {
  it("should detect when video is loaded", () => {
    const withoutVideo = createState({});
    const withVideo = createState({
      video: {
        ...createState({}).video,
        objectUrl: "blob:test",
      },
    });

    expect(selectHasVideo(withoutVideo)).toBe(false);
    expect(selectHasVideo(withVideo)).toBe(true);
  });

  it("should show desktop install button when eligible and not installed", () => {
    const state = createState({
      install: {
        isInstallEligible: true,
        isInstalled: false,
        isMobileViewport: false,
        isA2HSHelpOpen: false,
      },
    });

    expect(selectShowDesktopInstallButton(state)).toBe(true);
    expect(selectShowInstallButton(state)).toBe(true);
  });

  it("should show Android install card only on mobile Android with prompt eligibility", () => {
    const state = createState({
      capabilities: { canShareFiles: false, isIOS: false, isAndroid: true },
      install: {
        isInstallEligible: true,
        isInstalled: false,
        isMobileViewport: true,
        isA2HSHelpOpen: false,
      },
    });

    expect(selectShowMobileAndroidInstallCard(state)).toBe(true);
  });

  it("should show add-to-home button on iOS when install prompt is not eligible", () => {
    const state = createState({
      capabilities: { canShareFiles: false, isIOS: true, isAndroid: false },
      install: {
        isInstallEligible: false,
        isInstalled: false,
        isMobileViewport: false,
        isA2HSHelpOpen: false,
      },
    });

    expect(selectShowAddToHomeScreenButton(state)).toBe(true);
    expect(selectShowDesktopAddToHomeScreenButton(state)).toBe(true);
  });

  it("should show mobile iOS install fab when on iOS mobile and not installed", () => {
    const state = createState({
      capabilities: { canShareFiles: false, isIOS: true, isAndroid: false },
      install: {
        isInstallEligible: false,
        isInstalled: false,
        isMobileViewport: true,
        isA2HSHelpOpen: false,
      },
    });

    expect(selectShowMobileIOSInstallFab(state)).toBe(true);
  });

  it("should show mobile fallback install fab on unsupported mobile platform", () => {
    const state = createState({
      capabilities: { canShareFiles: false, isIOS: false, isAndroid: false },
      install: {
        isInstallEligible: false,
        isInstalled: false,
        isMobileViewport: true,
        isA2HSHelpOpen: false,
      },
    });

    expect(selectShowMobileFallbackInstallFab(state)).toBe(true);
  });
});
