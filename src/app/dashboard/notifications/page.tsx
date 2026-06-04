"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { NotificationsList } from "@/components/notifications/NotificationsList";

export default function NotificationsPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;

  const sendHref =
    role === "ADMIN"
      ? "/dashboard/admin/notifications"
      : role === "MANAGER"
        ? "/dashboard/manager/notifications"
        : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Obavijesti</h1>
          <p className="text-sm text-slate-500 mt-1">
            Historija svih obavijesti koje si primio/la na portalu.
          </p>
        </div>
        {sendHref && (
          <Link
            href={sendHref}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition"
          >
            {role === "ADMIN" ? "Pošalji obavijest" : "Obavijesti timu"}
          </Link>
        )}
      </header>

      <NotificationsList />
    </div>
  );
}
