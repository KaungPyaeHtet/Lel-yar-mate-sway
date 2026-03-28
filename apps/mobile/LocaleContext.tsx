import {
  DEFAULT_APP_LOCALE,
  LOCALE_STORAGE_KEY,
  appT,
  appTFormat,
  parseStoredLocale,
  type AppLocale,
  type AppStringKey,
} from "@agriora/core";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type I18n = {
  locale: AppLocale;
  setLocale: (l: AppLocale) => void;
  t: (k: AppStringKey) => string;
  tf: (k: AppStringKey, vars: Record<string, string | number>) => string;
};

const LocaleContext = createContext<I18n | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(DEFAULT_APP_LOCALE);

  useEffect(() => {
    void AsyncStorage.getItem(LOCALE_STORAGE_KEY).then((raw) => {
      setLocaleState(parseStoredLocale(raw));
    });
  }, []);

  const setLocale = useCallback((l: AppLocale) => {
    setLocaleState(l);
    void AsyncStorage.setItem(LOCALE_STORAGE_KEY, l);
  }, []);

  const value = useMemo<I18n>(
    () => ({
      locale,
      setLocale,
      t: (k) => appT(locale, k),
      tf: (k, vars) => appTFormat(locale, k, vars),
    }),
    [locale, setLocale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useI18n(): I18n {
  const v = useContext(LocaleContext);
  if (!v) throw new Error("useI18n must be used within LocaleProvider");
  return v;
}
