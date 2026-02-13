import { type Dispatch, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { appActions } from "../../../app/state/app-actions";
import type { AppAction } from "../../../app/state/app-actions.types";
import type { AppState } from "../../../app/state/app-state.types";
import { type ResolvedErrorCode, toErrorCode } from "../../../shared/errors";
import { formatTimestamp, parseTimestampInput } from "../../../ui/format";
import {
  assertSupportedVideo,
  createVideoObjectUrl,
  revokeVideoObjectUrl,
} from "../../video/video-engine";
import type { VideoMetadataService } from "../interfaces/video-metadata-service.interface";
import type { VideoSeekService } from "../interfaces/video-seek-service.interface";
import { videoMetadataService } from "../services/video-metadata.service";
import { videoSeekService } from "../services/video-seek.service";

type UseVideoControllerParams = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  getErrorMessage: (code: ResolvedErrorCode) => string;
  seekInputErrorMessage: string;
  metadataService?: VideoMetadataService;
  seekService?: VideoSeekService;
};

export type UseVideoControllerResult = {
  fileInputRef: { current: HTMLInputElement | null };
  videoRef: { current: HTMLVideoElement | null };
  timestampInput: string;
  currentTimestampLabel: string;
  onTimestampFocus: () => void;
  onTimestampInput: (event: Event) => void;
  onTimestampBlur: () => Promise<void>;
  onTimestampEnter: (event: KeyboardEvent) => Promise<void>;
  onOpenVideoPicker: () => void;
  onSelectVideo: (event: Event) => Promise<void>;
  onTimeUpdate: () => void;
  syncWithCurrentFrame: () => void;
  seekToTimestampInput: () => Promise<void>;
};

export function useVideoController(params: UseVideoControllerParams): UseVideoControllerResult {
  const {
    state,
    dispatch,
    getErrorMessage,
    seekInputErrorMessage,
    metadataService = videoMetadataService,
    seekService = videoSeekService,
  } = params;

  const [timestampInput, setTimestampInput] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isEditingTimestampRef = useRef(false);

  useEffect(() => {
    return () => {
      revokeVideoObjectUrl(state.video.objectUrl);
    };
  }, [state.video.objectUrl]);

  const currentTimestampLabel = useMemo(
    () => formatTimestamp(state.video.currentTimeSec),
    [state.video.currentTimeSec],
  );

  const onOpenVideoPicker = (): void => {
    fileInputRef.current?.click();
  };

  const onSelectVideo = async (event: Event): Promise<void> => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    let nextObjectUrl: string | null = null;

    if (!file) {
      return;
    }

    dispatch(appActions.videoLoading());

    try {
      assertSupportedVideo(file);
      const objectUrl = createVideoObjectUrl(file);
      nextObjectUrl = objectUrl;
      revokeVideoObjectUrl(state.video.objectUrl);
      const metadata = await metadataService.loadMetadata(objectUrl);

      dispatch(
        appActions.videoReady({
          fileName: file.name,
          objectUrl,
          durationSec: metadata.durationSec,
          width: metadata.width,
          height: metadata.height,
        }),
      );
      setTimestampInput("");
    } catch (error: unknown) {
      revokeVideoObjectUrl(nextObjectUrl);
      const code = toErrorCode(error);
      dispatch(appActions.setError(code, getErrorMessage(code)));
    } finally {
      input.value = "";
    }
  };

  const onTimeUpdate = (): void => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const currentTime = Number.isFinite(video.currentTime) ? Math.max(0, video.currentTime) : 0;

    dispatch(appActions.videoTimeUpdated(currentTime));

    if (!isEditingTimestampRef.current) {
      setTimestampInput(formatTimestamp(currentTime));
    }
  };

  const syncWithCurrentFrame = (): void => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const currentTime = Number.isFinite(video.currentTime) ? Math.max(0, video.currentTime) : 0;
    dispatch(appActions.videoTimeUpdated(currentTime));
    setTimestampInput(formatTimestamp(currentTime));
  };

  const seekToTimestampInput = async (): Promise<void> => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const parsed = parseTimestampInput(timestampInput);
    if (parsed === null) {
      return;
    }

    const duration = state.video.durationSec;
    const clampedTime =
      Number.isFinite(duration) && duration > 0
        ? Math.max(0, Math.min(parsed, duration))
        : Math.max(0, parsed);

    try {
      await seekService.seekTo(video, clampedTime);
      dispatch(appActions.videoTimeUpdated(clampedTime));
      setTimestampInput(formatTimestamp(clampedTime));
    } catch {
      dispatch(appActions.setError("SEEK_TIMEOUT", seekInputErrorMessage));
    }
  };

  const onTimestampFocus = (): void => {
    isEditingTimestampRef.current = true;
  };

  const onTimestampInput = (event: Event): void => {
    setTimestampInput((event.target as HTMLInputElement).value);
  };

  const onTimestampBlur = async (): Promise<void> => {
    isEditingTimestampRef.current = false;
    await seekToTimestampInput();
  };

  const onTimestampEnter = async (event: KeyboardEvent): Promise<void> => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    await seekToTimestampInput();
  };

  return {
    fileInputRef,
    videoRef,
    timestampInput,
    currentTimestampLabel,
    onTimestampFocus,
    onTimestampInput,
    onTimestampBlur,
    onTimestampEnter,
    onOpenVideoPicker,
    onSelectVideo,
    onTimeUpdate,
    syncWithCurrentFrame,
    seekToTimestampInput,
  };
}
