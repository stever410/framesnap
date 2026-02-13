import { useAppController } from "../../../app/providers/app-controller.provider";
import "./video-upload-card.css";

export function VideoUploadCard() {
  const { t, hasVideo, video, videoFileName } = useAppController();

  return (
    <>
      <input
        ref={video.fileInputRef}
        id="video-upload"
        class="video-upload__input file-input-hidden"
        type="file"
        accept="video/*"
        onChange={(event) => {
          void video.onSelectVideo(event);
        }}
      />

      {!hasVideo ? (
        <section class="video-upload upload-card u-glass u-card">
          <button
            type="button"
            class="video-upload__dropzone upload-dropzone"
            onClick={video.onOpenVideoPicker}
          >
            <span class="video-upload__title upload-title">{t("upload.dropzoneTitle")}</span>
            <span class="video-upload__subtitle upload-subtitle">
              {t("upload.dropzoneSubtitle")}
            </span>
          </button>
          <p class="video-upload__meta meta upload-meta">
            {videoFileName
              ? t("upload.currentFile", { fileName: videoFileName })
              : t("upload.noFile")}
          </p>
        </section>
      ) : null}
    </>
  );
}
