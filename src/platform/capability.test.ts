import { afterEach, describe, expect, it } from "vitest";
import { canShareFiles, isAndroid, isIOS } from "./capability";

const originalUserAgent = navigator.userAgent;
const originalPlatform = navigator.platform;
const originalMaxTouchPoints = navigator.maxTouchPoints;
const originalShare = navigator.share;
const originalCanShare = (navigator as Navigator & { canShare?: (data?: ShareData) => boolean })
  .canShare;

function setNavigatorValue(key: string, value: unknown): void {
  Object.defineProperty(navigator, key, {
    configurable: true,
    value,
  });
}

afterEach(() => {
  setNavigatorValue("userAgent", originalUserAgent);
  setNavigatorValue("platform", originalPlatform);
  setNavigatorValue("maxTouchPoints", originalMaxTouchPoints);
  setNavigatorValue("share", originalShare);
  setNavigatorValue("canShare", originalCanShare);
});

describe("platform capability", () => {
  it("should detect iOS from iPhone user agent", () => {
    setNavigatorValue("userAgent", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    setNavigatorValue("platform", "iPhone");
    setNavigatorValue("maxTouchPoints", 1);

    expect(isIOS()).toBe(true);
  });

  it("should detect iPadOS on MacIntel with touch points", () => {
    setNavigatorValue("userAgent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)");
    setNavigatorValue("platform", "MacIntel");
    setNavigatorValue("maxTouchPoints", 2);

    expect(isIOS()).toBe(true);
  });

  it("should detect Android user agent", () => {
    setNavigatorValue("userAgent", "Mozilla/5.0 (Linux; Android 14; Pixel)");

    expect(isAndroid()).toBe(true);
    expect(isIOS()).toBe(false);
  });

  it("should return false for canShareFiles when share API is missing", () => {
    setNavigatorValue("share", undefined);
    setNavigatorValue("canShare", undefined);

    expect(canShareFiles()).toBe(false);
  });

  it("should return false for canShareFiles when canShare is missing", () => {
    setNavigatorValue("share", async () => {});
    setNavigatorValue("canShare", undefined);

    expect(canShareFiles()).toBe(false);
  });

  it("should return true for canShareFiles when browser supports file sharing", () => {
    setNavigatorValue("share", async () => {});
    setNavigatorValue("canShare", () => true);

    expect(canShareFiles()).toBe(true);
  });
});
