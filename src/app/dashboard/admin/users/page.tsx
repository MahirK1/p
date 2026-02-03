"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import classNames from "classnames";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  canAccessDoctorVisits?: boolean;
};

type FormState = {
  id?: string;
  name: string;
  email: string;
  password: string;
  role: string;
  canAccessDoctorVisits?: boolean;
};

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    role: "COMMERCIAL",
    canAccessDoctorVisits: false,
  });

  const filteredUsers = useMemo(() => {
    if (!search.trim() && !roleFilter) return users;
    const term = search.toLowerCase();
    return users.filter((u) => {
      const matchesSearch = `${u.name} ${u.email}`.toLowerCase().includes(term);
      const matchesRole = !roleFilter || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    const url = roleFilter 
      ? `/api/users?role=${roleFilter}`
      : "/api/users";
    const res = await fetch(url);
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreateModal = () => {
    setIsEdit(false);
    setForm({
      name: "",
      email: "",
      password: "",
      role: "COMMERCIAL",
      canAccessDoctorVisits: false,
    });
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setIsEdit(true);
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      canAccessDoctorVisits: user.canAccessDoctorVisits || false,
    });
    setModalOpen(true);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.target.type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((f) => ({ ...f, [e.target.name]: checked }));
    } else {
      setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const method = isEdit ? "PUT" : "POST";
      const body = isEdit
        ? { 
            id: form.id, 
            name: form.name, 
            email: form.email, 
            role: form.role, 
            password: form.password || undefined,
            canAccessDoctorVisits: form.canAccessDoctorVisits || false
          }
        : { 
            name: form.name, 
            email: form.email, 
            password: form.password, 
            role: form.role,
            canAccessDoctorVisits: form.canAccessDoctorVisits || false
          };

      const res = await fetch("/api/users", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setModalOpen(false);
        await loadUsers();
      } else {
        const err = await res.json();
        showToast("Greška: " + (err.error || "Nepoznata greška"), "error");
      }
    } catch (error) {
      showToast("Greška: " + error, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Da li ste sigurni da želite obrisati korisnika "${name}"?`)) {
      return;
    }

    const res = await fetch(`/api/users?id=${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      await loadUsers();
    } else {
      const err = await res.json();
      showToast("Greška: " + (err.error || "Nepoznata greška"), "error");
    }
  };

  const roleLabels: Record<string, string> = {
    COMMERCIAL: "Komercijalista",
    MANAGER: "Manager",
    ORDER_MANAGER: "Order Manager",
    ADMIN: "Admin",
  };

  const roleColors: Record<string, string> = {
    COMMERCIAL: "bg-blue-100 text-blue-700",
    MANAGER: "bg-purple-100 text-purple-700",
    ORDER_MANAGER: "bg-amber-100 text-amber-700",
    ADMIN: "bg-red-100 text-red-700",
  };

  if (loading || !users) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Korisnici</h1>
          <p className="text-sm text-slate-500">
            Upravljaj korisnicima sistema i njihovim ulogama.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-emerald-500"
          onClick={openCreateModal}
        >
          + Dodaj korisnika
        </button>
      </header>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none md:max-w-sm"
            placeholder="Pretraži po imenu ili emailu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Sve uloge</option>
            <option value="COMMERCIAL">Komercijalista</option>
            <option value="MANAGER">Manager</option>
            <option value="ORDER_MANAGER">Order Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <LoadingSpinner size="md" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              Nema korisnika za prikaz.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Ime</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Uloga</th>
                  <th className="px-4 py-3 text-left">Datum kreiranja</th>
                  <th className="px-4 py-3 text-right">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-t border-slate-100 hover:bg-slate-50 transition"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {user.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                          roleColors[user.role] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {roleLabels[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(user.createdAt).toLocaleDateString("bs-BA")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                          onClick={() => openEditModal(user)}
                        >
                          Uredi
                        </button>
                        <button
                          className="text-sm font-medium text-red-600 hover:text-red-500"
                          onClick={() => handleDelete(user.id, user.name)}
                        >
                          Obriši
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {isEdit ? "Uredi korisnika" : "Novi korisnik"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Popuni osnovne podatke o korisniku.
                  </p>
                </div>
                <button
                  className="text-slate-400 hover:text-slate-600"
                  onClick={() => setModalOpen(false)}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Ime *
                    </label>
                    <input
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={onChange}
                      required
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Email *
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={onChange}
                      required
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      {isEdit ? "Nova lozinka (ostavite prazno da se ne mijenja)" : "Lozinka *"}
                    </label>
                    <input
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={onChange}
                      required={!isEdit}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Uloga *
                    </label>
                    <select
                      name="role"
                      value={form.role}
                      onChange={onChange}
                      required
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="COMMERCIAL">Komercijalista</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ORDER_MANAGER">Order Manager</option>
                      <option value="DIRECTOR">Direktor</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                </div>
                {form.role === "COMMERCIAL" && (
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.canAccessDoctorVisits || false}
                        onChange={(e) =>
                          setForm({ ...form, canAccessDoctorVisits: e.target.checked })
                        }
                        className="rounded border-slate-300"
                      />
                      <span className="text-sm font-medium text-slate-600">
                        Dozvoli pristup posjetama doktora
                      </span>
                    </label>
                  </div>
                )}
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
                    className={classNames(
                      "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-500",
                      submitting && "opacity-70 cursor-not-allowed"
                    )}
                    disabled={submitting}
                  >
                    {submitting ? "Spremam..." : isEdit ? "Spremi promjene" : "Dodaj korisnika"}
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
