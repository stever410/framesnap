import { type ComponentChildren, createContext } from "preact";
import { useContext, useEffect, useMemo, useRef } from "preact/hooks";
import {
  type UseCaptureControllerResult,
  useCaptureController,
} from "../../features/capture/hooks/use-capture-controller";
import {
  type UseInstallControllerResult,
  useInstallController,
} from "../../features/install/hooks/use-install-controller";
import { useThemePreference } from "../../features/shell/hooks/use-theme-preference";
import {
  type UseVideoControllerResult,
  useVideoController,
} from "../../features/video/hooks/use-video-controller";
import { type I18nKey, type I18nParams, type Locale, useI18n } from "../../i18n";
import { canShareFiles, isAndroid, isIOS } from "../../platform/capability";
import type { ResolvedErrorCode } from "../../shared/errors";
import { appActions } from "../state/app-actions";
import { selectHasVideo } from "../state/app-selectors";
import { useAppStore } from "./app-store.provider";

type Translate = (key: I18nKey, params?: I18nParams) => string;

export type AppControllerContextValue = {
  t: Translate;
  locale: Locale;
  currentLocaleCode: "EN" | "VI";
  onSelectLocale: (nextLocale: Locale) => void;
  localeDropdownRef: { current: HTMLDetailsElement | null };
  themeToggleLabel: string;
  toggleTheme: () => void;
  hasVideo: boolean;
  videoFileName: string | null;
  appVersion: string;
  isIOS: boolean;
  install: UseInstallControllerResult;
  video: UseVideoControllerResult;
  capture: UseCaptureControllerResult;
  errorMessage: string | null;
};

const AppControllerContext = createContext<AppControllerContextValue | undefined>(undefined);

type AppControllerProviderProps = {
  children: ComponentChildren;
};

export function AppControllerProvider({ children }: AppControllerProviderProps) {
  const { state, dispatch } = useAppStore();
  const { locale, setLocale, t } = useI18n();
  const localeDropdownRef = useRef<HTMLDetailsElement | null>(null);

  const { theme, toggleTheme } = useThemePreference();
  const install = useInstallController({ state, dispatch });

  const getErrorMessage = (code: ResolvedErrorCode): string => {
    switch (code) {
      case "UNSUPPORTED_FORMAT":
      case "VIDEO_LOAD_FAILED":
      case "SEEK_TIMEOUT":
      case "CAPTURE_FAILED":
      case "SHARE_FAILED":
      case "UNKNOWN":
        return t(`errors.${code}`);
      default:
        return t("errors.UNKNOWN");
    }
  };

  const video = useVideoController({
    state,
    dispatch,
    getErrorMessage,
    seekInputErrorMessage: t("errors.SEEK_INPUT_FAILED"),
  });

  const capture = useCaptureController({
    state,
    dispatch,
    timestampInput: video.timestampInput,
    shareTitle: t("captureModal.shareTitle"),
    shareUnavailableMessage: t("errors.SHARE_UNAVAILABLE"),
    getErrorMessage,
    videoRef: video.videoRef,
  });

  useEffect(() => {
    dispatch(
      appActions.bootstrap({
        canShareFiles: canShareFiles(),
        isIOS: isIOS(),
        isAndroid: isAndroid(),
      }),
    );
  }, [dispatch]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }

      if (localeDropdownRef.current?.hasAttribute("open")) {
        localeDropdownRef.current.removeAttribute("open");
        return;
      }

      if (install.isA2HSHelpOpen) {
        install.closeA2HSHelp();
        return;
      }

      if (capture.isCaptureModalOpen) {
        capture.closeCaptureModal();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    capture.isCaptureModalOpen,
    capture.closeCaptureModal,
    install.isA2HSHelpOpen,
    install.closeA2HSHelp,
  ]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent): void => {
      const dropdown = localeDropdownRef.current;
      if (!dropdown || !dropdown.hasAttribute("open")) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !dropdown.contains(target)) {
        dropdown.removeAttribute("open");
      }
    };

    window.addEventListener("pointerdown", onPointerDown);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  const onSelectLocale = (nextLocale: Locale): void => {
    setLocale(nextLocale);
    localeDropdownRef.current?.removeAttribute("open");
  };

  const value = useMemo<AppControllerContextValue>(
    () => ({
      t,
      locale,
      currentLocaleCode: locale === "en" ? "EN" : "VI",
      onSelectLocale,
      localeDropdownRef,
      themeToggleLabel: theme === "dark" ? t("hero.switchToLight") : t("hero.switchToDark"),
      toggleTheme,
      hasVideo: selectHasVideo(state),
      videoFileName: state.video.fileName,
      appVersion: __APP_VERSION__,
      isIOS: state.capabilities.isIOS,
      install,
      video,
      capture,
      errorMessage: state.error.message,
    }),
    [capture, install, locale, onSelectLocale, state, t, theme, toggleTheme, video],
  );

  return <AppControllerContext.Provider value={value}>{children}</AppControllerContext.Provider>;
}

export function useAppController(): AppControllerContextValue {
  const context = useContext(AppControllerContext);
  if (!context) {
    throw new Error("useAppController must be used within AppControllerProvider");
  }

  return context;
}
