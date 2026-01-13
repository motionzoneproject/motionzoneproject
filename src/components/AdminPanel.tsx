import { notFound } from "next/navigation";
import { isAdminRole } from "@/lib/actions/admin";
import AdminNav from "./AdminNav";

export default async function AdminPanel() {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return notFound(); // This stops all adminpages to be rendered since its on the layout for admin.

  return (
    <nav className="bg-card p-2 border-b border-border shadow-sm">
      <AdminNav />
    </nav>
  );
}
