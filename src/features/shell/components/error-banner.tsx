import { useAppController } from "../../../app/providers/app-controller.provider";
import { useAppStore } from "../../../app/providers/app-store.provider";
import { appActions } from "../../../app/state/app-actions";
import "./error-banner.css";

export function ErrorBanner() {
  const { dispatch } = useAppStore();
  const { t, errorMessage } = useAppController();
  if (!errorMessage) {
    return null;
  }

  return (
    <output class="app-error-banner error-banner" aria-live="polite">
      <p class="app-error-banner__message">{errorMessage}</p>
      <button type="button" class="btn-secondary" onClick={() => dispatch(appActions.clearError())}>
        {t("common.dismiss")}
      </button>
    </output>
  );
}
