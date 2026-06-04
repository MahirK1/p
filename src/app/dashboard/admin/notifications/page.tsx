"use client";

import Link from "next/link";
import { SendNotificationForm } from "@/components/notifications/SendNotificationForm";
import { NotificationsList } from "@/components/notifications/NotificationsList";

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <header className="space-y-3">
        <Link
          href="/dashboard/notifications"
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition"
        >
          ← Moje obavijesti
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pošalji obavijest</h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Šalji obavijesti bilo kojoj grupi korisnika na portalu.
          </p>
        </div>
      </header>

      <section className="space-y-5">
        <SendNotificationForm mode="admin" />
      </section>

      <section className="space-y-4 pt-4 border-t border-slate-200">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Tvoje primljene obavijesti
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Obavijesti koje si ti primio/la od drugih korisnika.
          </p>
        </div>
        <NotificationsList itemsPerPage={10} />
      </section>
    </div>
  );
}
