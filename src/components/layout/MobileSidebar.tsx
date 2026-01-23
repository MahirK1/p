"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    // Učitaj iz localStorage ako postoji
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebarCollapsed");
      if (saved !== null) return saved === "true";
    }
    return false;
  });

  // Automatski collapse na srednjim ekranima (tablet, laptop)
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      // Na ekranima između 768px i 1280px, automatski collapse ako nije ručno postavljeno
      if (width >= 768 && width < 1280) {
        const saved = localStorage.getItem("sidebarCollapsed");
        if (saved === null) {
          setCollapsed(true);
        }
      } else if (width >= 1280) {
        const saved = localStorage.getItem("sidebarCollapsed");
        if (saved === null) {
          setCollapsed(false);
        }
      }
    };

    // Postavi inicijalno stanje
    handleResize();

    // Slušaj promjene veličine ekrana
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Spremi u localStorage kada se promijeni
  const handleToggleCollapse = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    localStorage.setItem("sidebarCollapsed", String(newCollapsed));
  };

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setIsAnimating(true);
    } else {
      document.body.style.overflow = "";
      // Delay removing animation class to allow slide-out animation
      setTimeout(() => setIsAnimating(false), 300);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Funkcija koja se poziva kada se klikne na link
  const handleLinkClick = () => {
    // Zatvori sidebar na mobile (samo ako je otvoren)
    if (window.innerWidth < 768) {
      setOpen(false);
    }
  };

  return (
    <>
      {/* Mobile sidebar overlay - only visible on mobile when open */}
      {open && (
        <>
          <div
            className={`md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
              open ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setOpen(false)}
          />
          <div
            className={`md:hidden fixed left-0 top-0 bottom-0 z-50 transition-transform duration-300 ease-in-out ${
              open && isAnimating
                ? "transform translate-x-0"
                : "transform -translate-x-full"
            }`}
          >
            <Sidebar onLinkClick={handleLinkClick} />
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-2 text-white hover:bg-slate-800 rounded-lg transition z-10"
              aria-label="Zatvori meni"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </>
      )}

      {/* Desktop sidebar - always visible on desktop */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar 
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>

      {/* Hamburger button - integrated in mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-30 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => setOpen(true)}
          className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
          aria-label="Otvori meni"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <div className="relative w-8 h-8 flex-shrink-0">
            <img
              src="/italgroup-logo.png"
              alt="Italgroup"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) {
                  parent.innerHTML = '<div class="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">IG</div>';
                }
              }}
            />
          </div>
          <span className="text-sm font-semibold text-slate-900">B2B Portal</span>
        </div>
      </div>
    </>
  );
}
