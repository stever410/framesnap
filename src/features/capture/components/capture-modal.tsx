import { useAppController } from "../../../app/providers/app-controller.provider";
import { useAppStore } from "../../../app/providers/app-store.provider";
import { formatFileSize, formatTimestamp } from "../../../ui/format";
import { CAPTURE_UPSCALE_FACTORS, type CaptureUpscaleFactor } from "../types/capture-upscale.types";
import "./capture-modal.css";

export function CaptureModal() {
  const { state } = useAppStore();
  const { t, capture, isIOS } = useAppController();

  if (!capture.isCaptureModalOpen || !capture.previewUrl || state.capture.timestampSec === null) {
    return null;
  }

  const isValidUpscaleFactor = (value: number): value is CaptureUpscaleFactor => {
    return CAPTURE_UPSCALE_FACTORS.includes(value as CaptureUpscaleFactor);
  };

  return (
    <div
      class="modal-backdrop capture-modal__backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          capture.closeCaptureModal();
        }
      }}
    >
      <section
        class="capture-modal u-glass u-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-modal-title"
      >
        <div class="capture-modal__header">
          <h2 id="capture-modal-title" class="capture-modal__title">
            {t("captureModal.title")}
          </h2>
          <button
            type="button"
            class="modal-close"
            onClick={capture.closeCaptureModal}
            aria-label={t("captureModal.closePreviewAria")}
          >
            <span class="icon-sm u-icon-sm" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 7L17 17M17 7L7 17"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
              </svg>
            </span>
          </button>
        </div>
        <img class="capture-image" src={capture.previewUrl} alt={t("captureModal.imageAlt")} />
        <div class="chip-row">
          <span class="chip">{formatTimestamp(state.capture.timestampSec)}</span>
          <span class="chip">
            {state.capture.width} x {state.capture.height}
          </span>
          <span class="chip">
            {state.capture.file
              ? formatFileSize(state.capture.file.size)
              : t("captureModal.fileSizeFallback")}
          </span>
        </div>
        <div class="capture-upscale-panel">
          <div class="capture-output-wrap">
            <label class="capture-output-label" htmlFor="upscale-select">
              {t("captureModal.downloadSizeLabel")}
            </label>
            <select
              id="upscale-select"
              class="capture-output-select"
              value={`${capture.captureUpscaleFactor}`}
              disabled={capture.isApplyingUpscale}
              onChange={(event) => {
                const nextValue = Number((event.target as HTMLSelectElement).value);
                if (isValidUpscaleFactor(nextValue)) {
                  void capture.onChangeUpscaleFactor(nextValue);
                }
              }}
            >
              {CAPTURE_UPSCALE_FACTORS.map((factor) => (
                <option key={factor} value={factor}>
                  {factor === 1
                    ? t("captureModal.upscaleOriginalOption")
                    : t("captureModal.upscaleOption", { factor })}
                </option>
              ))}
            </select>
          </div>
          <p class="capture-upscale-note">{t("captureModal.upscaleNote")}</p>
          {capture.isApplyingUpscale ? (
            <p class="capture-upscale-status">{t("captureModal.upscaleStatus")}</p>
          ) : null}
        </div>

        <div class="capture-modal__actions">
          {state.capabilities.canShareFiles ? (
            <button
              type="button"
              class="btn-primary with-icon u-btn-with-icon"
              onClick={() => {
                void capture.onShare();
              }}
            >
              <span class="icon-sm u-icon-sm" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 4V14"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                  <path
                    d="M8.5 7.5L12 4L15.5 7.5"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                  <rect
                    x="5"
                    y="14.5"
                    width="14"
                    height="5"
                    rx="1.8"
                    stroke="currentColor"
                    stroke-width="1.8"
                  />
                </svg>
              </span>
              {t("captureModal.share")}
            </button>
          ) : null}
          <button
            type="button"
            class="btn-secondary with-icon u-btn-with-icon"
            onClick={capture.onDownload}
            disabled={capture.downloadState !== "idle"}
          >
            <span class="icon-sm u-icon-sm" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 4V14"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
                <path
                  d="M8.5 10.5L12 14L15.5 10.5"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
                <rect
                  x="5"
                  y="15"
                  width="14"
                  height="4.5"
                  rx="1.8"
                  stroke="currentColor"
                  stroke-width="1.8"
                />
              </svg>
            </span>
            {capture.downloadState === "idle"
              ? t("captureModal.download")
              : capture.downloadState === "preparing"
                ? t("captureModal.preparing")
                : t("captureModal.downloading")}
          </button>
          <button
            type="button"
            class="btn-text with-icon u-btn-with-icon"
            onClick={capture.onCaptureAgain}
          >
            <span class="icon-sm u-icon-sm" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M6.5 12a5.5 5.5 0 1 0 1.3-3.5M6.5 8V4.8M6.5 8H9.7"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            {t("captureModal.captureAgain")}
          </button>
        </div>

        {isIOS ? <p class="meta">{t("captureModal.iosSaveHint")}</p> : null}
      </section>
    </div>
  );
}
