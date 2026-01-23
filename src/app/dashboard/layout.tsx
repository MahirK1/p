"use client";

import type { ReactNode } from "react";
import { MobileSidebar } from "@/components/layout/MobileSidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar - desktop */}
      <div className="print:hidden hidden md:block flex-shrink-0">
        <MobileSidebar />
      </div>
      
      {/* Mobile header + sidebar */}
      <div className="print:hidden md:hidden">
        <MobileSidebar />
      </div>
      
      {/* Main content - scrollable */}
      <main className="flex-1 bg-slate-50 pt-14 md:pt-0 overflow-y-auto min-w-0 print:bg-white print:p-0 transition-all duration-300">
        <div className="p-4 md:p-6 lg:p-8 print:p-0">
          <div className="max-w-7xl mx-auto w-full print:max-w-none">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}