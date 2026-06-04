"use client";

import { NotificationBell } from "./NotificationBell";

export function DashboardTopBar() {
  return (
    <div className="hidden md:flex sticky top-0 z-20 h-12 shrink-0 items-center justify-end border-b border-slate-200 bg-white/95 backdrop-blur px-4 lg:px-6 print:hidden">
      <NotificationBell />
    </div>
  );
}
