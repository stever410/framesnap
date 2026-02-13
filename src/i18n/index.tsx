import { type ComponentChildren, createContext } from "preact";
import { useContext, useEffect, useMemo, useState } from "preact/hooks";
import enMessages from "./locales/en.json";
import viMessages from "./locales/vi.json";

export type Locale = "en" | "vi";

export const SUPPORTED_LOCALES: readonly Locale[] = ["en", "vi"];
export const DEFAULT_LOCALE: Locale = "en";
const LOCALE_STORAGE_KEY = "framesnap-locale";
const MANIFEST_BY_LOCALE: Record<Locale, string> = {
  en: "/manifest.en.webmanifest",
  vi: "/manifest.vi.webmanifest",
};

type MessageCatalog = {
  [key: string]: string | MessageCatalog;
};

const EN_MESSAGES = enMessages;

type MessageSchema = {
  [K in keyof typeof EN_MESSAGES]: (typeof EN_MESSAGES)[K] extends string
    ? string
    : {
        [P in keyof (typeof EN_MESSAGES)[K]]: (typeof EN_MESSAGES)[K][P] extends string
          ? string
          : never;
      };
};

const VI_MESSAGES: MessageSchema = viMessages;

const MESSAGES: Record<Locale, MessageSchema> = {
  en: EN_MESSAGES,
  vi: VI_MESSAGES,
};

type MessageKey<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${MessageKey<T[K]>}`;
}[keyof T & string];

export type I18nKey = MessageKey<typeof EN_MESSAGES>;
export type I18nParams = Record<string, string | number>;

function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "vi";
}

function readMessage(locale: Locale, key: I18nKey): string | undefined {
  const path = key.split(".");
  let cursor: string | MessageCatalog | undefined = MESSAGES[locale];

  for (const part of path) {
    if (typeof cursor !== "object" || cursor === null) {
      return undefined;
    }
    cursor = cursor[part];
  }

  return typeof cursor === "string" ? cursor : undefined;
}

function formatMessage(template: string, params?: I18nParams): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = params[name];
    return value === undefined ? "" : String(value);
  });
}

function getTemplate(locale: Locale, key: I18nKey): string {
  const localized = readMessage(locale, key);
  if (localized !== undefined) {
    return localized;
  }

  const fallback = readMessage(DEFAULT_LOCALE, key);
  if (fallback !== undefined) {
    return fallback;
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(`Missing i18n key: ${key}`);
  }

  return key;
}

function applyLocaleMetadata(locale: Locale): void {
  document.documentElement.lang = locale;
  document.title = formatMessage(getTemplate(locale, "meta.title"));

  const descriptionMeta = document.getElementById("meta-description");
  if (descriptionMeta instanceof HTMLMetaElement) {
    descriptionMeta.content = formatMessage(getTemplate(locale, "meta.description"));
  }

  const manifestLink = document.getElementById("app-manifest");
  if (manifestLink instanceof HTMLLinkElement) {
    manifestLink.href = MANIFEST_BY_LOCALE[locale];
  }
}

export function resolveInitialLocale(): Locale {
  try {
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(storedLocale)) {
      return storedLocale;
    }
  } catch {
    // Ignore storage access errors.
  }

  const browserLocale = navigator.language.toLowerCase();
  if (browserLocale.startsWith("vi")) {
    return "vi";
  }

  return DEFAULT_LOCALE;
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: I18nKey, params?: I18nParams) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

type I18nProviderProps = {
  children: ComponentChildren;
};

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => resolveInitialLocale());

  const setLocale = (nextLocale: Locale): void => {
    setLocaleState(nextLocale);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    } catch {
      // Ignore storage access errors.
    }
  };

  useEffect(() => {
    applyLocaleMetadata(locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: I18nKey, params?: I18nParams): string => {
      return formatMessage(getTemplate(locale, key), params);
    };

    return {
      locale,
      setLocale,
      t,
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }

  return context;
}
