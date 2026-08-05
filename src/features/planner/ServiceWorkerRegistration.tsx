"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability/offline support is a progressive enhancement —
        // nothing else in the app depends on the service worker succeeding.
      });
    }
  }, []);

  return null;
}
