"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Pagination } from "@/components/ui/Pagination";

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
  
  // Paginacija
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVisits, setTotalVisits] = useState(0);
  const itemsPerPage = 50;

  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [filterCommercial, setFilterCommercial] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  
  // Searchable dropdown za filter klijenta
  const [filterClientSearch, setFilterClientSearch] = useState("");
  const [filterClientDropdownOpen, setFilterClientDropdownOpen] = useState(false);
  const filterClientDropdownRef = useRef<HTMLDivElement>(null);

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
  const [cancellationModalOpen, setCancellationModalOpen] = useState(false);
  const [selectedVisitForCancel, setSelectedVisitForCancel] = useState<Visit | null>(null);
  const [cancellationSubmitting, setCancellationSubmitting] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");

  const load = async () => {
    setLoading(true);
    let visitsUrl = `/api/visits?from=${from}&to=${to}&page=${currentPage}&limit=${itemsPerPage}`;
    if (filterCommercial) {
      visitsUrl += `&commercialId=${filterCommercial}`;
    }
    if (filterClient) {
      visitsUrl += `&clientId=${filterClient}`;
    }
    if (filterStatus) {
      visitsUrl += `&status=${filterStatus}`;
    }
    
    const [clientsRes, visitsRes, usersRes] = await Promise.all([
      fetch("/api/clients"),
      fetch(visitsUrl),
      fetch("/api/users?role=COMMERCIAL"),
    ]);
    const [clientsData, visitsResponse, usersData] = await Promise.all([
      clientsRes.json(),
      visitsRes.json(),
      usersRes.json(),
    ]);
    setClients(clientsData);
    
    // Handle paginated response
    if (visitsResponse.visits) {
      setVisits(visitsResponse.visits);
      setTotalPages(visitsResponse.pagination.totalPages);
      setTotalVisits(visitsResponse.pagination.total);
    } else {
      // Fallback za stari format (ako API još nije ažuriran)
      setVisits(visitsResponse);
      setTotalPages(1);
      setTotalVisits(visitsResponse.length);
    }
    
    setCommercials(usersData);
    setLoading(false);
  };

  useEffect(() => {
    setCurrentPage(1); // Reset na prvu stranicu kada se promijene filteri
  }, [from, to, filterCommercial, filterClient, filterStatus]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, filterCommercial, filterClient, filterStatus, currentPage]);

  // Zatvori dropdown kada klikneš van njega
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setClientDropdownOpen(false);
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setBranchDropdownOpen(false);
      }
      if (filterClientDropdownRef.current && !filterClientDropdownRef.current.contains(event.target as Node)) {
        setFilterClientDropdownOpen(false);
      }
    }

    if (clientDropdownOpen || branchDropdownOpen || filterClientDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [clientDropdownOpen, branchDropdownOpen, filterClientDropdownOpen]);
  
  // Filtrirani klijenti za filter dropdown
  const filteredClientsForFilter = useMemo(() => {
    if (!filterClientSearch.trim()) return clients;
    const term = filterClientSearch.toLowerCase();
    return clients.filter((c) =>
      c.name.toLowerCase().includes(term)
    );
  }, [clients, filterClientSearch]);
  
  const handleFilterClientSelect = (clientId: string) => {
    setFilterClient(clientId);
    const client = clients.find((c) => c.id === clientId);
    setFilterClientSearch(client?.name || "");
    setFilterClientDropdownOpen(false);
  };

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

  // Filteri se sada primjenjuju na serveru, ali zadržavamo ovu logiku za slučaj da API ne podržava sve filtere
  const filteredVisits = visits;

  const statusLabel = (s: Visit["status"]) =>
    s === "PLANNED" ? "Planirano" : s === "DONE" ? "Završeno" : "Otkazano";

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

  const handleCancelClick = (visit: Visit) => {
    // Ne dozvoli otkazivanje završene posjete
    if (visit.status === "DONE") {
      showToast("Završena posjeta ne može biti otkazana.", "warning");
      return;
    }
    setSelectedVisitForCancel(visit);
    setCancellationReason("");
    setCancellationModalOpen(true);
  };

  const onCancelVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisitForCancel) return;

    if (!cancellationReason.trim()) {
      showToast("Razlog otkazivanja je obavezan.", "warning");
      return;
    }

    setCancellationSubmitting(true);

    // Dodaj razlog otkazivanja u napomenu
    const cancellationNote = `--- RAZLOG OTKAZIVANJA ---\n${cancellationReason.trim()}`;
    let finalNote = cancellationNote;
    if (selectedVisitForCancel.note && selectedVisitForCancel.note.trim()) {
      finalNote = `${selectedVisitForCancel.note.trim()}\n\n${cancellationNote}`;
    }

    const res = await fetch("/api/visits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedVisitForCancel.id,
        status: "CANCELED",
        note: finalNote,
      }),
    });

    setCancellationSubmitting(false);

    if (res.ok) {
      setCancellationModalOpen(false);
      setSelectedVisitForCancel(null);
      setCancellationReason("");
      await load();
      showToast("Posjeta je uspješno otkazana.", "success");
    } else {
      const err = await res.text();
      showToast("Greška: " + err, "error");
    }
  };

  const updateStatus = async (id: string, status: Visit["status"]) => {
    // Ne dozvoli direktno otkazivanje bez razloga - koristi handleCancelClick umjesto toga
    if (status === "CANCELED") {
      return;
    }
    
    // Provjeri trenutni status posjete
    const visit = visits.find((v) => v.id === id);
    if (visit) {
      // Ne dozvoli prelazak iz CANCELED u DONE
      if (visit.status === "CANCELED" && status === "DONE") {
        showToast("Otkazana posjeta ne može biti označena kao završena.", "warning");
        return;
      }
      // Provjera za DONE -> CANCELED nije potrebna jer smo već provjerili da status ne može biti CANCELED
    }
    
    const res = await fetch("/api/visits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      await load();
    } else {
      const err = await res.text();
      showToast("Greška: " + err, "error");
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
          <div className="relative" ref={filterClientDropdownRef}>
            <input
              type="text"
              value={filterClientSearch}
              onChange={(e) => {
                setFilterClientSearch(e.target.value);
                setFilterClientDropdownOpen(true);
                if (!e.target.value.trim()) {
                  setFilterClient("");
                }
              }}
              onFocus={() => setFilterClientDropdownOpen(true)}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Pretraži klijenta..."
            />
            {filterClient && (
              <button
                type="button"
                onClick={() => {
                  setFilterClient("");
                  setFilterClientSearch("");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
              >
                ✕
              </button>
            )}
            {filterClientDropdownOpen && filteredClientsForFilter.length > 0 && (
              <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                {filteredClientsForFilter.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleFilterClientSelect(client.id)}
                    className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition text-sm ${
                      filterClient === client.id ? "bg-blue-50" : ""
                    }`}
                  >
                    {client.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">
            Status
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5"
          >
            <option value="">Svi statusi</option>
            <option value="PLANNED">Planirano</option>
            <option value="DONE">Završeno</option>
            <option value="CANCELED">Otkazano</option>
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
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">
              Posjete u odabranom periodu
            </p>
            {totalVisits > 0 && (
              <p className="text-xs text-slate-500">
                Ukupno: {totalVisits} posjeta
              </p>
            )}
          </div>
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
                        {v.status !== "CANCELED" && v.status !== "DONE" && (
                          <button
                            className="text-xs text-emerald-600 hover:underline"
                            onClick={() => updateStatus(v.id, "DONE")}
                          >
                            Označi završeno
                          </button>
                        )}
                        {v.status !== "CANCELED" && v.status !== "DONE" && (
                          <button
                            className="text-xs text-red-600 hover:underline"
                            onClick={() => handleCancelClick(v)}
                          >
                            Otkaži
                          </button>
                        )}
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
                    {v.status !== "CANCELED" && v.status !== "DONE" && (
                      <button
                        className="text-xs text-emerald-600 hover:underline"
                        onClick={() => updateStatus(v.id, "DONE")}
                      >
                        Označi završeno
                      </button>
                    )}
                    {v.status !== "CANCELED" && v.status !== "DONE" && (
                      <button
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => handleCancelClick(v)}
                      >
                        Otkaži
                      </button>
                    )}
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
        
        {/* Paginacija */}
        {!loading && filteredVisits.length > 0 && totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalVisits}
            itemsPerPage={itemsPerPage}
          />
        )}
      </div>

      {/* Modal za otkazivanje posjete */}
      {cancellationModalOpen && selectedVisitForCancel &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold">Otkaži posjetu</h2>
                  <p className="text-xs text-slate-500">
                    {selectedVisitForCancel.client.name} -{" "}
                    {new Date(selectedVisitForCancel.scheduledAt).toLocaleString("bs-BA", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </p>
                  <p className="text-xs text-red-600 mt-1 font-medium">
                    Razlog otkazivanja je obavezan
                  </p>
                </div>
                <button
                  className="text-slate-400 hover:text-slate-600"
                  onClick={() => {
                    setCancellationModalOpen(false);
                    setSelectedVisitForCancel(null);
                    setCancellationReason("");
                  }}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={onCancelVisit} className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Razlog otkazivanja *
                  </label>
                  <textarea
                    rows={4}
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                    placeholder="Unesite razlog otkazivanja posjete..."
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Molimo unesite detaljan razlog zašto otkazujete ovu posjetu.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    onClick={() => {
                      setCancellationModalOpen(false);
                      setSelectedVisitForCancel(null);
                      setCancellationReason("");
                    }}
                  >
                    Odustani
                  </button>
                  <button
                    type="submit"
                    disabled={cancellationSubmitting || !cancellationReason.trim()}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {cancellationSubmitting ? "Otkazujem..." : "Otkaži posjetu"}
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