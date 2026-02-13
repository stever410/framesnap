import { useAppController } from "../../../app/providers/app-controller.provider";
import "./mobile-install-card.css";

export function MobileInstallCard() {
  const { t, install } = useAppController();
  return (
    <section class="install-card mobile-install-card u-glass u-card">
      <p class="install-card__title mobile-install-card__title">
        {t("install.mobileInstallTitle")}
      </p>
      <button
        type="button"
        class="install-card__button btn-primary with-icon mobile-install-card__button u-btn-with-icon"
        onClick={() => {
          void install.onInstallApp();
        }}
      >
        <span class="icon-sm u-icon-sm" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 4V13.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <path
              d="M8.8 10.9L12 13.9L15.2 10.9"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <rect
              x="5"
              y="15.5"
              width="14"
              height="4"
              rx="1.6"
              stroke="currentColor"
              stroke-width="1.8"
            />
          </svg>
        </span>
        {t("hero.installApp")}
      </button>
    </section>
  );
}
