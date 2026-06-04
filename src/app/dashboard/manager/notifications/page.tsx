"use client";

import Link from "next/link";
import { SendNotificationForm } from "@/components/notifications/SendNotificationForm";
import { NotificationsList } from "@/components/notifications/NotificationsList";

export default function ManagerNotificationsPage() {
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
          <h1 className="text-2xl font-semibold text-slate-900">Obavijesti timu</h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Pošalji poruku komercijalistima. Stiže im u zvonce na portalu i kao push
            obavijest na uređaj (ako su uključili).
          </p>
        </div>
      </header>

      <section className="space-y-5" aria-labelledby="send-notification-heading">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm text-slate-600 leading-relaxed">
          <p>
            <span className="font-semibold text-slate-800">Kada koristiti:</span>{" "}
            planovi posjeta, promjene cijena, HL izvještaji, podsjetnici ili važne
            informacije za cijeli tim.
          </p>
          <p className="mt-2 text-slate-500">
            Komentari direktora ili managera na pojedinačnim posjetama i dalje stižu
            automatski — ne treba ih ručno slati odavde.
          </p>
        </div>

        <SendNotificationForm mode="manager" />
      </section>

      <section
        className="space-y-4 pt-4 border-t border-slate-200"
        aria-labelledby="received-heading"
      >
        <div>
          <h2
            id="received-heading"
            className="text-lg font-semibold text-slate-900"
          >
            Tvoje primljene obavijesti
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Obavijesti koje si ti primio/la od drugih korisnika na portalu.
          </p>
        </div>
        <NotificationsList itemsPerPage={10} />
      </section>
    </div>
  );
}
