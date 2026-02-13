import { type Dispatch, useEffect, useMemo, useState } from "preact/hooks";
import { appActions } from "../../../app/state/app-actions";
import type { AppAction } from "../../../app/state/app-actions.types";
import {
  selectShowDesktopAddToHomeScreenButton,
  selectShowDesktopInstallButton,
  selectShowInstallButton,
  selectShowMobileAndroidInstallCard,
  selectShowMobileFallbackInstallFab,
  selectShowMobileIOSInstallFab,
} from "../../../app/state/app-selectors";
import type { AppState } from "../../../app/state/app-state.types";
import type { InstallPromptService } from "../interfaces/install-prompt-service.interface";
import { installPromptService } from "../services/install-prompt.service";
import type { BeforeInstallPromptEvent } from "../types/install.types";

type UseInstallControllerParams = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  service?: InstallPromptService;
};

export type UseInstallControllerResult = {
  showInstallButton: boolean;
  showDesktopInstallButton: boolean;
  showDesktopAddToHomeScreenButton: boolean;
  showMobileIOSInstallFab: boolean;
  showMobileAndroidInstallCard: boolean;
  showMobileFallbackInstallFab: boolean;
  isA2HSHelpOpen: boolean;
  openA2HSHelp: () => void;
  closeA2HSHelp: () => void;
  onInstallApp: () => Promise<void>;
  onMobileInstallFabPress: () => void;
};

export function useInstallController(
  params: UseInstallControllerParams,
): UseInstallControllerResult {
  const { state, dispatch, service = installPromptService } = params;
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    dispatch(
      appActions.updateInstallState({
        isInstalled: service.detectStandalone(),
      }),
    );

    const onBeforeInstallPrompt = (event: Event): void => {
      if (service.isAndroidMobile()) {
        setDeferredInstallPrompt(null);
        dispatch(appActions.updateInstallState({ isInstallEligible: false }));
        return;
      }

      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      setDeferredInstallPrompt(installEvent);
      dispatch(appActions.updateInstallState({ isInstallEligible: true }));
    };

    const onAppInstalled = (): void => {
      dispatch(
        appActions.updateInstallState({
          isInstalled: true,
          isInstallEligible: false,
          isA2HSHelpOpen: false,
        }),
      );
      setDeferredInstallPrompt(null);
    };

    const onDisplayModeChange = (): void => {
      if (service.detectStandalone()) {
        onAppInstalled();
      }
    };

    return service.subscribeInstallEvents({
      onBeforeInstallPrompt,
      onAppInstalled,
      onDisplayModeChange,
    });
  }, [dispatch, service]);

  useEffect(() => {
    return service.subscribeViewportChange((isMobile) => {
      dispatch(appActions.updateInstallState({ isMobileViewport: isMobile }));
    });
  }, [dispatch, service]);

  const showInstallButton = useMemo(() => selectShowInstallButton(state), [state]);

  const onInstallApp = async (): Promise<void> => {
    if (!deferredInstallPrompt) {
      return;
    }

    try {
      await deferredInstallPrompt.prompt();
      const choiceResult = await deferredInstallPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        dispatch(appActions.updateInstallState({ isInstalled: true }));
      }
    } finally {
      setDeferredInstallPrompt(null);
      dispatch(appActions.updateInstallState({ isInstallEligible: false }));
    }
  };

  const openA2HSHelp = (): void => {
    dispatch(appActions.updateInstallState({ isA2HSHelpOpen: true }));
  };

  const closeA2HSHelp = (): void => {
    dispatch(appActions.updateInstallState({ isA2HSHelpOpen: false }));
  };

  const onMobileInstallFabPress = (): void => {
    if (showInstallButton) {
      void onInstallApp();
      return;
    }

    openA2HSHelp();
  };

  return {
    showInstallButton,
    showDesktopInstallButton: selectShowDesktopInstallButton(state),
    showDesktopAddToHomeScreenButton: selectShowDesktopAddToHomeScreenButton(state),
    showMobileIOSInstallFab: selectShowMobileIOSInstallFab(state),
    showMobileAndroidInstallCard: selectShowMobileAndroidInstallCard(state),
    showMobileFallbackInstallFab: selectShowMobileFallbackInstallFab(state),
    isA2HSHelpOpen: state.install.isA2HSHelpOpen,
    openA2HSHelp,
    closeA2HSHelp,
    onInstallApp,
    onMobileInstallFabPress,
  };
}
