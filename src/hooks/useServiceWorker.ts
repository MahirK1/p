


"use client";

import { useEffect, useState } from "react";

export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Provjeri da li browser podržava Service Workers
    if (!("serviceWorker" in navigator)) {
      console.log("Service Worker nije podržan");
      return;
    }

    setIsSupported(true);

    // Registruj Service Worker
    async function register() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        console.log("Service Worker registered:", registration);

        // Ažuriraj registraciju kada se servisni radnik ažurira
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // Novi Service Worker je instaliran
                console.log("Novi Service Worker je instaliran");
              }
            });
          }
        });

        setRegistration(registration);
        setError(null);
      } catch (err: any) {
        console.error("Service Worker registration failed:", err);
        setError(err.message);
        setRegistration(null);
      }
    }

    // Čekaj da browser bude spreman
    if (navigator.serviceWorker.controller) {
      // Service Worker već postoji
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
      });
    } else {
      // Registruj novi Service Worker
      register();
    }
  }, []);

  return { registration, isSupported, error };
}




