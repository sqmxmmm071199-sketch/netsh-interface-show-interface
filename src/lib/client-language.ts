"use client";

import { useEffect, useState } from "react";
import {
  languageCookieName,
  normalizeLanguage,
  type AppLanguage,
} from "@/lib/i18n";

const storageKey = languageCookieName;
const changeEventName = "yunque-language-change";

function readCookieLanguage() {
  if (typeof document === "undefined") return null;

  const value = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${languageCookieName}=`))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : null;
}

export function getStoredLanguage(): AppLanguage {
  if (typeof window === "undefined") return "zh-CN";

  const localValue = window.localStorage.getItem(storageKey);
  return normalizeLanguage(localValue ?? readCookieLanguage());
}

export function setStoredLanguage(language: AppLanguage) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(storageKey, language);
  document.cookie = `${languageCookieName}=${encodeURIComponent(
    language,
  )}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(
    new CustomEvent(changeEventName, {
      detail: { language },
    }),
  );
}

export function useLanguage() {
  const [language, setLanguageState] = useState<AppLanguage>("zh-CN");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLanguageState(getStoredLanguage());
    }, 0);

    function handleLanguageChange(event: Event) {
      const customEvent = event as CustomEvent<{ language?: unknown }>;
      setLanguageState(normalizeLanguage(customEvent.detail?.language));
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === storageKey) {
        setLanguageState(normalizeLanguage(event.newValue));
      }
    }

    window.addEventListener(changeEventName, handleLanguageChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(changeEventName, handleLanguageChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return {
    language,
    setLanguage: setStoredLanguage,
  };
}
