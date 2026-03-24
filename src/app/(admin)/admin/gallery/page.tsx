import { redirect } from "next/navigation";

// Redirect to page 1 path route for consistent pagination handling
export default function Page() {
  redirect("/admin/gallery/1");
}
