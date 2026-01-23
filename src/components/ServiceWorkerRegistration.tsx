"use client";

import { useEffect } from "react";
import { useServiceWorker } from "@/hooks/useServiceWorker";

export function ServiceWorkerRegistration() {
  const { isSupported, error } = useServiceWorker();

  useEffect(() => {
    if (!isSupported) {
      console.log("Service Worker nije podržan u ovom browser-u");
    }
    if (error) {
      console.error("Service Worker error:", error);
    }
  }, [isSupported, error]);

  return null; // Ova komponenta ne renderuje ništa
}
