import { type Dispatch, useEffect, useState } from "preact/hooks";
import { appActions } from "../../../app/state/app-actions";
import type { AppAction } from "../../../app/state/app-actions.types";
import type { AppState } from "../../../app/state/app-state.types";
import { type ResolvedErrorCode, toErrorCode } from "../../../shared/errors";
import { parseTimestampInput } from "../../../ui/format";
import { captureFrameAt } from "../../capture/capture-engine";
import { downloadCapture, shareCapture } from "../../share/share-service";
import type { CapturePreviewUrlService } from "../interfaces/capture-preview-url-service.interface";
import { capturePreviewUrlService } from "../services/capture-preview-url.service";
import type { DownloadState } from "../types/capture.types";
import { CAPTURE_UPSCALE_FACTORS, type CaptureUpscaleFactor } from "../types/capture-upscale.types";

type UseCaptureControllerParams = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  timestampInput: string;
  shareTitle: string;
  shareUnavailableMessage: string;
  getErrorMessage: (code: ResolvedErrorCode) => string;
  previewUrlService?: CapturePreviewUrlService;
  videoRef: { current: HTMLVideoElement | null };
};

export type UseCaptureControllerResult = {
  isCaptureModalOpen: boolean;
  previewUrl: string | null;
  captureUpscaleFactor: CaptureUpscaleFactor;
  isApplyingUpscale: boolean;
  downloadState: DownloadState;
  isValidUpscaleFactor: (value: number) => value is CaptureUpscaleFactor;
  onCapture: () => Promise<void>;
  onChangeUpscaleFactor: (nextFactor: CaptureUpscaleFactor) => Promise<void>;
  onShare: () => Promise<void>;
  onDownload: () => void;
  onCaptureAgain: () => void;
  closeCaptureModal: () => void;
};

export function useCaptureController(
  params: UseCaptureControllerParams,
): UseCaptureControllerResult {
  const {
    state,
    dispatch,
    timestampInput,
    shareTitle,
    shareUnavailableMessage,
    getErrorMessage,
    previewUrlService = capturePreviewUrlService,
    videoRef,
  } = params;

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");
  const [captureUpscaleFactor, setCaptureUpscaleFactor] = useState<CaptureUpscaleFactor>(1);
  const [isApplyingUpscale, setIsApplyingUpscale] = useState(false);

  useEffect(() => {
    if (!state.capture.file) {
      setPreviewUrl(null);
      setIsCaptureModalOpen(false);
      return;
    }

    const objectUrl = previewUrlService.createPreviewUrl(state.capture.file);
    setPreviewUrl(objectUrl);

    return () => {
      previewUrlService.revokePreviewUrl(objectUrl);
    };
  }, [previewUrlService, state.capture.file]);

  const closeCaptureModal = (): void => {
    setIsCaptureModalOpen(false);
    dispatch(appActions.captureReset());
  };

  const onCaptureAgain = (): void => {
    closeCaptureModal();
  };

  const onCapture = async (): Promise<void> => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const parsed = parseTimestampInput(timestampInput);
    const target = parsed ?? state.video.currentTimeSec;

    dispatch(appActions.captureStart());

    try {
      const result = await captureFrameAt(video, target, {
        upscaleFactor: captureUpscaleFactor,
      });
      dispatch(
        appActions.captureReady({
          file: result.file,
          width: result.width,
          height: result.height,
          timestampSec: result.timestampSec,
        }),
      );
      setIsCaptureModalOpen(true);
    } catch (error: unknown) {
      const code = toErrorCode(error);
      dispatch(appActions.setError(code, getErrorMessage(code)));
    }
  };

  const isValidUpscaleFactor = (value: number): value is CaptureUpscaleFactor => {
    return CAPTURE_UPSCALE_FACTORS.includes(value as CaptureUpscaleFactor);
  };

  const onChangeUpscaleFactor = async (nextFactor: CaptureUpscaleFactor): Promise<void> => {
    setCaptureUpscaleFactor(nextFactor);

    if (!isCaptureModalOpen || state.capture.timestampSec === null) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    setIsApplyingUpscale(true);
    dispatch(appActions.captureStart());

    try {
      const result = await captureFrameAt(video, state.capture.timestampSec, {
        upscaleFactor: nextFactor,
      });
      dispatch(
        appActions.captureReady({
          file: result.file,
          width: result.width,
          height: result.height,
          timestampSec: result.timestampSec,
        }),
      );
    } catch (error: unknown) {
      const code = toErrorCode(error);
      dispatch(appActions.setError(code, getErrorMessage(code)));
    } finally {
      setIsApplyingUpscale(false);
    }
  };

  const onShare = async (): Promise<void> => {
    if (!state.capture.file) {
      return;
    }

    try {
      const result = await shareCapture(state.capture.file, shareTitle);
      if (result === "failed") {
        dispatch(appActions.setError("SHARE_FAILED", shareUnavailableMessage));
      }
    } catch (error: unknown) {
      const code = toErrorCode(error);
      dispatch(appActions.setError(code, getErrorMessage(code)));
    }
  };

  const onDownload = (): void => {
    if (!state.capture.file || downloadState !== "idle") {
      return;
    }

    setDownloadState("preparing");
    window.setTimeout(() => {
      setDownloadState("downloading");
      window.setTimeout(() => {
        downloadCapture(state.capture.file as File);
        setDownloadState("idle");
      }, 120);
    }, 80);
  };

  return {
    isCaptureModalOpen,
    previewUrl,
    captureUpscaleFactor,
    isApplyingUpscale,
    downloadState,
    isValidUpscaleFactor,
    onCapture,
    onChangeUpscaleFactor,
    onShare,
    onDownload,
    onCaptureAgain,
    closeCaptureModal,
  };
}
