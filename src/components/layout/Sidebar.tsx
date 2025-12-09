"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  CubeIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { PushNotificationButton } from "@/components/ui/PushNotificationButton";

type SidebarProps = {
  onLinkClick?: () => void;
};

export function Sidebar({ onLinkClick }: SidebarProps = {}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = (session?.user as any)?.role;
  const userName = (session?.user as any)?.name;

  const getLinkClass = (href: string) => {
    const isActive = pathname === href || pathname.startsWith(href + "/");
    return `flex items-center gap-2 py-2 px-2 rounded transition ${
      isActive
        ? "bg-slate-800 text-white font-medium"
        : "hover:bg-slate-800 text-slate-300"
    }`;
  };

  // Handler koji se poziva kada se klikne na link
  const handleLinkClick = () => {
    if (onLinkClick) {
      onLinkClick();
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login", redirect: true });
  };

  return (
    <aside className="flex flex-col h-screen w-64 bg-slate-900 text-white fixed md:fixed md:top-0 md:left-0 md:z-10">
      <div className="flex-1 p-4 space-y-4 overflow-y-auto min-h-0">
        {/* Logo */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
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
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">B2B Portal</div>
            <div className="text-xs text-slate-400 truncate">Italgroup</div>
          </div>
        </div>
        
        {session && (
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
              >
                <HomeIcon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Moj dashboard</span>
              </Link>
              <Link 
                href="/dashboard/commercial/clients" 
                className={getLinkClass("/dashboard/commercial/clients")}
                onClick={handleLinkClick}
              >
                <UsersIcon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Klijenti</span>
              </Link>
              <Link 
                href="/dashboard/commercial/orders" 
                className={getLinkClass("/dashboard/commercial/orders")}
                onClick={handleLinkClick}
              >
                <ClipboardDocumentListIcon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Moje narudžbe</span>
              </Link>

              <Link 
                href="/dashboard/commercial/visits" 
                className={getLinkClass("/dashboard/commercial/visits")}
                onClick={handleLinkClick}
              >
                <UsersIcon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Moje posjete</span>
              </Link>

              <Link 
                href="/dashboard/commercial/chat" 
                className={getLinkClass("/dashboard/commercial/chat")}
                onClick={handleLinkClick}
              >
                <ChatBubbleLeftRightIcon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Chat</span>
              </Link>
            </>
          )}

          {role === "MANAGER" && (
            <>
              <Link 
                href="/dashboard/manager" 
                className={getLinkClass("/dashboard/manager")}
                onClick={handleLinkClick}
              >
                <HomeIcon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Manager dashboard</span>
              </Link>

              <Link 
                href="/dashboard/manager/clients" 
                className={getLinkClass("/dashboard/manager/clients")}
                onClick={handleLinkClick}
              >
                <UsersIcon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Klijenti</span>
              </Link>

              <Link 
                href="/dashboard/manager/visits" 
                className={getLinkClass("/dashboard/manager/visits")}
                onClick={handleLinkClick}
              >
                <UsersIcon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Planiranje posjeta</span>
              </Link>

              <Link 
                href="/dashboard/manager/plans" 
                className={getLinkClass("/dashboard/manager/plans")}
                onClick={handleLinkClick}
              >
                <ClipboardDocumentListIcon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Mjesečni planovi</span>
              </Link>

              <Link 
                href="/dashboard/manager/chat" 
                className={getLinkClass("/dashboard/manager/chat")}
                onClick={handleLinkClick}
              >
                <ChatBubbleLeftRightIcon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Chat</span>
              </Link>
            </>
          )}

          {role === "ORDER_MANAGER" && (
            <>
              <Link 
                href="/dashboard/order-manager" 
                className={getLinkClass("/dashboard/order-manager")}
                onClick={handleLinkClick}
              >
                <ClipboardDocumentListIcon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Narudžbe</span>
              </Link>
            </>
          )}

          {role === "ADMIN" && (
            <>
              <Link 
                href="/dashboard/admin" 
                className={getLinkClass("/dashboard/admin")}
                onClick={handleLinkClick}
              >
                <HomeIcon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Admin panel</span>
              </Link>

              <Link 
                href="/dashboard/admin/users" 
                className={getLinkClass("/dashboard/admin/users")}
                onClick={handleLinkClick}
              >
                <UsersIcon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Korisnici</span>
              </Link>

              <Link 
                href="/dashboard/admin/brands" 
                className={getLinkClass("/dashboard/admin/brands")}
                onClick={handleLinkClick}
              >
                <CubeIcon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Brendovi</span>
              </Link>

              <Link 
                href="/dashboard/admin/products" 
                className={getLinkClass("/dashboard/admin/products")}
                onClick={handleLinkClick}
              >
                <CubeIcon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Proizvodi</span>
              </Link>

              <Link 
                href="/dashboard/admin/clients" 
                className={getLinkClass("/dashboard/admin/clients")}
                onClick={handleLinkClick}
              >
                <UsersIcon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Klijenti</span>
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Logout button */}
      {session && (
        <div className="p-4 border-t border-slate-800 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 py-2 px-2 rounded hover:bg-slate-800 transition text-sm text-slate-300 hover:text-white"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Odjavi se</span>
          </button>
        </div>
      )}
    </aside>
  );
}
