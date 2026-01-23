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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
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

  const deleteClient = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `Da li ste sigurni da želite obrisati klijenta "${name}" i sve njegove podružnice?\n` +
        `Ovu akciju nije moguće poništiti.`
    );
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/clients?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        showToast("Klijent je uspješno obrisan.", "success");
        await loadClients();
        setSelectedIds(new Set());
      } else {
        showToast(
          data?.error ||
            "Greška pri brisanju klijenta. Provjeri da li nema aktivnih narudžbi/posjeta.",
          "error"
        );
      }
    } catch (error: any) {
      showToast("Greška pri brisanju klijenta.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const deleteBulkClients = async () => {
    if (selectedIds.size === 0) return;

    const selectedClients = clients.filter((c) => selectedIds.has(c.id));
    const names = selectedClients.map((c) => c.name).join(", ");
    const confirmed = window.confirm(
      `Da li ste sigurni da želite obrisati ${selectedIds.size} klijent(a)?\n\n` +
        `Klijenti: ${names}\n\n` +
        `Ovu akciju nije moguće poništiti.`
    );
    if (!confirmed) return;

    setBulkDeleting(true);
    try {
      const idsArray = Array.from(selectedIds);
      const res = await fetch("/api/clients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsArray }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        const successCount = data.deleted || selectedIds.size;
        showToast(
          `Uspješno obrisano ${successCount} klijent(a).`,
          "success"
        );
        await loadClients();
        setSelectedIds(new Set());
      } else {
        showToast(
          data?.error ||
            "Greška pri brisanju klijenata. Provjeri da li neki od klijenata imaju aktivne narudžbe/posjete.",
          "error"
        );
      }
    } catch (error: any) {
      showToast("Greška pri brisanju klijenata.", "error");
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSelectClient = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visibleClients = clients.filter((c) => !(c as any).hidden);
    const allCurrentlySelected = visibleClients.length > 0 && visibleClients.every((c) => selectedIds.has(c.id));
    
    if (allCurrentlySelected) {
      // Deselektuj sve
      setSelectedIds(new Set());
    } else {
      // Selektuj sve vidljive
      setSelectedIds(new Set(visibleClients.map((c) => c.id)));
    }
  };

  const visibleClients = clients.filter((c) => !(c as any).hidden);
  const allSelected = visibleClients.length > 0 && visibleClients.every((c) => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0;

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
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <input
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
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
          {someSelected && (
            <button
              type="button"
              onClick={deleteBulkClients}
              disabled={bulkDeleting}
              className={classNames(
                "inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium",
                "border-red-200 text-red-600 hover:bg-red-50",
                bulkDeleting && "opacity-60 cursor-not-allowed"
              )}
            >
              {bulkDeleting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Brišem...
                </>
              ) : (
                <>
                  🗑️ Obriši selektovane ({selectedIds.size})
                </>
              )}
            </button>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <LoadingSpinner size="md" />
          </div>
        ) : clients.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            Još nema dodanih klijenata.
          </div>
        ) : (
          <>
            {/* Desktop table view */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-2 w-12">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="text-left px-4 py-2">Naziv</th>
                    <th className="text-left px-4 py-2">Grad</th>
                    <th className="text-left px-4 py-2">Telefon</th>
                    <th className="text-left px-4 py-2">Email</th>
                    <th className="text-left px-4 py-2">Napomena</th>
                    <th className="px-4 py-2 text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) =>
                    (c as any).hidden ? null : (
                      <tr
                        key={c.id}
                        className={classNames(
                          "border-t border-slate-100 hover:bg-slate-50 transition",
                          selectedIds.has(c.id) && "bg-blue-50"
                        )}
                      >
                        <td
                          className="px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(c.id)}
                            onChange={() => toggleSelectClient(c.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td
                          className="px-4 py-3 font-medium text-slate-800 cursor-pointer"
                          onClick={() =>
                            router.push(`/dashboard/admin/clients/${c.id}`)
                          }
                        >
                          {c.name}
                        </td>
                        <td
                          className="px-4 py-3 cursor-pointer"
                          onClick={() =>
                            router.push(`/dashboard/admin/clients/${c.id}`)
                          }
                        >
                          {c.city || "-"}
                        </td>
                        <td
                          className="px-4 py-3 cursor-pointer"
                          onClick={() =>
                            router.push(`/dashboard/admin/clients/${c.id}`)
                          }
                        >
                          {c.phone || "-"}
                        </td>
                        <td
                          className="px-4 py-3 cursor-pointer"
                          onClick={() =>
                            router.push(`/dashboard/admin/clients/${c.id}`)
                          }
                        >
                          {c.email || "-"}
                        </td>
                        <td
                          className="px-4 py-3 text-slate-500 cursor-pointer"
                          onClick={() =>
                            router.push(`/dashboard/admin/clients/${c.id}`)
                          }
                        >
                          {c.note || "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteClient(c.id, c.name);
                            }}
                            className={classNames(
                              "inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs font-medium",
                              "border-red-200 text-red-600 hover:bg-red-50",
                              deletingId === c.id && "opacity-60 cursor-not-allowed"
                            )}
                            disabled={deletingId === c.id}
                          >
                            {deletingId === c.id ? "Brišem..." : "Obriši"}
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden space-y-3 p-4">
              {clients.map((c) =>
                (c as any).hidden ? null : (
                  <div
                    key={c.id}
                    className={classNames(
                      "bg-white border border-slate-200 rounded-lg p-4 space-y-3",
                      selectedIds.has(c.id) && "bg-blue-50 border-blue-200"
                    )}
                    onClick={() => router.push(`/dashboard/admin/clients/${c.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleSelectClient(c.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 flex-shrink-0 mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-slate-800 truncate">{c.name}</h3>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteClient(c.id, c.name);
                        }}
                        className={classNames(
                          "inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs font-medium flex-shrink-0",
                          "border-red-200 text-red-600 hover:bg-red-50",
                          deletingId === c.id && "opacity-60 cursor-not-allowed"
                        )}
                        disabled={deletingId === c.id}
                      >
                        {deletingId === c.id ? "Brišem..." : "Obriši"}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      {c.city && (
                        <div>
                          <span className="text-slate-500">Grad: </span>
                          <span className="text-slate-800">{c.city}</span>
                        </div>
                      )}
                      {c.phone && (
                        <div>
                          <span className="text-slate-500">Telefon: </span>
                          <span className="text-slate-800">{c.phone}</span>
                        </div>
                      )}
                      {c.email && (
                        <div>
                          <span className="text-slate-500">Email: </span>
                          <span className="text-slate-800 break-all">{c.email}</span>
                        </div>
                      )}
                      {c.note && (
                        <div>
                          <span className="text-slate-500">Napomena: </span>
                          <span className="text-slate-800">{c.note}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        )}
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