"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { PencilIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/components/ui/ToastProvider";

type Props = {
  clientId: string;
  agreedTerms: string | null | undefined;
  agreedTermsUpdatedAt?: string | null;
  agreedTermsUpdatedBy?: { name: string } | null;
  onSaved: () => void;
};

export function ClientAgreedTerms({
  clientId,
  agreedTerms,
  agreedTermsUpdatedAt,
  agreedTermsUpdatedBy,
  onSaved,
}: Props) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const canEdit = ["COMMERCIAL", "MANAGER", "ADMIN"].includes(role ?? "");
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(agreedTerms ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setText(agreedTerms ?? "");
  }, [agreedTerms, editing]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: clientId, agreedTerms: text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Greška pri spremanju.");
      }
      showToast("Dogovoreni uslovi su spremljeni.", "success");
      setEditing(false);
      onSaved();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Greška.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Dogovoreni uslovi</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Vidljivo svim ulogama — unosi komercijalista pri posjeti ili dogovoru.
          </p>
        </div>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={() => {
              setText(agreedTerms ?? "");
              setEditing(true);
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition"
          >
            <PencilIcon className="w-4 h-4" />
            {agreedTerms ? "Uredi" : "Dodaj uslove"}
          </button>
        )}
      </div>

      <div className="p-6">
        {agreedTermsUpdatedAt && !editing && (
          <p className="text-xs text-slate-500 mb-4">
            Zadnja izmjena:{" "}
            {new Date(agreedTermsUpdatedAt).toLocaleString("bs-BA")}
            {agreedTermsUpdatedBy?.name ? ` · ${agreedTermsUpdatedBy.name}` : ""}
          </p>
        )}

        {editing ? (
          <div className="space-y-4">
            <textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Rabat, plaćanje, posebni dogovori, kontakt osoba..."
            />
            <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Odustani
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Spremam..." : "Spremi"}
              </button>
            </div>
          </div>
        ) : agreedTerms ? (
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {agreedTerms}
          </p>
        ) : (
          <p className="text-sm text-slate-500">
            Još nisu uneseni dogovoreni uslovi za ovu apoteku.
          </p>
        )}
      </div>
    </div>
  );
}
