import { useAppController } from "../../../app/providers/app-controller.provider";
import "./install-fab.css";

export function InstallFab() {
  const { t, install } = useAppController();
  return (
    <div class="install-fab-wrap floating-install-wrap">
      <button
        type="button"
        class="install-fab floating-install-fab"
        onClick={install.onMobileInstallFabPress}
        aria-label={
          install.showInstallButton
            ? t("install.installAria")
            : install.showMobileIOSInstallFab
              ? t("install.addToHomeAria")
              : t("install.installHelpAria")
        }
        title={
          install.showInstallButton
            ? t("hero.installApp")
            : install.showMobileIOSInstallFab
              ? t("hero.addToHomeScreen")
              : t("hero.installApp")
        }
      >
        <span class="icon-sm u-icon-sm" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 4V14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
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
      </button>
    </div>
  );
}
