"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BellIcon } from "@heroicons/react/24/outline";
import classNames from "classnames";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=50");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const markRead = async (id: string, url: string | null) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n
      )
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    setOpen(false);
    if (url) router.push(url);
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    await load();
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
        aria-label="Obavijesti"
      >
        <BellIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full flex items-center justify-center text-[10px] font-bold bg-red-500 text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="font-semibold text-slate-800">Obavijesti</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-blue-600 hover:underline"
              >
                Označi sve pročitano
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Učitavam...</p>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Nema obavijesti.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markRead(n.id, n.url)}
                  className={classNames(
                    "w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition",
                    !n.readAt && "bg-blue-50/50"
                  )}
                >
                  <div className="font-medium text-sm text-slate-800">{n.title}</div>
                  <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.body}</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {new Date(n.createdAt).toLocaleString("bs-BA", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-sm font-medium text-blue-600 hover:underline"
            >
              Sve obavijesti →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
