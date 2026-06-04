"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import classNames from "classnames";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Pagination } from "@/components/ui/Pagination";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationsList({ itemsPerPage = 20 }: { itemsPerPage?: number }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/notifications?limit=${itemsPerPage}&page=${page}`
      );
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
        setTotalPages(data.pagination?.totalPages ?? 1);
        setTotal(data.pagination?.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, itemsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id: string, url: string | null) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
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

  if (loading && notifications.length === 0) {
    return (
      <div className="flex justify-center p-12">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Sve obavijesti</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-slate-500 mt-0.5">
              {unreadCount} nepročitanih
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Označi sve pročitano
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="p-8 text-sm text-slate-500 text-center">
          Nema obavijesti u historiji.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {notifications.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => markRead(n.id, n.url)}
                className={classNames(
                  "w-full text-left px-6 py-4 hover:bg-slate-50 transition",
                  !n.readAt && "bg-blue-50/40"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{n.title}</p>
                    <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">
                      {n.body}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      {new Date(n.createdAt).toLocaleString("bs-BA", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {!n.readAt && (
                        <span className="ml-2 text-blue-600 font-medium">· Novo</span>
                      )}
                    </p>
                  </div>
                  {n.url && (
                    <span className="text-xs text-blue-600 shrink-0">Otvori →</span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="border-t border-slate-100 p-4">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={total}
            itemsPerPage={itemsPerPage}
          />
        </div>
      )}
    </div>
  );
}
