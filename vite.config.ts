import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
) as { version: string };

export default defineConfig({
  plugins: [preact()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
