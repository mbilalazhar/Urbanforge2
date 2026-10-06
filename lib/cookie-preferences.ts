"use client";

import { useSyncExternalStore } from "react";

export type CookiePreference = "all" | "necessary";
const storageKey = "urbanforge:cookie-preferences:v2";
const changeEvent = "urbanforge-cookie-preferences";
let preferenceForVisit: CookiePreference | null = null;

function getPreference(): CookiePreference | null {
  if (preferenceForVisit) return preferenceForVisit;
  try {
    const value = localStorage.getItem(storageKey);
    return value === "all" || value === "necessary" ? value : null;
  } catch { return null; }
}

function subscribe(update: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) update();
  };
  window.addEventListener(changeEvent, update);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changeEvent, update);
    window.removeEventListener("storage", onStorage);
  };
}

// An undefined server snapshot avoids flashing the banner for returning visitors.
export function useCookiePreference() {
  return useSyncExternalStore(subscribe, getPreference, () => undefined);
}

export function saveCookiePreference(preference: CookiePreference) {
  try {
    localStorage.setItem(storageKey, preference);
    preferenceForVisit = null;
  } catch { preferenceForVisit = preference; }
  try {
    localStorage.removeItem("urbanforge:cookie-acceptance:v1");
    if (preference === "necessary") localStorage.removeItem("urbanforge-visitor");
  } catch { /* The choice still applies for this visit if storage is unavailable. */ }
  window.dispatchEvent(new Event(changeEvent));
}
