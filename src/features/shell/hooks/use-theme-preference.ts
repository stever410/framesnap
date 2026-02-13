import { useEffect, useMemo, useState } from "preact/hooks";
import type { ThemeStorageService } from "../interfaces/theme-storage-service.interface";
import { themeStorageService } from "../services/theme-storage.service";
import type { Theme } from "../types/shell.types";

type UseThemePreferenceParams = {
  storage?: ThemeStorageService;
};

type UseThemePreferenceResult = {
  theme: Theme;
  toggleTheme: () => void;
};

export function useThemePreference(params?: UseThemePreferenceParams): UseThemePreferenceResult {
  const storage = params?.storage ?? themeStorageService;
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const savedTheme = storage.getTheme();
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, [storage]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    storage.setTheme(theme);
  }, [storage, theme]);

  const toggleTheme = useMemo(
    () => () => {
      setTheme((previousTheme) => (previousTheme === "light" ? "dark" : "light"));
    },
    [],
  );

  return {
    theme,
    toggleTheme,
  };
}
