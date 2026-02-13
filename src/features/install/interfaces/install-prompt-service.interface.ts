export type InstallPromptHandlers = {
  onBeforeInstallPrompt: (event: Event) => void;
  onAppInstalled: () => void;
  onDisplayModeChange: () => void;
};

export interface InstallPromptService {
  detectStandalone(): boolean;
  isAndroidMobile(): boolean;
  subscribeInstallEvents(handlers: InstallPromptHandlers): () => void;
  subscribeViewportChange(onViewportChange: (isMobile: boolean) => void): () => void;
}
