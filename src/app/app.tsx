import type { JSX } from "preact";
import { CaptureModal } from "../features/capture/components/capture-modal";
import { A2HSHelpModal } from "../features/install/components/a2hs-help-modal";
import { InstallFab } from "../features/install/components/install-fab";
import { MobileInstallCard } from "../features/install/components/mobile-install-card";
import { AppFooter } from "../features/shell/components/app-footer";
import { AppHeader } from "../features/shell/components/app-header";
import { ErrorBanner } from "../features/shell/components/error-banner";
import { VideoStage } from "../features/video/components/video-stage";
import { VideoUploadCard } from "../features/video/components/video-upload-card";
import { AppControllerProvider, useAppController } from "./providers/app-controller.provider";
import { AppStoreProvider } from "./providers/app-store.provider";

function AppLayout(): JSX.Element {
  const { hasVideo, install, errorMessage } = useAppController();

  return (
    <main
      class={
        hasVideo
          ? "app-shell app-shell--unified app-shell--video"
          : "app-shell app-shell--unified app-shell--upload-focus"
      }
    >
      <AppHeader />

      {install.showMobileAndroidInstallCard ? <MobileInstallCard /> : null}

      {install.showMobileIOSInstallFab || install.showMobileFallbackInstallFab ? (
        <InstallFab />
      ) : null}

      {errorMessage ? <ErrorBanner /> : null}

      <VideoUploadCard />

      {hasVideo ? <VideoStage /> : null}

      <CaptureModal />

      <A2HSHelpModal />

      <AppFooter />
    </main>
  );
}

export function App(): JSX.Element {
  return (
    <AppStoreProvider>
      <AppControllerProvider>
        <AppLayout />
      </AppControllerProvider>
    </AppStoreProvider>
  );
}
