"use client";

import type { ReactNode } from "react";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { DashboardTopBar } from "@/components/layout/DashboardTopBar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex bg-slate-50 overflow-hidden" style={{ height: '100dvh' }}>
      {/* Sidebar - desktop */}
      <div className="print:hidden hidden md:block flex-shrink-0">
        <MobileSidebar />
      </div>
      
      {/* Mobile header + sidebar */}
      <div className="print:hidden md:hidden">
        <MobileSidebar />
      </div>
      
      {/* Main content - scrollable */}
      <main className="flex-1 flex flex-col bg-slate-50 pt-14 md:pt-0 overflow-hidden min-w-0 print:bg-white print:p-0 transition-all duration-300">
        <DashboardTopBar />
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 print:p-0">
          <div className="max-w-7xl mx-auto w-full print:max-w-none">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}