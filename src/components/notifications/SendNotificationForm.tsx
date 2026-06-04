"use client";

import { useEffect, useState } from "react";
import classNames from "classnames";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type UserOption = { id: string; name: string; email: string; role?: string };

type Props = {
  mode: "admin" | "manager";
};

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

export function SendNotificationForm({ mode }: Props) {
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [audience, setAudience] = useState(
    mode === "admin" ? "ALL" : "ALL_COMMERCIALS"
  );
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const isSelectedAudience = audience === "SELECTED";

  useEffect(() => {
    const needsList =
      (mode === "admin" && audience === "SELECTED") ||
      (mode === "manager" && audience === "SELECTED");
    if (!needsList) return;

    setLoadingUsers(true);
    const fetchUrl =
      mode === "manager" ? "/api/users?role=COMMERCIAL" : "/api/users";

    fetch(fetchUrl)
      .then((r) => r.json())
      .then((data) => {
        setUsers(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoadingUsers(false));
  }, [audience, mode]);

  const toggleUser = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(users.map((u) => u.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSelectedAudience && selectedIds.size === 0) {
      showToast("Odaberi barem jednog primatelja.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message,
          url: url.trim() || undefined,
          audience,
          userIds: isSelectedAudience ? Array.from(selectedIds) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Greška pri slanju.", "error");
        return;
      }
      showToast(
        `Obavijest poslana ${data.sentCount} korisniku/a.`,
        "success"
      );
      setTitle("");
      setMessage("");
      setUrl("");
      setSelectedIds(new Set());
    } catch {
      showToast("Greška pri slanju obavijesti.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden"
    >
      <div className="border-b border-slate-100 px-6 py-5">
        <h2
          id="send-notification-heading"
          className="text-lg font-semibold text-slate-900"
        >
          {mode === "admin" ? "Pošalji obavijest" : "Nova obavijest za tim"}
        </h2>
        <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
          {mode === "admin"
            ? "Poruka stiže u zvonce i push obavijest svim odabranim korisnicima."
            : "Komercijalisti vide poruku u meniju Obavijesti i na zvoncu u headeru."}
        </p>
      </div>

      <div className="px-6 py-6 space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="notification-audience"
            className="block text-sm font-medium text-slate-700"
          >
            Primatelji
          </label>
          <select
            id="notification-audience"
            value={audience}
            onChange={(e) => {
              setAudience(e.target.value);
              setSelectedIds(new Set());
            }}
            className={inputClass}
          >
            {mode === "admin" ? (
              <>
                <option value="ALL">Svi korisnici portala</option>
                <option value="COMMERCIAL">Svi komercijalisti</option>
                <option value="MANAGER">Svi manageri</option>
                <option value="DIRECTOR">Svi direktori</option>
                <option value="ORDER_MANAGER">Svi order manageri</option>
                <option value="ADMIN">Svi administratori</option>
                <option value="SELECTED">Odabrani korisnici</option>
              </>
            ) : (
              <>
                <option value="ALL_COMMERCIALS">Svi komercijalisti</option>
                <option value="SELECTED">Odabrani komercijalisti</option>
              </>
            )}
          </select>
        </div>

        {isSelectedAudience && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-700">
                {mode === "manager" ? "Odaberi komercijaliste" : "Odaberi korisnike"}
                {users.length > 0 && (
                  <span className="font-normal text-slate-500 ml-1">
                    ({selectedIds.size} / {users.length})
                  </span>
                )}
              </span>
              {users.length > 0 && !loadingUsers && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Odaberi sve
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-xs font-medium text-slate-600 hover:underline"
                  >
                    Poništi
                  </button>
                </div>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 max-h-56 overflow-y-auto">
              {loadingUsers ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner size="sm" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-sm text-slate-500 p-4 text-center">
                  {mode === "manager"
                    ? "Nema komercijalista u sistemu."
                    : "Nema korisnika za prikaz."}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <li key={u.id}>
                      <label
                        className={classNames(
                          "flex items-center gap-3 px-4 py-3 cursor-pointer transition hover:bg-white",
                          selectedIds.has(u.id) && "bg-blue-50/60"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(u.id)}
                          onChange={() => toggleUser(u.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-slate-800 truncate">
                            {u.name}
                          </span>
                          <span className="block text-xs text-slate-500 truncate">
                            {u.email}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <label
              htmlFor="notification-title"
              className="block text-sm font-medium text-slate-700"
            >
              Naslov
            </label>
            <input
              id="notification-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={inputClass}
              placeholder="npr. Podsjetnik — posjete u petak"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="notification-message"
              className="block text-sm font-medium text-slate-700"
            >
              Poruka
            </label>
            <textarea
              id="notification-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              className={inputClass}
              placeholder="Napiši poruku koju će komercijalisti pročitati..."
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="notification-url"
              className="block text-sm font-medium text-slate-700"
            >
              Link na portalu{" "}
              <span className="font-normal text-slate-400">(opciono)</span>
            </label>
            <input
              id="notification-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputClass}
              placeholder="/dashboard/commercial/visits"
            />
            <p className="text-xs text-slate-500 leading-relaxed">
              Ako uneseš link, klik na obavijest vodi komercijalistu na tu stranicu.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-4 flex flex-wrap items-center justify-end gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-60 transition"
        >
          {submitting ? "Šaljem..." : "Pošalji obavijest"}
        </button>
      </div>
    </form>
  );
}
