"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type ClientBranch = {
  id: string;
  name: string;
};

type Client = { 
  id: string; 
  name: string;
  branches?: ClientBranch[];
};

type User = { id: string; name: string };
type Visit = {
  id: string;
  scheduledAt: string;
  status: "PLANNED" | "DONE" | "CANCELED";
  note?: string | null;
  client: { id: string; name: string };
  branches?: Array<{ branch: { id: string; name: string } }>;
  commercial: { id: string; name: string };
};

export default function ManagerVisitsPage() {
  const { showToast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [commercials, setCommercials] = useState<User[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [filterCommercial, setFilterCommercial] = useState("");
  const [filterClient, setFilterClient] = useState("");

  // Dodaj state za searchable dropdown
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  
  // State za branch dropdown
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    clientId: "",
    branchIds: [] as string[], // array branchId-jeva
    commercialId: "",
    date: new Date().toISOString().slice(0, 10),
    time: "10:00",
    hour: "10",
    minute: "00",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [clientsRes, visitsRes, usersRes] = await Promise.all([
      fetch("/api/clients"),
      fetch(`/api/visits?from=${from}&to=${to}`),
      fetch("/api/users?role=COMMERCIAL"),
    ]);
    const [clientsData, visitsData, usersData] = await Promise.all([
      clientsRes.json(),
      visitsRes.json(),
      usersRes.json(),
    ]);
    setClients(clientsData);
    setVisits(visitsData);
    setCommercials(usersData);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  // Zatvori dropdown kada klikneš van njega
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setClientDropdownOpen(false);
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setBranchDropdownOpen(false);
      }
    }

    if (clientDropdownOpen || branchDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [clientDropdownOpen, branchDropdownOpen]);

  // Filtrirani klijenti za pretragu
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const term = clientSearch.toLowerCase();
    return clients.filter((c) =>
      c.name.toLowerCase().includes(term)
    );
  }, [clients, clientSearch]);

  // Odabrani klijent
  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === form.clientId);
  }, [clients, form.clientId]);

  // Dostupni branchovi za odabranog klijenta
  const availableBranches = useMemo(() => {
    if (!selectedClient || !selectedClient.branches) return [];
    return selectedClient.branches;
  }, [selectedClient]);

  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (filterCommercial && v.commercial.id !== filterCommercial) return false;
      if (filterClient && v.client.id !== filterClient) return false;
      return true;
    });
  }, [visits, filterCommercial, filterClient]);

  const statusLabel = (s: Visit["status"]) =>
    s === "PLANNED" ? "Planirano" : s === "DONE" ? "Završeno" : "Otkaženo";

  const statusColor = (s: Visit["status"]) =>
    s === "PLANNED"
      ? "bg-amber-100 text-amber-700"
      : s === "DONE"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-red-100 text-red-700";

  const handleClientSelect = (clientId: string) => {
    setForm((f) => ({ ...f, clientId, branchIds: [] })); // Reset branchove kada se promijeni klijent
    const client = clients.find((c) => c.id === clientId);
    setClientSearch(client?.name || "");
    setClientDropdownOpen(false);
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId || !form.commercialId || !form.date || !form.time) {
      showToast("Klijent, komercijalista, datum i vrijeme su obavezni.", "warning");
      return;
    }
    setSubmitting(true);
    const scheduledAt = new Date(`${form.date}T${form.time}:00`);
    const res = await fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: form.clientId,
        branchIds: form.branchIds, // array branchId-jeva, ako je prazan = glavni klijent
        commercialId: form.commercialId,
        scheduledAt: scheduledAt.toISOString(),
        note: form.note,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setForm((f) => ({ ...f, note: "", clientId: "", branchIds: [] }));
      setClientSearch(""); // Reset search
      await load();
    } else {
      const err = await res.text();
      showToast("Greška: " + err, "error");
    }
  };

  const updateStatus = async (id: string, status: Visit["status"]) => {
    const res = await fetch("/api/visits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      await load();
    } else {
      showToast("Ne mogu ažurirati status.", "error");
    }
  };

  const removeVisit = async (id: string) => {
    if (!confirm("Obrisati ovu posjetu?")) return;
    const res = await fetch(`/api/visits?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      await load();
    } else {
      showToast("Ne mogu obrisati posjetu.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Planiranje posjeta</h1>
          <p className="text-sm text-slate-500">
            Dodijeli posjete komercijalistima i prati realizaciju.
          </p>
        </div>
      </header>

      {/* Filteri po datumu/korisniku/klijentu */}
      <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm text-sm">
        <div>
          <label className="block text-xs font-medium text-slate-500">
            Od datuma
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">
            Do datuma
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">
            Komercijalista
          </label>
          <select
            value={filterCommercial}
            onChange={(e) => setFilterCommercial(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5"
          >
            <option value="">Svi</option>
            {commercials.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">
            Klijent
          </label>
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5"
          >
            <option value="">Svi</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Forma za novu posjetu */}
      <form
        onSubmit={onCreate}
        className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm text-sm md:grid-cols-4"
      >
        {/* Klijent - Searchable Dropdown */}
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-slate-500">
            Klijent *
          </label>
          <div className="relative mt-1" ref={clientDropdownRef}>
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => {
                setClientSearch(e.target.value);
                setClientDropdownOpen(true);
                setForm((f) => ({ ...f, clientId: "", branchIds: [] })); // Reset selection when typing
              }}
              onFocus={() => setClientDropdownOpen(true)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Unesi naziv klijenta ili klikni da vidiš listu..."
            />
            {clientDropdownOpen && filteredClients.length > 0 && (
              <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleClientSelect(client.id)}
                    className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition ${
                      form.clientId === client.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="font-medium text-sm text-slate-800">
                      {client.name}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Branch selection - prikaži samo ako klijent ima branchove */}
          {selectedClient && availableBranches.length > 0 && (
            <div className="mt-2">
              <label className="text-xs font-medium text-slate-500">
                Podružnice (opcionalno)
              </label>
              <div className="relative mt-1" ref={branchDropdownRef}>
                <button
                  type="button"
                  onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm focus:border-blue-500 focus:outline-none bg-white"
                >
                  {form.branchIds.length === 0 ? (
                    <span className="text-slate-500">Glavni klijent (nije odabrana podružnica)</span>
                  ) : form.branchIds.length === 1 ? (
                    <span className="text-slate-800">
                      {availableBranches.find(b => b.id === form.branchIds[0])?.name || "1 podružnica"}
                    </span>
                  ) : (
                    <span className="text-slate-800">
                      {form.branchIds.length} podružnica odabrano
                    </span>
                  )}
                  <span className="float-right text-slate-400">▼</span>
                </button>
                {branchDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                    <div className="p-2">
                      <label className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={form.branchIds.length === 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm((f) => ({ ...f, branchIds: [] }));
                            }
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">Glavni klijent</span>
                      </label>
                      {availableBranches.map((branch) => (
                        <label
                          key={branch.id}
                          className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={form.branchIds.includes(branch.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setForm((f) => ({
                                  ...f,
                                  branchIds: [...f.branchIds, branch.id],
                                }));
                              } else {
                                setForm((f) => ({
                                  ...f,
                                  branchIds: f.branchIds.filter((id) => id !== branch.id),
                                }));
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-700">{branch.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500">
            Komercijalista *
          </label>
          <select
            value={form.commercialId}
            onChange={(e) =>
              setForm((f) => ({ ...f, commercialId: e.target.value }))
            }
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          >
            <option value="">Odaberi</option>
            {commercials.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <div>
            <label className="text-xs font-medium text-slate-500">
              Datum *
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) =>
                setForm((f) => ({ ...f, date: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">
              Vrijeme
            </label>
            <div className="mt-1 flex gap-2">
              <select
                value={form.hour}
                onChange={(e) => {
                  const newHour = e.target.value;
                  setForm((f) => ({
                    ...f,
                    hour: newHour,
                    time: `${newHour.padStart(2, "0")}:${f.minute.padStart(2, "0")}`,
                  }));
                }}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i.toString().padStart(2, "0")}>
                    {i.toString().padStart(2, "0")}h
                  </option>
                ))}
              </select>
              <select
                value={form.minute}
                onChange={(e) => {
                  const newMinute = e.target.value;
                  setForm((f) => ({
                    ...f,
                    minute: newMinute,
                    time: `${f.hour.padStart(2, "0")}:${newMinute.padStart(2, "0")}`,
                  }));
                }}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2"
              >
                {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                  <option key={m} value={m.toString().padStart(2, "0")}>
                    {m.toString().padStart(2, "0")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="md:col-span-3">
          <label className="text-xs font-medium text-slate-500">
            Napomena
          </label>
          <input
            value={form.note}
            onChange={(e) =>
              setForm((f) => ({ ...f, note: e.target.value }))
            }
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="Kratka napomena o cilju posjete..."
          />
        </div>
        <div className="flex items-end justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-60"
          >
            {submitting ? "Dodajem..." : "Dodaj posjetu"}
          </button>
        </div>
      </form>

      {/* Lista posjeta */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <p className="text-sm font-medium text-slate-700">
            Posjete u odabranom periodu
          </p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <LoadingSpinner size="md" />
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            Nema planiranih posjeta.
          </div>
        ) : (
          <>
            {/* Desktop table view */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Datum / vrijeme</th>
                    <th className="px-4 py-3 text-left">Klijent</th>
                    <th className="px-4 py-3 text-left">Komercijalista</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Napomena</th>
                    <th className="px-4 py-3 text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVisits.map((v) => (
                    <tr
                      key={v.id}
                      className="border-t border-slate-100 hover:bg-slate-50 transition"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {new Date(v.scheduledAt).toLocaleDateString("bs-BA", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(v.scheduledAt).toLocaleTimeString("bs-BA", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{v.client.name}</div>
                        {v.branches && v.branches.length > 0 && (
                          <div className="text-xs text-slate-500 mt-1">
                            Podružnice: {v.branches.map((vb) => vb.branch.name).join(", ")}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">{v.commercial.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColor(
                            v.status
                          )}`}
                        >
                          {statusLabel(v.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {v.note || "-"}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          className="text-xs text-emerald-600 hover:underline"
                          onClick={() => updateStatus(v.id, "DONE")}
                        >
                          Označi završeno
                        </button>
                        <button
                          className="text-xs text-red-600 hover:underline"
                          onClick={() => updateStatus(v.id, "CANCELED")}
                        >
                          Otkaži
                        </button>
                        <button
                          className="text-xs text-slate-400 hover:text-red-500"
                          onClick={() => removeVisit(v.id)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden space-y-3 p-4">
              {filteredVisits.map((v) => (
                <div
                  key={v.id}
                  className="bg-white border border-slate-200 rounded-lg p-4 space-y-2"
                >
                    <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 mb-1">
                        {v.client.name}
                      </div>
                      {v.branches && v.branches.length > 0 && (
                        <div className="text-xs text-slate-500 mb-1">
                          Podružnice: {v.branches.map((vb) => vb.branch.name).join(", ")}
                        </div>
                      )}
                      <div className="text-sm text-slate-600">
                        {v.commercial.name}
                      </div>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium flex-shrink-0 ml-2 ${statusColor(
                        v.status
                      )}`}
                    >
                      {statusLabel(v.status)}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    <div>
                      <span className="text-slate-500">Datum: </span>
                      {new Date(v.scheduledAt).toLocaleDateString("bs-BA", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </div>
                    <div>
                      <span className="text-slate-500">Vrijeme: </span>
                      {new Date(v.scheduledAt).toLocaleTimeString("bs-BA", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </div>
                    {v.note && (
                      <div>
                        <span className="text-slate-500">Napomena: </span>
                        {v.note}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <button
                      className="text-xs text-emerald-600 hover:underline"
                      onClick={() => updateStatus(v.id, "DONE")}
                    >
                      Označi završeno
                    </button>
                    <button
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => updateStatus(v.id, "CANCELED")}
                    >
                      Otkaži
                    </button>
                    <button
                      className="text-xs text-slate-400 hover:text-red-500"
                      onClick={() => removeVisit(v.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}