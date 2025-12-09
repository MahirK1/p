"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useServiceWorker } from "./useServiceWorker";

export function usePushNotifications() {
  const { data: session } = useSession();
  const { registration, isSupported } = useServiceWorker();
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!registration || !isSupported) {
      setLoading(false);
      return;
    }

    // Provjeri postojeću subscription
    registration.pushManager
      .getSubscription()
      .then((sub) => {
        if (sub) {
          setSubscription(sub);
          setIsSubscribed(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error getting subscription:", err);
        setLoading(false);
      });
  }, [registration, isSupported]);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      alert("Ovaj browser ne podržava notifikacije.");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission === "denied") {
      alert(
        "Notifikacije su onemogućene. Omogućite ih u postavkama browser-a."
      );
      return false;
    }

    const permission = await Notification.requestPermission();
    setPermission(permission);

    return permission === "granted";
  };

  const subscribe = async () => {
    if (!registration || !isSupported) {
      alert("Service Worker nije dostupan. Molimo osvježite stranicu.");
      return false;
    }

    const hasPermission = await requestPermission();
    if (!hasPermission) return false;

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      alert("VAPID public key nije konfigurisan. Provjerite .env fajl.");
      return false;
    }

    try {
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      setSubscription(sub);
      setIsSubscribed(true);

      // Pošalji subscription na server
      if (session?.user) {
        const response = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: {
              endpoint: sub.endpoint,
              keys: {
                p256dh: arrayBufferToBase64(sub.getKey("p256dh")!),
                auth: arrayBufferToBase64(sub.getKey("auth")!),
              },
            },
            userId: (session.user as any).id,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save subscription");
        }
      }

      return true;
    } catch (err: any) {
      console.error("Subscription failed:", err);
      alert(`Greška pri aktivaciji notifikacija: ${err.message}`);
      return false;
    }
  };

  const unsubscribe = async () => {
    if (!subscription) return false;

    try {
      await subscription.unsubscribe();

      // Ukloni sa servera
      if (session?.user) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: (session.user as any).id,
          }),
        });
      }

      setSubscription(null);
      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error("Unsubscribe failed:", err);
      return false;
    }
  };

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}

// Helper funkcije
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}