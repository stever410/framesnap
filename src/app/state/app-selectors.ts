import type { AppState } from "./app-state.types";

export function selectHasVideo(state: AppState): boolean {
  return state.video.objectUrl !== null;
}

export function selectShowInstallButton(state: AppState): boolean {
  return !state.install.isInstalled && state.install.isInstallEligible;
}

export function selectShowAddToHomeScreenButton(state: AppState): boolean {
  return !state.install.isInstalled && state.capabilities.isIOS && !state.install.isInstallEligible;
}

export function selectShowDesktopInstallButton(state: AppState): boolean {
  return !state.install.isMobileViewport && selectShowInstallButton(state);
}

export function selectShowDesktopAddToHomeScreenButton(state: AppState): boolean {
  return !state.install.isMobileViewport && selectShowAddToHomeScreenButton(state);
}

export function selectShowMobileIOSInstallFab(state: AppState): boolean {
  return state.install.isMobileViewport && !state.install.isInstalled && state.capabilities.isIOS;
}

export function selectShowMobileAndroidInstallCard(state: AppState): boolean {
  return (
    state.install.isMobileViewport &&
    !state.install.isInstalled &&
    state.capabilities.isAndroid &&
    selectShowInstallButton(state)
  );
}

export function selectShowMobileFallbackInstallFab(state: AppState): boolean {
  return (
    state.install.isMobileViewport &&
    !state.install.isInstalled &&
    !state.capabilities.isIOS &&
    !state.capabilities.isAndroid
  );
}
