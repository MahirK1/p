import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/authOptions";

export default async function DashboardRootPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!role) redirect("/login");

  if (role === "COMMERCIAL") redirect("/dashboard/commercial");
  if (role === "MANAGER") redirect("/dashboard/manager");
  if (role === "ORDER_MANAGER") redirect("/dashboard/order-manager");
  if (role === "DIRECTOR") redirect("/dashboard/director");
  if (role === "ADMIN") redirect("/dashboard/admin");

  redirect("/login");
}