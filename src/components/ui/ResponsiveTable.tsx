"use client";

import { ReactNode } from "react";

type ResponsiveTableProps = {
  headers: { label: string; className?: string; mobileLabel?: string }[];
  rows: ReactNode[][];
  loading?: boolean;
  emptyMessage?: string;
  mobileCard?: (row: ReactNode[], index: number) => ReactNode;
};

export function ResponsiveTable({
  headers,
  rows,
  loading = false,
  emptyMessage = "Nema podataka za prikaz.",
  mobileCard,
}: ResponsiveTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-blue-600" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="p-6 text-sm text-slate-500 text-center">{emptyMessage}</div>
    );
  }

  return (
    <>
      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className={`px-4 py-3 text-left ${header.className || ""}`}
                >
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="border-t border-slate-100 hover:bg-slate-50 transition"
              >
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className={`px-4 py-3 ${headers[cellIdx]?.className || ""}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3 p-4">
        {mobileCard
          ? rows.map((row, idx) => mobileCard(row, idx))
          : rows.map((row, rowIdx) => (
              <div
                key={rowIdx}
                className="bg-white border border-slate-200 rounded-lg p-4 space-y-2"
              >
                {row.map((cell, cellIdx) => (
                  <div key={cellIdx} className="flex justify-between items-start">
                    <span className="text-xs font-medium text-slate-500">
                      {headers[cellIdx]?.mobileLabel || headers[cellIdx]?.label}:
                    </span>
                    <span className="text-sm text-slate-900 text-right flex-1 ml-4">
                      {cell}
                    </span>
                  </div>
                ))}
              </div>
            ))}
      </div>
    </>
  );
}
