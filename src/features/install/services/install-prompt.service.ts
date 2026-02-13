import { isAndroid } from "../../../platform/capability";
import type {
  InstallPromptHandlers,
  InstallPromptService,
} from "../interfaces/install-prompt-service.interface";
import type { IOSNavigator } from "../types/install.types";

const MOBILE_MEDIA_QUERY = "(max-width: 680px)";
const STANDALONE_MEDIA_QUERY = "(display-mode: standalone)";

export const installPromptService: InstallPromptService = {
  detectStandalone(): boolean {
    const mediaStandalone = window.matchMedia(STANDALONE_MEDIA_QUERY).matches;
    const iosStandalone = Boolean((navigator as IOSNavigator).standalone);
    return mediaStandalone || iosStandalone;
  },
  isAndroidMobile(): boolean {
    return isAndroid() && window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  },
  subscribeInstallEvents(handlers: InstallPromptHandlers): () => void {
    const displayModeMediaQuery = window.matchMedia(STANDALONE_MEDIA_QUERY);

    window.addEventListener("beforeinstallprompt", handlers.onBeforeInstallPrompt);
    window.addEventListener("appinstalled", handlers.onAppInstalled);
    displayModeMediaQuery.addEventListener("change", handlers.onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handlers.onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handlers.onAppInstalled);
      displayModeMediaQuery.removeEventListener("change", handlers.onDisplayModeChange);
    };
  },
  subscribeViewportChange(onViewportChange: (isMobile: boolean) => void): () => void {
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);

    const syncViewportState = (): void => {
      onViewportChange(mediaQuery.matches);
    };

    syncViewportState();
    mediaQuery.addEventListener("change", syncViewportState);

    return () => {
      mediaQuery.removeEventListener("change", syncViewportState);
    };
  },
};
