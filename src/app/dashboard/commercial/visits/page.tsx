"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Pagination } from "@/components/ui/Pagination";

// Helper funkcija za sigurno formatiranje datuma (iOS Safari kompatibilnost)
const safeFormatDate = (date: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions): string => {
  if (!date) return "—";
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return "—";
    return dateObj.toLocaleDateString("bs-BA", options || {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error, date);
    return "—";
  }
};

// Helper funkcija za sigurno formatiranje vremena (iOS Safari kompatibilnost)
const safeFormatTime = (date: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions): string => {
  if (!date) return "—";
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return "—";
    return dateObj.toLocaleTimeString("bs-BA", options || {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch (error) {
    console.error("Error formatting time:", error, date);
    return "—";
  }
};

type Visit = {
  id: string;
  scheduledAt: string;
  status: "PLANNED" | "DONE" | "CANCELED";
  note?: string | null;
  managerComment?: string | null;
  managerId?: string | null;
  client: { name: string };
  branches?: Array<{ branch: { id: string; name: string } }>;
};

type ClientBranch = {
  id: string;
  name: string;
};

type Client = {
  id: string;
  name: string;
  branches?: ClientBranch[];
};

export default function CommercialVisitsPage() {
  const { showToast } = useToast();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [cancellationModalOpen, setCancellationModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [detailModalVisit, setDetailModalVisit] = useState<Visit | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completionSubmitting, setCompletionSubmitting] = useState(false);
  const [cancellationSubmitting, setCancellationSubmitting] = useState(false);
  
  // State za branch dropdown
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  
  // State za client searchable dropdown
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Filteri - sigurno kreiranje datuma (iOS Safari kompatibilnost)
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState(() => {
    try {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      if (isNaN(d.getTime())) throw new Error("Invalid date");
      return d.toISOString().slice(0, 10);
    } catch (error) {
      console.error("Error setting filterDateFrom:", error);
      // Fallback na default datum
      return "2024-01-01";
    }
  });
  const [filterDateTo, setFilterDateTo] = useState(() => {
    try {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      if (isNaN(d.getTime())) throw new Error("Invalid date");
      return d.toISOString().slice(0, 10);
    } catch (error) {
      console.error("Error setting filterDateTo:", error);
      // Fallback na default datum
      return "2024-12-31";
    }
  });

  // Paginacija
  const itemsPerPage = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVisits, setTotalVisits] = useState(0);

  const [form, setForm] = useState({
    clientId: "",
    branchIds: [] as string[],
    useNewClient: false,
    clientData: {
      name: "",
      matBroj: "",
      pdvBroj: "",
      address: "",
      city: "",
      phone: "",
      email: "",
      contactPerson: "",
      note: "",
    },
    date: (() => {
      try {
        const d = new Date();
        if (isNaN(d.getTime())) throw new Error("Invalid date");
        return d.toISOString().slice(0, 10);
      } catch (error) {
        console.error("Error setting form date:", error);
        return "2024-01-01";
      }
    })(),
    time: (() => {
      try {
        const d = new Date();
        if (isNaN(d.getTime())) throw new Error("Invalid date");
        return d.toTimeString().slice(0, 5);
      } catch (error) {
        console.error("Error setting form time:", error);
        return "09:00";
      }
    })(),
    contactPersonDuringVisit: "",
    note: "",
  });

  const [completionForm, setCompletionForm] = useState({
    date: "",
    time: "",
    contactPerson: "",
    note: "",
  });

  const [cancellationForm, setCancellationForm] = useState({
    reason: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Sigurno kreiranje datuma (iOS Safari kompatibilnost)
      let from: Date;
      let to: Date;
      try {
        from = new Date(filterDateFrom);
        to = new Date(filterDateTo);
        to.setHours(23, 59, 59, 999);
        if (isNaN(from.getTime()) || isNaN(to.getTime())) {
          throw new Error("Invalid date");
        }
      } catch (dateError) {
        console.error("Error parsing dates:", dateError);
        // Fallback na default datume
        from = new Date();
        from.setDate(from.getDate() - 7);
        to = new Date();
        to.setDate(to.getDate() + 30);
        to.setHours(23, 59, 59, 999);
      }
      
      let url = `/api/visits?from=${from.toISOString()}&to=${to.toISOString()}&page=${currentPage}&limit=${itemsPerPage}`;
      if (filterStatus) {
        url += `&status=${filterStatus}`;
      }
      
      const [visitsRes, clientsRes] = await Promise.all([
        fetch(url).catch(err => {
          console.error("Error fetching visits:", err);
          return null;
        }),
        fetch("/api/clients").catch(err => {
          console.error("Error fetching clients:", err);
          return null;
        }),
      ]);
      
      if (visitsRes && visitsRes.ok) {
        try {
          const visitsData = await visitsRes.json();
          setVisits(visitsData.visits || (Array.isArray(visitsData) ? visitsData : []));
          if (visitsData.pagination) {
            setTotalPages(visitsData.pagination.totalPages ?? 1);
            setTotalVisits(visitsData.pagination.total ?? 0);
          } else {
            const list = visitsData.visits || (Array.isArray(visitsData) ? visitsData : []);
            setTotalVisits(list.length);
            setTotalPages(1);
          }
        } catch (jsonError) {
          console.error("Error parsing visits JSON:", jsonError);
          setVisits([]);
        }
      } else {
        setVisits([]);
      }
      
      if (clientsRes && clientsRes.ok) {
        try {
          const clientsData = await clientsRes.json();
          setClients(Array.isArray(clientsData) ? clientsData : []);
        } catch (jsonError) {
          console.error("Error parsing clients JSON:", jsonError);
          setClients([]);
        }
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error("Error loading visits:", error);
      setVisits([]);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterDateFrom, filterDateTo, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterDateFrom, filterDateTo]);

  useEffect(() => {
    load();
  }, [load]);

  // Zatvori dropdown kada klikneš van njega
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setBranchDropdownOpen(false);
      }
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setClientDropdownOpen(false);
      }
    }

    if (branchDropdownOpen || clientDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [branchDropdownOpen, clientDropdownOpen]);

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

  const handleClientSelect = (clientId: string) => {
    setForm((f) => ({ ...f, clientId, branchIds: [] })); // Reset branchove kada se promijeni klijent
    const client = clients.find((c) => c.id === clientId);
    setClientSearch(client?.name || "");
    setClientDropdownOpen(false);
  };

  // Dostupni branchovi za odabranog klijenta
  const availableBranches = useMemo(() => {
    if (!selectedClient || !selectedClient.branches) return [];
    return selectedClient.branches;
  }, [selectedClient]);

  const handleCompleteClick = useCallback((visit: Visit) => {
    // Ne dozvoli završavanje otkazane posjete
    if (visit.status === "CANCELED") {
      showToast("Otkazana posjeta ne može biti označena kao završena.", "warning");
      return;
    }
    // Prikaži modal za sve posjete kada se označavaju kao završene
    // Komercijalista može promijeniti datum/vrijeme, dodati kontakt osobu i napomenu
    setSelectedVisit(visit);
    try {
      const scheduledDate = new Date(visit.scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        throw new Error("Invalid date");
      }
      setCompletionForm({
        date: scheduledDate.toISOString().slice(0, 10),
        time: scheduledDate.toTimeString().slice(0, 5),
        contactPerson: "",
        note: "",
      });
    } catch (error) {
      console.error("Error parsing scheduled date:", error);
      // Fallback na trenutni datum
      const now = new Date();
      setCompletionForm({
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 5),
        contactPerson: "",
        note: "",
      });
    }
    setCompletionModalOpen(true);
  }, [showToast]);

  const handleCancelClick = (visit: Visit) => {
    // Ne dozvoli otkazivanje završene posjete
    if (visit.status === "DONE") {
      showToast("Završena posjeta ne može biti otkazana.", "warning");
      return;
    }
    setSelectedVisit(visit);
    setCancellationForm({ reason: "" });
    setCancellationModalOpen(true);
  };

  const onCancelVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit) return;

    if (!cancellationForm.reason.trim()) {
      showToast("Razlog otkazivanja je obavezan.", "warning");
      return;
    }

    setCancellationSubmitting(true);

    // Dodaj razlog otkazivanja u napomenu
    const cancellationNote = `--- RAZLOG OTKAZIVANJA ---\n${cancellationForm.reason.trim()}`;
    let finalNote = cancellationNote;
    if (selectedVisit.note && selectedVisit.note.trim()) {
      finalNote = `${selectedVisit.note.trim()}\n\n${cancellationNote}`;
    }

    const res = await fetch("/api/visits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedVisit.id,
        status: "CANCELED",
        note: finalNote,
      }),
    });

    setCancellationSubmitting(false);

    if (res.ok) {
      setCancellationModalOpen(false);
      setSelectedVisit(null);
      setCancellationForm({ reason: "" });
      await load();
      showToast("Posjeta je uspješno otkazana.", "success");
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
    if (res.ok) await load();
  };

  const onCompleteVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit) return;

    setCompletionSubmitting(true);

    // Provjeri da li je datum/vrijeme promijenjen
    const newScheduledAt = new Date(`${completionForm.date}T${completionForm.time}:00`);
    const originalScheduledAt = new Date(selectedVisit.scheduledAt);
    const scheduledAtChanged = newScheduledAt.getTime() !== originalScheduledAt.getTime();

    // Kombinuj kontakt osobu sa napomenom
    let completionInfo = "";
    if (completionForm.contactPerson.trim()) {
      completionInfo = `Kontakt osoba: ${completionForm.contactPerson.trim()}`;
    }
    if (completionForm.note.trim()) {
      completionInfo = completionInfo
        ? `${completionInfo}\n\n${completionForm.note.trim()}`
        : completionForm.note.trim();
    }

    // Ako već postoji napomena na posjeti, dodaj novu informaciju
    let finalNote = "";
    if (selectedVisit.note && selectedVisit.note.trim()) {
      if (completionInfo) {
        finalNote = `${selectedVisit.note.trim()}\n\n--- Dodato pri završetku posjete ---\n${completionInfo}`;
      } else {
        finalNote = selectedVisit.note.trim();
      }
    } else if (completionInfo) {
      finalNote = completionInfo;
    }

    const res = await fetch("/api/visits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedVisit.id,
        status: "DONE",
        scheduledAt: scheduledAtChanged ? newScheduledAt.toISOString() : undefined,
        note: finalNote || undefined,
      }),
    });

    setCompletionSubmitting(false);

    if (res.ok) {
      setCompletionModalOpen(false);
      setSelectedVisit(null);
      setCompletionForm({ date: "", time: "", contactPerson: "", note: "" });
      await load();
      showToast("Posjeta je uspješno označena kao završena.", "success");
    } else {
      const err = await res.text();
      showToast("Greška: " + err, "error");
    }
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.useNewClient && !form.clientId) {
      showToast("Odaberi postojećeg klijenta ili kreiraj novog.", "warning");
      return;
    }

    if (form.useNewClient) {
      if (!form.clientData.name.trim()) {
        showToast("Ime apoteke je obavezno.", "warning");
        return;
      }
      if (!form.clientData.matBroj.trim()) {
        showToast("ID broj kupca (MAT_BROJ) je obavezan.", "warning");
        return;
      }
    }

    setSubmitting(true);
    const scheduledAt = new Date(`${form.date}T${form.time}:00`);

    let finalNote = form.note.trim();
    if (form.contactPersonDuringVisit.trim()) {
      const contactPart = `Kontakt osoba: ${form.contactPersonDuringVisit.trim()}`;
      finalNote = finalNote
        ? `${contactPart}\n\n${finalNote}`
        : contactPart;
    }

    const res = await fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: form.useNewClient ? undefined : form.clientId,
        clientData: form.useNewClient ? form.clientData : undefined,
        branchIds: form.useNewClient ? [] : form.branchIds, // array branchId-jeva, ako je prazan = glavni klijent
        scheduledAt: scheduledAt.toISOString(),
        note: finalNote || undefined,
      }),
    });

    setSubmitting(false);

    if (res.ok) {
      setModalOpen(false);
      setForm({
        clientId: "",
        branchIds: [],
        useNewClient: false,
        clientData: {
          name: "",
          matBroj: "",
          pdvBroj: "",
          address: "",
          city: "",
          phone: "",
          email: "",
          contactPerson: "",
          note: "",
        },
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toTimeString().slice(0, 5),
        contactPersonDuringVisit: "",
        note: "",
      });
      setClientSearch(""); // Reset search
      await load();
    } else {
      const err = await res.text();
      showToast("Greška: " + err, "error");
    }
  };

  const statusLabel = (s: Visit["status"]) =>
    s === "PLANNED" ? "Planirano" : s === "DONE" ? "Završeno" : "Otkazano";

  const statusColor = (s: Visit["status"]) => {
    switch (s) {
      case "PLANNED":
        return "bg-amber-100 text-amber-700";
      case "DONE":
        return "bg-emerald-100 text-emerald-700";
      case "CANCELED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold truncate">Moje posjete</h1>
          <p className="text-sm text-slate-500">
            Pregled planiranih i završenih posjeta.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="w-full sm:w-auto rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition shadow-sm"
        >
          + Dodaj posjetu
        </button>
      </header>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-slate-700">
              Posjete
            </p>
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
              />
              <span className="text-sm text-slate-500">do</span>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Svi statusi</option>
                <option value="PLANNED">Planirano</option>
                <option value="DONE">Završeno</option>
                <option value="CANCELED">Otkazano</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <LoadingSpinner size="md" />
            </div>
          ) : visits.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              Trenutno nema posjeta u ovom periodu.
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 p-4">
                {visits.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-lg border border-slate-200 bg-white p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {v.client.name}
                        </h3>
                        {v.branches && v.branches.length > 0 && (
                          <p className="text-xs text-blue-600 font-medium mt-0.5">
                            📍 {v.branches.length === 1 
                              ? `Podružnica: ${v.branches[0].branch.name}`
                              : `${v.branches.length} podružnice: ${v.branches.map(vb => vb.branch.name).join(", ")}`
                            }
                          </p>
                        )}
                        {v.managerId && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            Dodijeljena od managera
                          </p>
                        )}
                      </div>
                      <span
                        className={`ml-2 flex-shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(
                          v.status
                        )}`}
                      >
                        {statusLabel(v.status)}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Datum:</span>
                        <span className="font-medium">
                          {safeFormatDate(v.scheduledAt, {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Vrijeme:</span>
                        <span className="font-medium">
                          {safeFormatTime(v.scheduledAt, {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </span>
                      </div>
                      {v.branches && v.branches.length > 0 && (
                        <div className="p-2 bg-blue-50 rounded border border-blue-200">
                          <span className="text-xs font-medium text-blue-800 block mb-1">
                            📍 Podružnice:
                          </span>
                          <ul className="text-xs text-blue-700 space-y-0.5">
                            {v.branches.map((vb) => (
                              <li key={vb.branch.id} className="flex items-center gap-1.5">
                                <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                                {vb.branch.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {v.note && (
                        <div>
                          <span className="text-slate-500">Napomena: </span>
                          <span className="text-slate-600">{v.note}</span>
                        </div>
                      )}
                      {v.managerComment && (
                        <div>
                          <span className="text-slate-500">Komentar managera: </span>
                          <span className="line-clamp-2 text-slate-600">{v.managerComment}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                        onClick={() => setDetailModalVisit(v)}
                      >
                        Detalji
                      </button>
                      {v.status !== "DONE" && v.status !== "CANCELED" && (
                        <button
                          className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition"
                          onClick={() => handleCompleteClick(v)}
                        >
                          Završeno
                        </button>
                      )}
                      {v.status !== "CANCELED" && v.status !== "DONE" && (
                        <button
                          className="flex-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                          onClick={() => handleCancelClick(v)}
                        >
                          Otkaži
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <table className="min-w-full text-sm hidden md:table">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Datum / vrijeme</th>
                    <th className="px-4 py-3 text-left">Klijent</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Napomena</th>
                    <th className="px-4 py-3 text-left">Komentar managera</th>
                    <th className="px-4 py-3 text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v) => (
                    <tr
                      key={v.id}
                      className="border-t border-slate-100 hover:bg-slate-50 transition"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {safeFormatDate(v.scheduledAt, {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-slate-500">
                          {safeFormatTime(v.scheduledAt, {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{v.client.name}</div>
                        {v.branches && v.branches.length > 0 && (
                          <div className="text-xs text-blue-600 font-medium mt-0.5">
                            📍 {v.branches.length === 1 
                              ? `Podružnica: ${v.branches[0].branch.name}`
                              : `${v.branches.length} podružnice: ${v.branches.map(vb => vb.branch.name).join(", ")}`
                            }
                          </div>
                        )}
                        {v.managerId && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            Dodijeljena od managera
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(
                            v.status
                          )}`}
                        >
                          {statusLabel(v.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {v.note ? (
                          <div className="text-slate-600 text-xs line-clamp-2">
                            {v.note}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[160px]">
                        {v.managerComment ? (
                          <span className="line-clamp-2 text-xs">{v.managerComment}</span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                            onClick={() => setDetailModalVisit(v)}
                          >
                            Detalji
                          </button>
                          {v.status !== "DONE" && v.status !== "CANCELED" && (
                            <button
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition"
                              onClick={() => handleCompleteClick(v)}
                            >
                              Završeno
                            </button>
                          )}
                          {v.status !== "CANCELED" && v.status !== "DONE" && (
                            <button
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                              onClick={() => handleCancelClick(v)}
                            >
                              Otkaži
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={totalVisits}
                  itemsPerPage={itemsPerPage}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal s detaljima posjete */}
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
                    {safeFormatDate(detailModalVisit.scheduledAt, {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    u {safeFormatTime(detailModalVisit.scheduledAt, {
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
                  <span className="text-slate-500 block text-xs font-medium mb-0.5">Status</span>
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColor(detailModalVisit.status)}`}>
                    {statusLabel(detailModalVisit.status)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs font-medium mb-0.5">Napomena</span>
                  <p className="text-slate-800 whitespace-pre-wrap">{detailModalVisit.note || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs font-medium mb-0.5">Komentar managera</span>
                  <p className="text-slate-800 whitespace-pre-wrap">{detailModalVisit.managerComment || "—"}</p>
                </div>
              </div>
              <div className="border-t border-slate-100 px-6 py-4 flex-shrink-0 flex gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  onClick={() => setDetailModalVisit(null)}
                >
                  Zatvori
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal za završavanje posjete - omogućava dodavanje kontakt osobe i napomene */}
      {completionModalOpen && selectedVisit &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold">Završi posjetu</h2>
                  <p className="text-xs text-slate-500">
                    {selectedVisit.client.name} -{" "}
                    {new Date(selectedVisit.scheduledAt).toLocaleString("bs-BA", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Dodajte informacije o kontakt osobi i napomenu o posjeti
                  </p>
                  {selectedVisit.branches && selectedVisit.branches.length > 0 && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs font-medium text-blue-800 mb-1">
                        📍 Podružnice za posjetu:
                      </p>
                      <ul className="text-xs text-blue-700 space-y-1">
                        {selectedVisit.branches.map((vb, idx) => (
                          <li key={vb.branch.id} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                            {vb.branch.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <button
                  className="text-slate-400 hover:text-slate-600"
                  onClick={() => {
                    setCompletionModalOpen(false);
                    setSelectedVisit(null);
                  }}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={onCompleteVisit} className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Datum posjete *
                    </label>
                    <input
                      type="date"
                      value={completionForm.date}
                      onChange={(e) =>
                        setCompletionForm((f) => ({ ...f, date: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Vrijeme *
                    </label>
                    <input
                      type="time"
                      value={completionForm.time}
                      onChange={(e) =>
                        setCompletionForm((f) => ({ ...f, time: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Kontakt osoba (s kim ste razgovarali)
                  </label>
                  <input
                    type="text"
                    value={completionForm.contactPerson}
                    onChange={(e) =>
                      setCompletionForm((f) => ({
                        ...f,
                        contactPerson: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Ime i prezime kontakt osobe..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Napomena o posjeti
                  </label>
                  <textarea
                    rows={4}
                    value={completionForm.note}
                    onChange={(e) =>
                      setCompletionForm((f) => ({
                        ...f,
                        note: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Detalji razgovora, rezultati posjete, dodatne informacije..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    onClick={() => {
                      setCompletionModalOpen(false);
                      setSelectedVisit(null);
                    }}
                  >
                    Odustani
                  </button>
                  <button
                    type="submit"
                    disabled={completionSubmitting}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {completionSubmitting ? "Spremam..." : "Završi posjetu"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal za otkazivanje posjete */}
      {cancellationModalOpen && selectedVisit &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 sticky top-0 bg-white">
                <div>
                  <h2 className="text-lg font-semibold">Otkaži posjetu</h2>
                  <p className="text-xs text-slate-500">
                    {selectedVisit.client.name} -{" "}
                    {new Date(selectedVisit.scheduledAt).toLocaleString("bs-BA", {
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
                    setSelectedVisit(null);
                    setCancellationForm({ reason: "" });
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
                    value={cancellationForm.reason}
                    onChange={(e) =>
                      setCancellationForm({ ...cancellationForm, reason: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                    placeholder="Unesite razlog otkazivanja posjete..."
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Molimo unesite detaljan razlog zašto otkazujete ovu posjetu.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    onClick={() => {
                      setCancellationModalOpen(false);
                      setSelectedVisit(null);
                      setCancellationForm({ reason: "" });
                    }}
                  >
                    Odustani
                  </button>
                  <button
                    type="submit"
                    disabled={cancellationSubmitting || !cancellationForm.reason.trim()}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ color: 'var(--color-red-700)' }}
                  >
                    {cancellationSubmitting ? "Otkazujem..." : "Otkaži posjetu"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal za kreiranje posjete */}
      {modalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 sticky top-0 bg-white">
                <div>
                  <h2 className="text-lg font-semibold">Nova posjeta</h2>
                  <p className="text-xs text-slate-500">
                    Odaberi postojećeg klijenta ili kreiraj novog.
                  </p>
                </div>
                <button
                  className="text-slate-400 hover:text-slate-600"
                  onClick={() => setModalOpen(false)}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={onCreate} className="px-6 py-5 space-y-4">
                {/* Switch: postojeći vs novi klijent */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="useNew"
                    checked={form.useNewClient}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, useNewClient: e.target.checked }))
                    }
                    className="rounded"
                  />
                  <label htmlFor="useNew" className="text-sm font-medium">
                    Kreiraj novog klijenta (apoteku)
                  </label>
                </div>

                {form.useNewClient ? (
                  /* Forma za novog klijenta */
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-slate-600">
                        Ime apoteke *
                      </label>
                      <input
                        value={form.clientData.name}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            clientData: { ...f.clientData, name: e.target.value },
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-slate-600">
                          ID broj kupca (MAT_BROJ) *
                        </label>
                        <input
                          value={form.clientData.matBroj}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              clientData: { ...f.clientData, matBroj: e.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          required
                          placeholder="Unesi MAT_BROJ"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600">
                          PDV broj (opciono)
                        </label>
                        <input
                          value={form.clientData.pdvBroj}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              clientData: { ...f.clientData, pdvBroj: e.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          placeholder="Unesi PDV broj ako postoji"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-slate-600">
                          Adresa
                        </label>
                        <input
                          value={form.clientData.address}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              clientData: {
                                ...f.clientData,
                                address: e.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600">
                          Grad
                        </label>
                        <input
                          value={form.clientData.city}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              clientData: { ...f.clientData, city: e.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-slate-600">
                          Kontakt telefon
                        </label>
                        <input
                          value={form.clientData.phone}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              clientData: {
                                ...f.clientData,
                                phone: e.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600">
                          Email
                        </label>
                        <input
                          type="email"
                          value={form.clientData.email}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              clientData: {
                                ...f.clientData,
                                email: e.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">
                        Odgovorna osoba
                      </label>
                      <input
                        value={form.clientData.contactPerson}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            clientData: {
                              ...f.clientData,
                              contactPerson: e.target.value,
                            },
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">
                        Napomena (za klijenta)
                      </label>
                      <textarea
                        rows={2}
                        value={form.clientData.note}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            clientData: {
                              ...f.clientData,
                              note: e.target.value,
                            },
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  /* Searchable dropdown za postojećeg klijenta */
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Odaberi klijenta (apoteku) *
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
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        placeholder="Unesi naziv klijenta ili klikni da vidiš listu..."
                        required={!form.clientId}
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
                )}

                {/* Datum i vrijeme */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Datum posjete *
                    </label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, date: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Vrijeme *
                    </label>
                    <input
                      type="time"
                      value={form.time}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, time: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Kontakt osoba tokom posjete */}
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    S kojom osobom se razgovaralo
                  </label>
                  <input
                    type="text"
                    value={form.contactPersonDuringVisit}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        contactPersonDuringVisit: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Ime i prezime osobe s kojom ste razgovarali..."
                  />
                </div>

                {/* Napomena za posjetu */}
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Napomena za posjetu
                  </label>
                  <textarea
                    rows={3}
                    value={form.note}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, note: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Kratka napomena o cilju posjete..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    onClick={() => setModalOpen(false)}
                  >
                    Odustani
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                  >
                    {submitting ? "Spremam..." : "Dodaj posjetu"}
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

