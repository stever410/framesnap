import { useAppController } from "../../../app/providers/app-controller.provider";
import "./app-header.css";

export function AppHeader() {
  const { t, install, toggleTheme, themeToggleLabel } = useAppController();

  return (
    <header class="app-header hero hero--compact u-glass u-card">
      <div class="app-header__headline hero-headline">
        <div class="app-header__brand brand-title">
          <img
            class="app-header__logo brand-title__logo"
            src="/favicon.svg"
            alt=""
            width="34"
            height="34"
            aria-hidden="true"
          />
          <h1 class="display">FrameSnap</h1>
        </div>
        <p class="body hero-subtitle app-header__subtitle">{t("hero.subtitle")}</p>
      </div>
      <div class="app-header__actions hero-actions">
        {install.showDesktopInstallButton ? (
          <button
            type="button"
            class="btn-secondary with-icon hero-install-btn u-btn-with-icon"
            onClick={() => {
              void install.onInstallApp();
            }}
          >
            <span class="icon-sm u-icon-sm" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 4V13.8"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
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
        ) : null}
        {install.showDesktopAddToHomeScreenButton ? (
          <button
            type="button"
            class="btn-secondary hero-install-btn"
            onClick={install.openA2HSHelp}
          >
            {t("hero.addToHomeScreen")}
          </button>
        ) : null}
        <button
          type="button"
          class="theme-icon-toggle"
          onClick={toggleTheme}
          aria-label={themeToggleLabel}
          title={themeToggleLabel}
        >
          <span class="theme-icon-toggle__sun icon-sm u-icon-sm" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.8" />
              <path
                d="M12 2.8V5.2M12 18.8V21.2M21.2 12H18.8M5.2 12H2.8M18.5 5.5L16.8 7.2M7.2 16.8L5.5 18.5M18.5 18.5L16.8 16.8M7.2 7.2L5.5 5.5"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
          </span>
          <span class="theme-icon-toggle__moon icon-sm u-icon-sm" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M14.2 3.4a8.8 8.8 0 1 0 6.4 14.8A9.2 9.2 0 0 1 14.2 3.4Z"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </button>
      </div>
    </header>
  );
}
