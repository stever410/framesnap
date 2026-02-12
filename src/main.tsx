import { render } from "preact";
import { App } from "./app/app";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";

if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    void navigator.serviceWorker.register("/sw.js");
  } else {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      void Promise.all(registrations.map((registration) => registration.unregister()));
    });
  }
}

const root = document.getElementById("app");
if (!root) {
  throw new Error("Root element #app not found");
}

render(<App />, root);
