import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CaptureModal } from "./capture-modal";

const mockUseAppStore = vi.fn();
const mockUseAppController = vi.fn();

vi.mock("../../../app/providers/app-store.provider", () => ({
  useAppStore: () => mockUseAppStore(),
}));

vi.mock("../../../app/providers/app-controller.provider", () => ({
  useAppController: () => mockUseAppController(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

type ArrangeOptions = {
  canShareFiles?: boolean;
  isOpen?: boolean;
  previewUrl?: string | null;
  timestampSec?: number | null;
  isIOS?: boolean;
  downloadState?: "idle" | "preparing" | "downloading";
  isApplyingUpscale?: boolean;
  file?: File | null;
};

function arrange(options?: ArrangeOptions) {
  const onChangeUpscaleFactor = vi.fn();
  const onShare = vi.fn();
  const onDownload = vi.fn();
  const onCaptureAgain = vi.fn();
  const closeCaptureModal = vi.fn();

  const {
    canShareFiles = true,
    isOpen = true,
    previewUrl = "blob:frame",
    timestampSec = 1,
    isIOS = false,
    downloadState = "idle",
    isApplyingUpscale = false,
    file = new File(["x"], "frame.png"),
  } = options ?? {};

  mockUseAppStore.mockReturnValue({
    state: {
      capture: {
        timestampSec,
        width: 100,
        height: 50,
        file,
      },
      capabilities: {
        canShareFiles,
      },
    },
  });

  mockUseAppController.mockReturnValue({
    t: (key: string, params?: { factor?: number }) => {
      if (key === "captureModal.upscaleOption" && params?.factor) {
        return `${key}.${params.factor}`;
      }
      return key;
    },
    isIOS,
    capture: {
      isCaptureModalOpen: isOpen,
      previewUrl,
      captureUpscaleFactor: 1,
      isApplyingUpscale,
      downloadState,
      onChangeUpscaleFactor,
      onShare,
      onDownload,
      onCaptureAgain,
      closeCaptureModal,
    },
  });

  const view = render(<CaptureModal />);

  return {
    ...view,
    handlers: {
      onChangeUpscaleFactor,
      onShare,
      onDownload,
      onCaptureAgain,
      closeCaptureModal,
    },
  };
}

describe("CaptureModal", () => {
  it("should render nothing when capture modal is closed", () => {
    arrange({ isOpen: false });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("should render share action when file sharing is supported", () => {
    arrange({ canShareFiles: true });

    expect(screen.getByRole("button", { name: "captureModal.share" })).toBeTruthy();
  });

  it("should hide share action when file sharing is unsupported", () => {
    arrange({ canShareFiles: false });

    expect(screen.queryByRole("button", { name: "captureModal.share" })).toBeNull();
  });

  it("should call close handler on close button click", () => {
    const { handlers } = arrange();

    fireEvent.click(screen.getByRole("button", { name: "captureModal.closePreviewAria" }));

    expect(handlers.closeCaptureModal).toHaveBeenCalledTimes(1);
  });

  it("should close when backdrop is clicked", () => {
    const { container, handlers } = arrange();
    const backdrop = container.querySelector(".capture-modal__backdrop");

    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop as HTMLElement);

    expect(handlers.closeCaptureModal).toHaveBeenCalledTimes(1);
  });

  it("should not close when modal content is clicked", () => {
    const { container, handlers } = arrange();
    const modalContent = container.querySelector(".capture-modal");

    expect(modalContent).toBeTruthy();
    fireEvent.click(modalContent as HTMLElement);

    expect(handlers.closeCaptureModal).not.toHaveBeenCalled();
  });

  it("should call share and download handlers", () => {
    const { handlers } = arrange({ canShareFiles: true });

    fireEvent.click(screen.getByRole("button", { name: "captureModal.share" }));
    fireEvent.click(screen.getByRole("button", { name: "captureModal.download" }));

    expect(handlers.onShare).toHaveBeenCalledTimes(1);
    expect(handlers.onDownload).toHaveBeenCalledTimes(1);
  });

  it("should disable download button when not idle", () => {
    arrange({ downloadState: "preparing" });

    const downloadButton = screen.getByRole("button", {
      name: "captureModal.preparing",
    }) as HTMLButtonElement;

    expect(downloadButton.disabled).toBe(true);
  });

  it("should call capture again handler", () => {
    const { handlers } = arrange();

    fireEvent.click(screen.getByRole("button", { name: "captureModal.captureAgain" }));

    expect(handlers.onCaptureAgain).toHaveBeenCalledTimes(1);
  });

  it("should call upscale change handler for valid options", () => {
    const { handlers } = arrange();

    fireEvent.change(screen.getByLabelText("captureModal.downloadSizeLabel"), {
      target: { value: "2" },
    });

    expect(handlers.onChangeUpscaleFactor).toHaveBeenCalledWith(2);
  });

  it("should not call upscale handler for invalid options", () => {
    const { handlers } = arrange();

    fireEvent.change(screen.getByLabelText("captureModal.downloadSizeLabel"), {
      target: { value: "7" },
    });

    expect(handlers.onChangeUpscaleFactor).not.toHaveBeenCalled();
  });

  it("should render iOS save hint only on iOS", () => {
    arrange({ isIOS: true });
    expect(screen.getByText("captureModal.iosSaveHint")).toBeTruthy();

    cleanup();

    arrange({ isIOS: false });
    expect(screen.queryByText("captureModal.iosSaveHint")).toBeNull();
  });

  it("should render fallback file size label when file is missing", () => {
    arrange({ file: null });

    expect(screen.getByText("captureModal.fileSizeFallback")).toBeTruthy();
  });
});
