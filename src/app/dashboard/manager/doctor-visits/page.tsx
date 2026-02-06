"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";

type DoctorVisit = {
  id: string;
  firstName: string;
  lastName: string;
  institution: string;
  contactNumber?: string | null;
  email?: string | null;
  scheduledAt: string;
  note?: string | null;
  managerComment?: string | null;
  commercial: { id: string; name: string };
};

type Commercial = { id: string; name: string };

export default function ManagerDoctorVisitsPage() {
  const { showToast } = useToast();
  const [visits, setVisits] = useState<DoctorVisit[]>([]);
  const [commercials, setCommercials] = useState<Commercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<DoctorVisit | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentVisit, setCommentVisit] = useState<DoctorVisit | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const [filterDateFrom, setFilterDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [filterDateTo, setFilterDateTo] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [filterCommercialId, setFilterCommercialId] = useState("");

  const [form, setForm] = useState({
    commercialId: "",
    firstName: "",
    lastName: "",
    institution: "",
    contactNumber: "",
    email: "",
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    note: "",
  });

  const loadCommercials = async () => {
    try {
      const res = await fetch("/api/users?role=COMMERCIAL");
      if (res.ok) {
        const data = await res.json();
        setCommercials(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const from = new Date(filterDateFrom);
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      let url = `/api/doctor-visits?from=${from.toISOString()}&to=${to.toISOString()}`;
      if (filterCommercialId) url += `&commercialId=${filterCommercialId}`;
      const res = await fetch(url);
      const data = await res.json();
      setVisits(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast("Greška pri učitavanju posjeta doktora.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommercials();
  }, []);

  useEffect(() => {
    load();
  }, [filterDateFrom, filterDateTo, filterCommercialId]);

  const openCreateModal = () => {
    setEditingVisit(null);
    setForm({
      commercialId: filterCommercialId || (commercials[0]?.id ?? ""),
      firstName: "",
      lastName: "",
      institution: "",
      contactNumber: "",
      email: "",
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
      note: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (visit: DoctorVisit) => {
    setEditingVisit(visit);
    const scheduledDate = new Date(visit.scheduledAt);
    setForm({
      commercialId: visit.commercial.id,
      firstName: visit.firstName,
      lastName: visit.lastName,
      institution: visit.institution,
      contactNumber: visit.contactNumber || "",
      email: visit.email || "",
      date: scheduledDate.toISOString().slice(0, 10),
      time: scheduledDate.toTimeString().slice(0, 5),
      note: visit.note || "",
    });
    setModalOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const scheduledAt = new Date(`${form.date}T${form.time}:00`);

    try {
      const method = editingVisit ? "PATCH" : "POST";
      const body = editingVisit
        ? {
            id: editingVisit.id,
            firstName: form.firstName,
            lastName: form.lastName,
            institution: form.institution,
            contactNumber: form.contactNumber || null,
            email: form.email || null,
            scheduledAt: scheduledAt.toISOString(),
            note: form.note || null,
          }
        : {
            commercialId: form.commercialId || undefined,
            firstName: form.firstName,
            lastName: form.lastName,
            institution: form.institution,
            contactNumber: form.contactNumber || null,
            email: form.email || null,
            scheduledAt: scheduledAt.toISOString(),
            note: form.note || null,
          };

      const res = await fetch("/api/doctor-visits", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setModalOpen(false);
        setEditingVisit(null);
        await load();
        showToast(
          editingVisit ? "Posjeta doktora je ažurirana." : "Posjeta doktora je kreirana.",
          "success"
        );
      } else {
        const err = await res.text();
        showToast("Greška: " + err, "error");
      }
    } catch (error) {
      showToast("Greška pri spremanju posjete doktora.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Da li ste sigurni da želite obrisati ovu posjetu doktora?")) return;
    try {
      const res = await fetch(`/api/doctor-visits?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await load();
        showToast("Posjeta doktora je obrisana.", "success");
      } else {
        showToast("Greška pri brisanju posjete doktora.", "error");
      }
    } catch (error) {
      showToast("Greška pri brisanju posjete doktora.", "error");
    }
  };

  const openCommentModal = (visit: DoctorVisit) => {
    setCommentVisit(visit);
    setCommentText(visit.managerComment ?? "");
    setCommentModalOpen(true);
  };

  const saveComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentVisit) return;
    setCommentSubmitting(true);
    try {
      const res = await fetch("/api/doctor-visits", {
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
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Posjete doktora</h1>
          <p className="text-sm text-slate-500">
            Pregled posjeta doktora koje su imali komercijalisti.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition shadow-sm"
        >
          + Dodaj posjetu (za komercijalistu)
        </button>
      </header>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <div className="flex flex-wrap items-center gap-3">
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
              value={filterCommercialId}
              onChange={(e) => setFilterCommercialId(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none min-w-[180px]"
            >
              <option value="">Svi komercijalisti</option>
              {commercials.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <LoadingSpinner size="md" />
          </div>
        ) : visits.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            Nema posjeta doktora u ovom periodu.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Datum / vrijeme</th>
                  <th className="px-4 py-3 text-left">Komercijalista</th>
                  <th className="px-4 py-3 text-left">Ime i prezime</th>
                  <th className="px-4 py-3 text-left">Ustanova</th>
                  <th className="px-4 py-3 text-left">Kontakt</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Napomena</th>
                  <th className="px-4 py-3 text-left">Komentar komercijalisti</th>
                  <th className="px-4 py-3 text-right">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit) => (
                  <tr
                    key={visit.id}
                    className="border-t border-slate-100 hover:bg-slate-50 transition"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {new Date(visit.scheduledAt).toLocaleDateString("bs-BA", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(visit.scheduledAt).toLocaleTimeString("bs-BA", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {visit.commercial.name}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {visit.firstName} {visit.lastName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{visit.institution}</td>
                    <td className="px-4 py-3 text-slate-600">{visit.contactNumber || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{visit.email || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs">
                      {visit.note ? (
                        <div className="text-xs line-clamp-2">{visit.note}</div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[160px]">
                      {visit.managerComment ? (
                        <span className="line-clamp-2 text-xs">{visit.managerComment}</span>
                      ) : (
                        "-"
                      )}
                      <button
                        type="button"
                        className="block mt-1 text-xs text-blue-600 hover:underline"
                        onClick={() => openCommentModal(visit)}
                      >
                        {visit.managerComment ? "Uredi komentar" : "Dodaj komentar"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(visit)}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition"
                        >
                          Uredi
                        </button>
                        <button
                          onClick={() => handleDelete(visit.id)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                        >
                          Obriši
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingVisit(null);
          }}
          title={editingVisit ? "Uredi posjetu doktora" : "Nova posjeta doktora (za komercijalistu)"}
          size="md"
        >
          <form onSubmit={onSubmit} className="space-y-4">
            {!editingVisit && (
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Komercijalista *
                </label>
                <select
                  value={form.commercialId}
                  onChange={(e) => setForm({ ...form, commercialId: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Odaberi komercijalistu</option>
                  {commercials.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Ime *</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Prezime *</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Ustanova *</label>
              <input
                type="text"
                value={form.institution}
                onChange={(e) => setForm({ ...form, institution: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Kontakt broj</label>
                <input
                  type="tel"
                  value={form.contactNumber}
                  onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Datum posjete *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Vrijeme *</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Napomena</label>
              <textarea
                rows={3}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                onClick={() => { setModalOpen(false); setEditingVisit(null); }}
              >
                Odustani
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
              >
                {submitting ? "Spremam..." : editingVisit ? "Spremi promjene" : "Dodaj posjetu"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal za komentar komercijalisti */}
      {commentModalOpen && commentVisit && (
        <Modal
          isOpen={commentModalOpen}
          onClose={() => { setCommentModalOpen(false); setCommentVisit(null); setCommentText(""); }}
          title="Komentar komercijalisti"
          size="md"
        >
          <div className="mb-3 text-sm text-slate-500">
            {commentVisit.commercial.name} – {commentVisit.firstName} {commentVisit.lastName}, {commentVisit.institution} –{" "}
            {new Date(commentVisit.scheduledAt).toLocaleString("bs-BA", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
            <br />
            <span className="text-xs">Komercijalista će dobiti push obavijest kada spremite komentar.</span>
          </div>
          <form onSubmit={saveComment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Komentar</label>
              <textarea
                rows={4}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Ostavite komentar komercijalisti o ovoj posjeti doktora..."
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
        </Modal>
      )}
    </div>
  );
}
