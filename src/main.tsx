import { render } from "preact";
import { App } from "./app/app";
import { I18nProvider } from "./i18n";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";

const APP_VERSION = __APP_VERSION__;

if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    const swUrl = `/sw.js?v=${encodeURIComponent(APP_VERSION)}`;
    const hadControllerAtLoad = Boolean(navigator.serviceWorker.controller);
    let hasReloadedForUpdate = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadControllerAtLoad || hasReloadedForUpdate) {
        return;
      }
      hasReloadedForUpdate = true;
      window.location.reload();
    });

    void navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        const promptUpdate = (): void => {
          registration.waiting?.postMessage({ type: "SKIP_WAITING" });
        };

        if (registration.waiting) {
          promptUpdate();
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) {
            return;
          }

          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              promptUpdate();
            }
          });
        });

        void registration.update();
        window.setInterval(
          () => {
            void registration.update();
          },
          60 * 60 * 1000,
        );
      })
      .catch(() => {
        // Ignore SW registration failures and continue with network-only behavior.
      });
  } else {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      void Promise.all(
        registrations.map((registration) => registration.unregister()),
      );
    });
  }
}

const root = document.getElementById("app");
if (!root) {
  throw new Error("Root element #app not found");
}

render(
  <I18nProvider>
    <App />
  </I18nProvider>,
  root,
);
