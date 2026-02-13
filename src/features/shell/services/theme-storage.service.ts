import type { ThemeStorageService } from "../interfaces/theme-storage-service.interface";
import type { Theme } from "../types/shell.types";

const STORAGE_KEY = "framesnap-theme";

export const themeStorageService: ThemeStorageService = {
  getTheme(): Theme | null {
    try {
      const savedTheme = window.localStorage.getItem(STORAGE_KEY);
      return savedTheme === "dark" || savedTheme === "light" ? savedTheme : null;
    } catch {
      return null;
    }
  },
  setTheme(theme: Theme): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage access failures and keep in-memory theme only.
    }
  },
};
