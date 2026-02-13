import type { Theme } from "../types/shell.types";

export interface ThemeStorageService {
  getTheme(): Theme | null;
  setTheme(theme: Theme): void;
}
