import { beforeEach, describe, expect, it, vi } from "vitest";
import { themeStorageService } from "./theme-storage.service";

describe("themeStorageService", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("should read and write supported themes", () => {
    themeStorageService.setTheme("dark");
    expect(themeStorageService.getTheme()).toBe("dark");
  });

  it("should return null for unknown values", () => {
    window.localStorage.setItem("framesnap-theme", "sepia");
    expect(themeStorageService.getTheme()).toBeNull();
  });

  it("should handle storage errors gracefully", () => {
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(themeStorageService.getTheme()).toBeNull();
    getItemSpy.mockRestore();
  });
});
