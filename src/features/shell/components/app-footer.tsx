import { useAppController } from "../../../app/providers/app-controller.provider";
import type { Locale } from "../../../i18n";
import "./app-footer.css";

function LocaleFlag({ targetLocale }: { targetLocale: Locale }) {
  return targetLocale === "en" ? (
    <svg viewBox="0 0 36 24" fill="none">
      <rect width="36" height="24" rx="3" fill="#B22234" />
      <path
        d="M0 4H36V6.5H0V4ZM0 9H36V11.5H0V9ZM0 14H36V16.5H0V14ZM0 19H36V21.5H0V19Z"
        fill="#FFF"
      />
      <rect width="15.5" height="12.5" rx="2" fill="#3C3B6E" />
      <path
        d="M3.2 3.2H4.2V4.2H3.2V3.2ZM6.2 3.2H7.2V4.2H6.2V3.2ZM9.2 3.2H10.2V4.2H9.2V3.2ZM12.2 3.2H13.2V4.2H12.2V3.2ZM4.7 5.6H5.7V6.6H4.7V5.6ZM7.7 5.6H8.7V6.6H7.7V5.6ZM10.7 5.6H11.7V6.6H10.7V5.6ZM3.2 8H4.2V9H3.2V8ZM6.2 8H7.2V9H6.2V8ZM9.2 8H10.2V9H9.2V8ZM12.2 8H13.2V9H12.2V8Z"
        fill="#FFF"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 36 24" fill="none">
      <rect width="36" height="24" rx="3" fill="#DA251D" />
      <path
        d="M18 6.2L19.88 11.22H25.16L20.86 14.36L22.52 19.4L18 16.28L13.48 19.4L15.14 14.36L10.84 11.22H16.12L18 6.2Z"
        fill="#FFDE00"
      />
    </svg>
  );
}

export function AppFooter() {
  const { t, locale, onSelectLocale, currentLocaleCode, localeDropdownRef, appVersion } =
    useAppController();

  return (
    <footer class="app-footer">
      <div class="app-footer__text">
        <span class="app-footer__item app-footer__item--language">
          <span class="app-footer__label">{t("common.languageSwitcherLabel")}</span>
          <details class="locale-dropdown" ref={localeDropdownRef}>
            <summary
              class="locale-dropdown__trigger"
              aria-label={t("common.languageSwitcherLabel")}
              title={t("common.languageSwitcherLabel")}
            >
              <span class="locale-switch__flag" aria-hidden="true">
                <LocaleFlag targetLocale={locale} />
              </span>
              <span class="locale-dropdown__value">{currentLocaleCode}</span>
              <span class="locale-dropdown__chevron icon-sm u-icon-sm" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 10L12 15L17 10"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
            </summary>
            <div
              class="locale-dropdown__menu"
              role="menu"
              aria-label={t("common.languageSwitcherLabel")}
            >
              <button
                type="button"
                class={
                  locale === "en" ? "locale-dropdown__option is-active" : "locale-dropdown__option"
                }
                onClick={() => onSelectLocale("en")}
                role="menuitemradio"
                aria-checked={locale === "en"}
                aria-label={t("common.switchToEnglish")}
              >
                <span class="locale-switch__flag" aria-hidden="true">
                  <LocaleFlag targetLocale="en" />
                </span>
                <span class="locale-dropdown__option-code">EN</span>
              </button>
              <button
                type="button"
                class={
                  locale === "vi" ? "locale-dropdown__option is-active" : "locale-dropdown__option"
                }
                onClick={() => onSelectLocale("vi")}
                role="menuitemradio"
                aria-checked={locale === "vi"}
                aria-label={t("common.switchToVietnamese")}
              >
                <span class="locale-switch__flag" aria-hidden="true">
                  <LocaleFlag targetLocale="vi" />
                </span>
                <span class="locale-dropdown__option-code">VI</span>
              </button>
            </div>
          </details>
        </span>
        <span class="app-footer__item">
          <span class="icon-sm app-footer__icon u-icon-sm" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M7 6.5h10M7 12h10M7 17.5h6"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
          </span>
          {t("footer.version", { version: appVersion })}
        </span>
        <span class="app-footer__item">
          <span class="icon-sm app-footer__icon u-icon-sm" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 4.5a7.5 7.5 0 0 0-2.37 14.61c.38.07.51-.16.51-.37v-1.3c-2.08.45-2.52-.88-2.52-.88-.34-.86-.82-1.09-.82-1.09-.67-.46.05-.45.05-.45.74.05 1.14.75 1.14.75.66 1.12 1.73.8 2.15.61.07-.47.26-.8.47-.99-1.66-.19-3.4-.82-3.4-3.67 0-.81.29-1.47.76-1.99-.08-.19-.33-.95.07-1.98 0 0 .62-.2 2.03.76a7.02 7.02 0 0 1 3.7 0c1.4-.96 2.03-.76 2.03-.76.4 1.03.15 1.79.07 1.98.47.52.76 1.18.76 1.99 0 2.86-1.74 3.48-3.4 3.67.26.23.5.69.5 1.4v2.08c0 .21.14.45.52.37A7.5 7.5 0 0 0 12 4.5Z"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          {t("footer.madeByPrefix")}{" "}
          <a
            class="app-footer__link"
            href="https://github.com/stever410"
            target="_blank"
            rel="noreferrer"
          >
            stever410
          </a>
          {` ${t("footer.madeBySuffix")}`}
        </span>
      </div>
    </footer>
  );
}
