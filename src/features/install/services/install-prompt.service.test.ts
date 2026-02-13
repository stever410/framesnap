import { describe, expect, it, vi } from "vitest";
import { installPromptService } from "./install-prompt.service";

describe("installPromptService", () => {
  it("should subscribe and unsubscribe install events", () => {
    const addWindowListener = vi.spyOn(window, "addEventListener");
    const removeWindowListener = vi.spyOn(window, "removeEventListener");

    const mediaChangeAdd = vi.fn();
    const mediaChangeRemove = vi.fn();
    const originalMatchMedia = window.matchMedia;

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => {
        return {
          matches: query === "(display-mode: standalone)",
          media: query,
          onchange: null,
          addEventListener: mediaChangeAdd,
          removeEventListener: mediaChangeRemove,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        } as unknown as MediaQueryList;
      }),
    });

    const unsubscribe = installPromptService.subscribeInstallEvents({
      onBeforeInstallPrompt: vi.fn(),
      onAppInstalled: vi.fn(),
      onDisplayModeChange: vi.fn(),
    });

    expect(addWindowListener).toHaveBeenCalledWith("beforeinstallprompt", expect.any(Function));
    expect(addWindowListener).toHaveBeenCalledWith("appinstalled", expect.any(Function));
    expect(mediaChangeAdd).toHaveBeenCalledWith("change", expect.any(Function));

    unsubscribe();

    expect(removeWindowListener).toHaveBeenCalledWith("beforeinstallprompt", expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith("appinstalled", expect.any(Function));
    expect(mediaChangeRemove).toHaveBeenCalledWith("change", expect.any(Function));

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: originalMatchMedia,
    });
  });

  it("should emit current viewport state on subscribeViewportChange", () => {
    const addMediaListener = vi.fn();
    const removeMediaListener = vi.fn();
    const originalMatchMedia = window.matchMedia;

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => {
        return {
          matches: true,
          media: "(max-width: 680px)",
          onchange: null,
          addEventListener: addMediaListener,
          removeEventListener: removeMediaListener,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        } as unknown as MediaQueryList;
      }),
    });

    const onViewportChange = vi.fn();
    const unsubscribe = installPromptService.subscribeViewportChange(onViewportChange);

    expect(onViewportChange).toHaveBeenCalledWith(true);
    expect(addMediaListener).toHaveBeenCalledWith("change", expect.any(Function));

    unsubscribe();

    expect(removeMediaListener).toHaveBeenCalledWith("change", expect.any(Function));
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: originalMatchMedia,
    });
  });
});
