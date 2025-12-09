"use client";

import { useState } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { BellIcon, BellSlashIcon } from "@heroicons/react/24/outline";

export function PushNotificationButton() {
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe } =
    usePushNotifications();
  const [loading, setLoading] = useState(false);

  if (!isSupported) {
    return null;
  }

  const handleToggle = async () => {
    setLoading(true);
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
    setLoading(false);
  };

  if (permission === "denied") {
    return (
      <div className="text-xs text-red-600 p-2">
        Notifikacije su onemogućene u postavkama browser-a
      </div>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
    >
      {isSubscribed ? (
        <>
          <BellIcon className="w-5 h-5 text-green-600" />
          <span>Notifikacije ON</span>
        </>
      ) : (
        <>
          <BellSlashIcon className="w-5 h-5 text-slate-400" />
          <span>Omogući notifikacije</span>
        </>
      )}
    </button>
  );
}
