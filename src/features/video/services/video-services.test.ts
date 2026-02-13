import { describe, expect, it, vi } from "vitest";
import { AppError } from "../../../shared/errors";
import { videoMetadataService } from "./video-metadata.service";
import { videoSeekService } from "./video-seek.service";

type Listener = (event: Event) => void;

class FakeVideoElement {
  preload = "";
  src = "";
  duration = 8;
  videoWidth = 1920;
  videoHeight = 1080;
  currentTime = 0;
  private listeners = new Map<string, Set<Listener>>();

  addEventListener(type: string, listener: Listener): void {
    const existing = this.listeners.get(type) ?? new Set<Listener>();
    existing.add(listener);
    this.listeners.set(type, existing);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string): void {
    const event = new Event(type);
    this.listeners.get(type)?.forEach((listener) => {
      listener(event);
    });
  }
}

describe("video services", () => {
  it("should load metadata successfully", async () => {
    const originalCreateElement = document.createElement.bind(document);
    let probe!: FakeVideoElement;

    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation((tagName: string) => {
        if (tagName === "video") {
          probe = new FakeVideoElement();
          return probe as unknown as HTMLVideoElement;
        }
        return originalCreateElement(tagName);
      });

    const pending = videoMetadataService.loadMetadata("blob:test");
    probe.emit("loadedmetadata");

    await expect(pending).resolves.toEqual({
      durationSec: 8,
      width: 1920,
      height: 1080,
    });

    createElementSpy.mockRestore();
  });

  it("should reject metadata load failures", async () => {
    const originalCreateElement = document.createElement.bind(document);
    let probe!: FakeVideoElement;

    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation((tagName: string) => {
        if (tagName === "video") {
          probe = new FakeVideoElement();
          return probe as unknown as HTMLVideoElement;
        }
        return originalCreateElement(tagName);
      });

    const pending = videoMetadataService.loadMetadata("blob:test");
    probe.emit("error");

    await expect(pending).rejects.toBeInstanceOf(AppError);

    createElementSpy.mockRestore();
  });

  it("should resolve seek immediately when already at target", async () => {
    const video = new FakeVideoElement();
    video.currentTime = 2;

    await expect(
      videoSeekService.seekTo(video as unknown as HTMLVideoElement, 2),
    ).resolves.toBeUndefined();
  });

  it("should reject seek timeout when seeked event is never fired", async () => {
    vi.useFakeTimers();

    const video = new FakeVideoElement();
    const pending = videoSeekService.seekTo(video as unknown as HTMLVideoElement, 5);
    const rejection = expect(pending).rejects.toBeInstanceOf(AppError);

    await vi.advanceTimersByTimeAsync(3001);
    await rejection;

    vi.useRealTimers();
  });
});
