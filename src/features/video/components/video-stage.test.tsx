import { render, screen } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";
import { VideoStage } from "./video-stage";

const mockUseAppStore = vi.fn();
const mockUseAppController = vi.fn();

vi.mock("../../../app/providers/app-store.provider", () => ({
  useAppStore: () => mockUseAppStore(),
}));

vi.mock("../../../app/providers/app-controller.provider", () => ({
  useAppController: () => mockUseAppController(),
}));

describe("VideoStage", () => {
  it("should disable capture button when phase is capturing", () => {
    mockUseAppStore.mockReturnValue({
      state: {
        phase: "capturing",
        video: { objectUrl: "blob:test" },
      },
    });

    mockUseAppController.mockReturnValue({
      t: (key: string) => key,
      video: {
        videoRef: { current: null },
        onOpenVideoPicker: vi.fn(),
        onTimeUpdate: vi.fn(),
        syncWithCurrentFrame: vi.fn(),
        timestampInput: "00:01.000",
        currentTimestampLabel: "00:01.000",
        onTimestampFocus: vi.fn(),
        onTimestampInput: vi.fn(),
        onTimestampBlur: vi.fn(),
        onTimestampEnter: vi.fn(),
      },
      capture: {
        onCapture: vi.fn(),
      },
    });

    render(<VideoStage />);

    const captureButton = screen.getByRole("button", {
      name: "video.capturingFrame",
    }) as HTMLButtonElement;

    expect(captureButton.disabled).toBe(true);
  });
});
