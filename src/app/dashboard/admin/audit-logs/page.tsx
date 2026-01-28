"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type UserOption = {
  id: string;
  name: string;
  email: string;
};

type AuditLogItem = {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
  metadata?: any;
  ip?: string | null;
  userAgent?: string | null;
};

export default function AdminAuditLogsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [refreshFlag, setRefreshFlag] = useState(0);

  // Učitaj korisnike (za filter)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) {
          throw new Error("Failed to load users");
        }
        const data = await res.json();
        setUsers(
          (data || []).map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
          }))
        );
      } catch (error) {
        console.error("Error loading users for audit log:", error);
      }
    };
    loadUsers();
  }, []);

  // Učitaj logove
  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (userId) params.set("userId", userId);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        params.set("limit", "200");

        const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Failed to load audit logs");
        }
        const data = await res.json();
        setLogs(data || []);
      } catch (error) {
        console.error("Error loading audit logs:", error);
        showToast("Greška pri učitavanju logova.", "error");
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshFlag]);

  const handleApplyFilters = () => {
    setRefreshFlag((x) => x + 1);
  };

  const downloadUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("limit", "1000");
    params.set("download", "1");
    return `/api/admin/audit-logs?${params.toString()}`;
  }, [userId, from, to]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Audit log</h1>
          <p className="text-sm text-slate-500">
            Pregled aktivnosti korisnika na portalu, sa mogućnošću preuzimanja u TXT formatu.
          </p>
        </div>
        <a
          href={downloadUrl}
          className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-700"
        >
          Preuzmi TXT log
        </a>
      </header>

      {/* Filteri */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Korisnik
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">Svi korisnici</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Od datuma
            </label>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Do datuma
            </label>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleApplyFilters}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-500"
            >
              Primijeni filtere
            </button>
            <button
              type="button"
              onClick={() => {
                setUserId("");
                setFrom("");
                setTo("");
                setRefreshFlag((x) => x + 1);
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <LoadingSpinner size="lg" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            Nema logova za prikaz za odabrani period/filtere.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Vrijeme</th>
                  <th className="px-3 py-2 text-left">Korisnik</th>
                  <th className="px-3 py-2 text-left">Akcija</th>
                  <th className="px-3 py-2 text-left">Entitet</th>
                  <th className="px-3 py-2 text-left">Detalji</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-t border-slate-100 hover:bg-slate-50 transition"
                  >
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("bs-BA")}
                    </td>
                    <td className="px-3 py-2 text-slate-800 min-w-[180px]">
                      <div className="font-medium">{log.user.name}</div>
                      <div className="text-xs text-slate-500">{log.user.email}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-800 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                      {log.entityType}
                      {log.entityId && (
                        <span className="text-slate-400"> ({log.entityId})</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {log.metadata ? (
                        <pre className="max-h-32 overflow-auto rounded bg-slate-50 p-2 text-[11px] md:text-xs">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


