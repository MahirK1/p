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
  managerComment?: string | null;
  client: { id: string; name: string };
  branches?: Array<{ branch: { id: string; name: string } }>;
  commercial: { id: string; name: string };
};

export default function DirectorVisitsPage() {
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

  // Initialize dates as empty to avoid hydration mismatch, then set in useEffect
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
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
    date: "", // Will be set in useEffect to avoid hydration mismatch
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
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentVisit, setCommentVisit] = useState<Visit | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [detailModalVisit, setDetailModalVisit] = useState<Visit | null>(null);

  const load = async () => {
    setLoading(true);
    try {
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
        fetch("/api/clients").catch(err => {
          console.error("Error fetching clients:", err);
          return null;
        }),
        fetch(visitsUrl).catch(err => {
          console.error("Error fetching visits:", err);
          return null;
        }),
        fetch("/api/users?role=COMMERCIAL").catch(err => {
          console.error("Error fetching users:", err);
          return null;
        }),
      ]);

      // Handle clients
      if (clientsRes && clientsRes.ok) {
        try {
          const clientsData = await clientsRes.json();
          setClients(Array.isArray(clientsData) ? clientsData : []);
        } catch (error) {
          console.error("Error parsing clients JSON:", error);
          setClients([]);
        }
      } else {
        setClients([]);
      }

      // Handle visits
      if (visitsRes && visitsRes.ok) {
        try {
          const visitsResponse = await visitsRes.json();
          // Handle paginated response
          if (visitsResponse.visits) {
            setVisits(visitsResponse.visits);
            setTotalPages(visitsResponse.pagination?.totalPages || 1);
            setTotalVisits(visitsResponse.pagination?.total || 0);
          } else {
            // Fallback za stari format (ako API još nije ažuriran)
            setVisits(Array.isArray(visitsResponse) ? visitsResponse : []);
            setTotalPages(1);
            setTotalVisits(Array.isArray(visitsResponse) ? visitsResponse.length : 0);
          }
        } catch (error) {
          console.error("Error parsing visits JSON:", error);
          setVisits([]);
          setTotalPages(1);
          setTotalVisits(0);
        }
      } else {
        setVisits([]);
        setTotalPages(1);
        setTotalVisits(0);
        if (visitsRes && !visitsRes.ok) {
          const errorText = await visitsRes.text().catch(() => "Greška pri učitavanju posjeta");
          showToast("Greška: " + errorText, "error");
        }
      }

      // Handle users/commercials
      if (usersRes && usersRes.ok) {
        try {
          const usersData = await usersRes.json();
          setCommercials(Array.isArray(usersData) ? usersData : []);
        } catch (error) {
          console.error("Error parsing users JSON:", error);
          setCommercials([]);
        }
      } else {
        setCommercials([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      showToast("Greška pri učitavanju podataka.", "error");
      setClients([]);
      setVisits([]);
      setCommercials([]);
      setTotalPages(1);
      setTotalVisits(0);
    } finally {
      setLoading(false);
    }
  };

  // Initialize dates on client side only to avoid hydration mismatch
  useEffect(() => {
    if (!from) {
      const today = new Date();
      setFrom(today.toISOString().slice(0, 10));
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);
      setTo(futureDate.toISOString().slice(0, 10));
    }
    
    if (!form.date) {
      setForm((f) => ({
        ...f,
        date: new Date().toISOString().slice(0, 10),
      }));
    }
  }, [from, form.date]);

  useEffect(() => {
    setCurrentPage(1); // Reset na prvu stranicu kada se promijene filteri
  }, [from, to, filterCommercial, filterClient, filterStatus]);

  useEffect(() => {
    // Only load if dates are initialized
    if (from && to) {
      load();
    }
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

  const openCommentModal = (v: Visit) => {
    setCommentVisit(v);
    setCommentText(v.managerComment ?? "");
    setCommentModalOpen(true);
  };

  const saveComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentVisit) return;
    setCommentSubmitting(true);
    try {
      const res = await fetch("/api/visits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: commentVisit.id, managerComment: commentText.trim() || null }),
      });
      if (res.ok) {
        await load();
        setCommentModalOpen(false);
        setCommentVisit(null);
        setCommentText("");
        showToast("Komentar je spremljen. Komercijalista će dobiti obavijest.", "success");
      } else {
        const err = await res.text();
        showToast("Greška: " + err, "error");
      }
    } finally {
      setCommentSubmitting(false);
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
                    <th className="px-4 py-3 text-left">Komentar komercijalisti</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVisits.map((v) => (
                    <tr
                      key={v.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetailModalVisit(v)}
                      onKeyDown={(e) => e.key === "Enter" && setDetailModalVisit(v)}
                      className="border-t border-slate-100 hover:bg-slate-50 transition cursor-pointer"
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
                      <td className="px-4 py-3 text-slate-600 max-w-[160px]">
                        {v.managerComment ? (
                          <span className="line-clamp-2 text-xs">{v.managerComment}</span>
                        ) : (
                          "-"
                        )}
                        <button
                          type="button"
                          className="block mt-1 text-xs text-blue-600 hover:underline"
                          onClick={(e) => { e.stopPropagation(); openCommentModal(v); }}
                        >
                          {v.managerComment ? "Uredi komentar" : "Dodaj komentar"}
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
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailModalVisit(v)}
                  onKeyDown={(e) => e.key === "Enter" && setDetailModalVisit(v)}
                  className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 cursor-pointer hover:border-slate-300 transition"
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
                    {v.managerComment && (
                      <div>
                        <span className="text-slate-500">Komentar: </span>
                        <span className="line-clamp-2">{v.managerComment}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => openCommentModal(v)}
                    >
                      {v.managerComment ? "Uredi komentar" : "Dodaj komentar"}
                    </button>
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

      {/* Modal s detaljima posjete (informacije koje je unio komercijalista) */}
      {detailModalVisit &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div
              className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 flex-shrink-0">
                <h2 className="text-lg font-semibold text-slate-900">Detalji posjete</h2>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-600 p-1"
                  onClick={() => setDetailModalVisit(null)}
                  aria-label="Zatvori"
                >
                  ✕
                </button>
              </div>
              <div className="px-6 py-4 overflow-y-auto space-y-4 text-sm">
                <div>
                  <span className="text-slate-500 block text-xs font-medium mb-0.5">Datum i vrijeme</span>
                  <p className="text-slate-800">
                    {new Date(detailModalVisit.scheduledAt).toLocaleDateString("bs-BA", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    u {new Date(detailModalVisit.scheduledAt).toLocaleTimeString("bs-BA", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs font-medium mb-0.5">Klijent</span>
                  <p className="text-slate-800 font-medium">{detailModalVisit.client.name}</p>
                  {detailModalVisit.branches && detailModalVisit.branches.length > 0 && (
                    <p className="text-slate-600 mt-1">
                      Podružnice: {detailModalVisit.branches.map((vb) => vb.branch.name).join(", ")}
                    </p>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block text-xs font-medium mb-0.5">Komercijalista</span>
                  <p className="text-slate-800">{detailModalVisit.commercial.name}</p>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs font-medium mb-0.5">Status</span>
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColor(detailModalVisit.status)}`}>
                    {statusLabel(detailModalVisit.status)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs font-medium mb-0.5">Napomena (unio komercijalista)</span>
                  <p className="text-slate-800 whitespace-pre-wrap">{detailModalVisit.note || "—"}</p>
                </div>
                {detailModalVisit.managerComment && (
                  <div>
                    <span className="text-slate-500 block text-xs font-medium mb-0.5">Komentar komercijalisti</span>
                    <p className="text-slate-800 whitespace-pre-wrap">{detailModalVisit.managerComment}</p>
                  </div>
                )}
              </div>
              <div className="border-t border-slate-100 px-6 py-4 flex-shrink-0 flex gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  onClick={() => setDetailModalVisit(null)}
                >
                  Zatvori
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                  onClick={() => {
                    setDetailModalVisit(null);
                    openCommentModal(detailModalVisit);
                  }}
                >
                  {detailModalVisit.managerComment ? "Uredi komentar" : "Dodaj komentar"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal za komentar komercijalisti */}
      {commentModalOpen && commentVisit &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold">Komentar komercijalisti</h2>
                  <p className="text-xs text-slate-500">
                    {commentVisit.client.name} - {commentVisit.commercial.name} -{" "}
                    {new Date(commentVisit.scheduledAt).toLocaleString("bs-BA", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                      hour: "2-digit", minute: "2-digit", hour12: false,
                    })}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Komercijalista će dobiti push obavijest kada spremite komentar.
                  </p>
                </div>
                <button
                  className="text-slate-400 hover:text-slate-600"
                  onClick={() => { setCommentModalOpen(false); setCommentVisit(null); setCommentText(""); }}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={saveComment} className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Komentar</label>
                  <textarea
                    rows={4}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Ostavite komentar komercijalisti o ovoj posjeti..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    onClick={() => { setCommentModalOpen(false); setCommentVisit(null); setCommentText(""); }}
                  >
                    Odustani
                  </button>
                  <button
                    type="submit"
                    disabled={commentSubmitting}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                  >
                    {commentSubmitting ? "Spremam..." : "Spremi komentar"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

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