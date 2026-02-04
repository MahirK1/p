"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useMemo, useCallback } from "react";
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  CubeIcon,
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { PushNotificationButton } from "@/components/ui/PushNotificationButton";

type SidebarProps = {
  onLinkClick?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function Sidebar({ onLinkClick, collapsed = false, onToggleCollapse }: SidebarProps = {}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  
  // Memoiziraj session.user da se ne mijenja referenca svaki put
  const sessionUser = useMemo(() => {
    try {
      return session?.user;
    } catch {
      return undefined;
    }
  }, [session?.user]);
  
  // Memoiziraj role i userName da se ne računaju svaki put
  const role = useMemo(() => {
    try {
      return (sessionUser as any)?.role;
    } catch {
      return undefined;
    }
  }, [sessionUser]);
  
  const userName = useMemo(() => {
    try {
      return (sessionUser as any)?.name;
    } catch {
      return undefined;
    }
  }, [sessionUser]);
  
  // Memoiziraj session check da se ne mijenja svaki put
  const hasSession = useMemo(() => {
    try {
      return !!session;
    } catch {
      return false;
    }
  }, [session]);

  // Memoiziraj getLinkClass funkciju da se ne kreira svaki put
  const getLinkClass = useCallback((href: string) => {
    try {
      const isActive = pathname != null && (pathname === href || pathname.startsWith(href + "/"));
      return `flex items-center gap-2 py-2 px-2 rounded transition ${
        collapsed ? "justify-center" : ""
      } ${
        isActive
          ? "bg-slate-800 text-white font-medium"
          : "hover:bg-slate-800 text-slate-300"
      }`;
    } catch (error) {
      console.error("Error in getLinkClass:", error);
      return `flex items-center gap-2 py-2 px-2 rounded transition ${
        collapsed ? "justify-center" : ""
      } hover:bg-slate-800 text-slate-300`;
    }
  }, [pathname, collapsed]);

  // Handler koji se poziva kada se klikne na link
  const handleLinkClick = useCallback(() => {
    if (onLinkClick) {
      onLinkClick();
    }
  }, [onLinkClick]);

  const handleLogout = useCallback(async () => {
    await signOut({ callbackUrl: "/login", redirect: true });
  }, []);

  return (
    <aside className={`flex flex-col h-screen bg-slate-900 text-white transition-all duration-300 ${
      collapsed ? "w-16 lg:w-20" : "w-64"
    }`}>
      <div className="flex-1 p-4 space-y-4 overflow-y-auto min-h-0">
        {/* Logo */}
        <div className={`flex items-center gap-3 pb-4 border-b border-slate-800 ${collapsed ? "justify-center" : ""}`}>
          <div className="relative w-10 h-10 flex-shrink-0">
            <Image
              src="/italgroup-logo.png"
              alt="Italgroup Logo"
              fill
              className="object-contain"
              priority
              onError={(e) => {
                // Fallback ako logo ne postoji
                (e.target as HTMLImageElement).style.display = "none";
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) {
                  parent.innerHTML = '<div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">IG</div>';
                }
              }}
            />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">B2B Portal</div>
              <div className="text-xs text-slate-400 truncate">Italgroup</div>
            </div>
          )}
        </div>
        
        {hasSession && !collapsed && (
          <div className="px-2 py-2 text-xs text-slate-400 border-b border-slate-800">
            <p className="font-medium text-slate-300 truncate">{userName}</p>
            <p className="text-slate-500 capitalize">{role?.toLowerCase()}</p>
            <div className="mt-2">
              <PushNotificationButton />
            </div>
          </div>
        )}

        <nav className="space-y-1 text-sm">
          {role === "COMMERCIAL" && (
            <>
              <Link 
                href="/dashboard/commercial" 
                className={getLinkClass("/dashboard/commercial")}
                onClick={handleLinkClick}
                title={collapsed ? "Moj dashboard" : undefined}
              >
                <HomeIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Moj dashboard</span>}
              </Link>
              <Link 
                href="/dashboard/commercial/clients" 
                className={getLinkClass("/dashboard/commercial/clients")}
                onClick={handleLinkClick}
                title={collapsed ? "Klijenti" : undefined}
              >
                <UsersIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Klijenti</span>}
              </Link>
              <Link 
                href="/dashboard/commercial/orders" 
                className={getLinkClass("/dashboard/commercial/orders")}
                onClick={handleLinkClick}
                title={collapsed ? "Moje narudžbe" : undefined}
              >
                <ClipboardDocumentListIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Moje narudžbe</span>}
              </Link>

              <Link 
                href="/dashboard/commercial/visits" 
                className={getLinkClass("/dashboard/commercial/visits")}
                onClick={handleLinkClick}
                title={collapsed ? "Moje posjete" : undefined}
              >
                <UsersIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Moje posjete</span>}
              </Link>

              <Link 
                href="/dashboard/commercial/products" 
                className={getLinkClass("/dashboard/commercial/products")}
                onClick={handleLinkClick}
                title={collapsed ? "Proizvodi" : undefined}
              >
                <CubeIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Proizvodi</span>}
              </Link>

              <Link 
                href="/dashboard/commercial/doctor-visits" 
                className={getLinkClass("/dashboard/commercial/doctor-visits")}
                onClick={handleLinkClick}
                title={collapsed ? "Posjete doktora" : undefined}
              >
                <UsersIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Posjete doktora</span>}
              </Link>

              <Link 
                href="/dashboard/commercial/chat" 
                className={getLinkClass("/dashboard/commercial/chat")}
                onClick={handleLinkClick}
                title={collapsed ? "Chat" : undefined}
              >
                <ChatBubbleLeftRightIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Chat</span>}
              </Link>
            </>
          )}

          {role === "MANAGER" && (
            <>
              <Link 
                href="/dashboard/manager" 
                className={getLinkClass("/dashboard/manager")}
                onClick={handleLinkClick}
                title={collapsed ? "Manager dashboard" : undefined}
              >
                <HomeIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Manager dashboard</span>}
              </Link>

              <Link 
                href="/dashboard/manager/clients" 
                className={getLinkClass("/dashboard/manager/clients")}
                onClick={handleLinkClick}
                title={collapsed ? "Klijenti" : undefined}
              >
                <UsersIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Klijenti</span>}
              </Link>

              <Link 
                href="/dashboard/manager/visits" 
                className={getLinkClass("/dashboard/manager/visits")}
                onClick={handleLinkClick}
                title={collapsed ? "Planiranje posjeta" : undefined}
              >
                <UsersIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Planiranje posjeta</span>}
              </Link>

              <Link 
                href="/dashboard/manager/plans" 
                className={getLinkClass("/dashboard/manager/plans")}
                onClick={handleLinkClick}
                title={collapsed ? "Mjesečni planovi" : undefined}
              >
                <ClipboardDocumentListIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Mjesečni planovi</span>}
              </Link>

              <Link 
                href="/dashboard/manager/chat" 
                className={getLinkClass("/dashboard/manager/chat")}
                onClick={handleLinkClick}
                title={collapsed ? "Chat" : undefined}
              >
                <ChatBubbleLeftRightIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Chat</span>}
              </Link>
            </>
          )}

          {role === "ORDER_MANAGER" && (
            <>
              <Link 
                href="/dashboard/order-manager" 
                className={getLinkClass("/dashboard/order-manager")}
                onClick={handleLinkClick}
                title={collapsed ? "Narudžbe" : undefined}
              >
                <ClipboardDocumentListIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Narudžbe</span>}
              </Link>
              <Link 
                href="/dashboard/order-manager/chat" 
                className={getLinkClass("/dashboard/order-manager/chat")}
                onClick={handleLinkClick}
                title={collapsed ? "Chat" : undefined}
              >
                <ChatBubbleLeftRightIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Chat</span>}
              </Link>
            </>
          )}

          {role === "DIRECTOR" && (
            <>
              <Link 
                href="/dashboard/director" 
                className={getLinkClass("/dashboard/director")}
                onClick={handleLinkClick}
                title={collapsed ? "Direktor dashboard" : undefined}
              >
                <HomeIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Direktor dashboard</span>}
              </Link>
              <Link 
                href="/dashboard/director/visits" 
                className={getLinkClass("/dashboard/director/visits")}
                onClick={handleLinkClick}
                title={collapsed ? "Planiranje posjeta" : undefined}
              >
                <UsersIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Planirane posjete</span>}
              </Link>
            </>
          )}

          {role === "ADMIN" && (
            <>
              <Link 
                href="/dashboard/admin" 
                className={getLinkClass("/dashboard/admin")}
                onClick={handleLinkClick}
                title={collapsed ? "Admin panel" : undefined}
              >
                <HomeIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Admin panel</span>}
              </Link>

              <Link 
                href="/dashboard/admin/users" 
                className={getLinkClass("/dashboard/admin/users")}
                onClick={handleLinkClick}
                title={collapsed ? "Korisnici" : undefined}
              >
                <UsersIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Korisnici</span>}
              </Link>

              <Link 
                href="/dashboard/admin/brands" 
                className={getLinkClass("/dashboard/admin/brands")}
                onClick={handleLinkClick}
                title={collapsed ? "Brendovi" : undefined}
              >
                <CubeIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Brendovi</span>}
              </Link>

              <Link 
                href="/dashboard/admin/products" 
                className={getLinkClass("/dashboard/admin/products")}
                onClick={handleLinkClick}
                title={collapsed ? "Proizvodi" : undefined}
              >
                <CubeIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Proizvodi</span>}
              </Link>

              <Link 
                href="/dashboard/admin/clients" 
                className={getLinkClass("/dashboard/admin/clients")}
                onClick={handleLinkClick}
                title={collapsed ? "Klijenti" : undefined}
              >
                <UsersIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Klijenti</span>}
              </Link>

              <Link 
                href="/dashboard/admin/audit-logs" 
                className={getLinkClass("/dashboard/admin/audit-logs")}
                onClick={handleLinkClick}
                title={collapsed ? "Audit log" : undefined}
              >
                <ClipboardDocumentListIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">Audit log</span>}
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Logout button */}
      {session && (
        <div className="p-4 border-t border-slate-800 flex-shrink-0 space-y-2">
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="flex w-full items-center gap-2 py-2 px-2 rounded hover:bg-slate-800 transition text-sm text-slate-300 hover:text-white"
              title={collapsed ? "Proširi meni" : "Suzi meni"}
            >
              {collapsed ? (
                <ChevronRightIcon className="w-5 h-5 flex-shrink-0" />
              ) : (
                <ChevronLeftIcon className="w-5 h-5 flex-shrink-0" />
              )}
              {!collapsed && <span className="truncate">Suzi meni</span>}
            </button>
          )}
          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-2 py-2 px-2 rounded hover:bg-slate-800 transition text-sm text-slate-300 hover:text-white ${
              collapsed ? "justify-center" : ""
            }`}
            title={collapsed ? "Odjavi se" : undefined}
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="truncate">Odjavi se</span>}
          </button>
        </div>
      )}
    </aside>
  );
}
