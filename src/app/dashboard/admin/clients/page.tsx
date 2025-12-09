"use client";

import { useEffect, useState, use } from "react";
import { createPortal } from "react-dom";
import classNames from "classnames";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useRouter } from "next/navigation";

type Client = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  note?: string | null;
};

export default function AdminClientsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false); // Dodaj state za sinkronizaciju
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    note: "",
  });

  const loadClients = async () => {
    setLoading(true);
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data);
    setLoading(false);
  };

  useEffect(() => {
    loadClients();
  }, []);

  // Dodaj funkciju za sinkronizaciju
  const syncFromErp = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync/clients", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        const clientsMsg = `Klijenti: ${data.clients.created} kreirano, ${data.clients.updated} ažurirano`;
        const branchesMsg = `Lokacije: ${data.branches.created} kreirano, ${data.branches.updated} ažurirano`;
        showToast(
          `Sinkronizacija završena! ${clientsMsg}. ${branchesMsg}`,
          "success"
        );
        await loadClients(); // Ponovo učitaj klijente
      } else {
        showToast(`Greška: ${data.error}`, "error");
      }
    } catch (error: any) {
      showToast("Greška pri sinkronizaciji", "error");
    } finally {
      setSyncing(false);
    }
  };

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const resetForm = () =>
    setForm({
      name: "",
      address: "",
      city: "",
      phone: "",
      email: "",
      note: "",
    });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (res.ok) {
      resetForm();
      setModalOpen(false);
      await loadClients();
      showToast("Klijent je uspješno kreiran!", "success");
    } else {
      const err = await res.text();
      showToast("Greška: " + err, "error");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Klijenti (apoteke)</h1>
          <p className="text-sm text-slate-500">
            Upravljaj listom apoteka i dodaj nove kontakte.
          </p>
        </div>
        <div className="flex gap-2">
          {/* Dodaj dugme za sinkronizaciju */}
          <button
            onClick={syncFromErp}
            disabled={syncing}
            className={classNames(
              "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white shadow transition",
              syncing
                ? "bg-green-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-500"
            )}
          >
            {syncing ? (
              <>
                <LoadingSpinner size="sm" />
                Sinkronizujem...
              </>
            ) : (
              <>
                🔄 Sinkronizuj iz ERP
              </>
            )}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-500 transition"
            onClick={() => setModalOpen(true)}
          >
            + Dodaj klijenta
          </button>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow border border-slate-100">
        <div className="p-4 border-b border-slate-100">
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Brza pretraga (po nazivu, gradu, emailu)..."
            onChange={(e) => {
              const term = e.target.value.toLowerCase();
              setClients((prev) =>
                prev.map((c) => ({
                  ...c,
                  hidden:
                    term.length &&
                    !`${c.name} ${c.city} ${c.email}`
                      .toLowerCase()
                      .includes(term),
                }))
              );
            }}
          />
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <LoadingSpinner size="md" />
            </div>
          ) : clients.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              Još nema dodanih klijenata.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2">Naziv</th>
                  <th className="text-left px-4 py-2">Grad</th>
                  <th className="text-left px-4 py-2">Telefon</th>
                  <th className="text-left px-4 py-2">Email</th>
                  <th className="text-left px-4 py-2">Napomena</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) =>
                  (c as any).hidden ? null : (
                    <tr
                      key={c.id}
                      className="border-t border-slate-100 hover:bg-slate-50 transition cursor-pointer"
                      onClick={() => router.push(`/dashboard/admin/clients/${c.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {c.name}
                      </td>
                      <td className="px-4 py-3">{c.city || "-"}</td>
                      <td className="px-4 py-3">{c.phone || "-"}</td>
                      <td className="px-4 py-3">{c.email || "-"}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {c.note || "-"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen &&
        createPortal(
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold">Novi klijent</h2>
                  <p className="text-xs text-slate-500">
                    Popuni osnovne informacije o apoteci.
                  </p>
                </div>
                <button
                  className="text-slate-400 hover:text-slate-600"
                  onClick={() => setModalOpen(false)}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={onSubmit} className="px-6 py-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Naziv *
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Adresa
                    </label>
                    <input
                      name="address"
                      value={form.address}
                      onChange={onChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Grad
                    </label>
                    <input
                      name="city"
                      value={form.city}
                      onChange={onChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Telefon
                    </label>
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={onChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={onChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Napomena
                  </label>
                  <textarea
                    name="note"
                    value={form.note}
                    onChange={onChange}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    onClick={() => {
                      resetForm();
                      setModalOpen(false);
                    }}
                  >
                    Odustani
                  </button>
                  <button
                    type="submit"
                    className={classNames(
                      "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-500",
                      submitting && "opacity-70 cursor-not-allowed"
                    )}
                    disabled={submitting}
                  >
                    {submitting ? "Spremam..." : "Spremi klijenta"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}