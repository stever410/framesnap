import { useAppController } from "../../../app/providers/app-controller.provider";
import "./a2hs-help-modal.css";

export function A2HSHelpModal() {
  const { t, install, isIOS } = useAppController();

  if (!install.isA2HSHelpOpen) {
    return null;
  }

  const onClose = install.closeA2HSHelp;

  return (
    <div
      class="modal-backdrop install-help-modal__backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        class="install-help-modal a2hs-modal u-glass u-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="a2hs-modal-title"
      >
        <div class="capture-modal__header">
          <h2 id="a2hs-modal-title" class="capture-modal__title">
            {isIOS ? t("install.modalTitleIOS") : t("install.modalTitleDefault")}
          </h2>
          <button
            type="button"
            class="modal-close"
            onClick={onClose}
            aria-label={t("install.closeHelpAria")}
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
        <ol class="a2hs-modal__steps">
          {isIOS ? (
            <>
              <li>{t("install.iosStep1")}</li>
              <li>{t("install.iosStep2")}</li>
              <li>{t("install.iosStep3")}</li>
            </>
          ) : (
            <>
              <li>{t("install.defaultStep1")}</li>
              <li>{t("install.defaultStep2")}</li>
              <li>{t("install.defaultStep3")}</li>
            </>
          )}
        </ol>
      </section>
    </div>
  );
}
