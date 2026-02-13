import { useAppController } from "../../../app/providers/app-controller.provider";
import { useAppStore } from "../../../app/providers/app-store.provider";
import "./video-stage.css";

export function VideoStage() {
  const { state } = useAppStore();
  const { t, video, capture } = useAppController();

  return (
    <section class="video-stage u-glass u-card">
      <div class="video-stage__header">
        <div class="video-stage__title-wrap">
          <p class="video-stage__filename">{t("video.previewTitle")}</p>
        </div>
        <button type="button" class="video-stage__change" onClick={video.onOpenVideoPicker}>
          <span class="icon-sm u-icon-sm" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M6.5 7.5H14.5L17.5 10V16.5H6.5V7.5Z"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M10.2 11.2L13.1 12.9L10.2 14.6V11.2Z"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          {t("video.changeVideo")}
        </button>
      </div>

      <div class="video-stage__viewport">
        <video
          ref={video.videoRef}
          class="video-stage__media"
          src={state.video.objectUrl ?? undefined}
          controls
          playsInline
          preload="metadata"
          onTimeUpdate={video.onTimeUpdate}
          onPause={video.syncWithCurrentFrame}
          onEnded={video.syncWithCurrentFrame}
          onSeeked={video.syncWithCurrentFrame}
          aria-label={t("video.previewAria")}
        />
        <button
          type="button"
          class="btn-primary with-icon video-stage__capture-overlay u-btn-with-icon"
          disabled={state.phase === "capturing"}
          onClick={() => {
            void capture.onCapture();
          }}
          aria-label={
            state.phase === "capturing" ? t("video.capturingFrame") : t("video.captureFrame")
          }
          title={state.phase === "capturing" ? t("video.capturingFrame") : t("video.captureFrame")}
        >
          <span class="icon-sm u-icon-sm" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <rect
                x="5"
                y="8"
                width="14"
                height="9"
                rx="2"
                stroke="currentColor"
                stroke-width="1.8"
              />
              <path
                d="M8.5 8L10 5.8H14L15.5 8"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle cx="12" cy="12.5" r="2.3" stroke="currentColor" stroke-width="1.8" />
            </svg>
          </span>
        </button>
      </div>

      <div class="video-stage__controls">
        <div class="capture-controls">
          <div class="timestamp-input-wrap">
            <input
              id="timestamp-input"
              class="timestamp-input"
              value={video.timestampInput}
              placeholder={video.currentTimestampLabel}
              inputMode="decimal"
              aria-label={t("video.timestampAria")}
              onFocus={video.onTimestampFocus}
              onInput={video.onTimestampInput}
              onBlur={() => {
                void video.onTimestampBlur();
              }}
              onKeyDown={(event) => {
                void video.onTimestampEnter(event);
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
