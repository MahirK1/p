import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedRoutes = [
  "/dashboard",
  "/dashboard/commercial",
  "/dashboard/manager",
  "/dashboard/order-manager",
  "/dashboard/admin",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  if (!isProtected) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string;

  if (pathname.startsWith("/dashboard/commercial") && !["COMMERCIAL", "ADMIN"].includes(role)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (pathname.startsWith("/dashboard/manager") && !["MANAGER", "ADMIN"].includes(role)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (pathname.startsWith("/dashboard/order-manager") && !["ORDER_MANAGER", "ADMIN"].includes(role)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  // Dozvoli order_manageru pristup ruti za pregled klijenta
  if (pathname.startsWith("/dashboard/admin/clients/") && !["ADMIN", "ORDER_MANAGER"].includes(role)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};