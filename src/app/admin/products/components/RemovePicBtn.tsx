"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function RemovePicBtn({ url }: { url: string }) {
  async function onSub() {
    try {
      const res = await fetch("/api/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Remove failed");
      console.log(JSON.stringify(data));
      toast("Bild borttagen", data);
    } catch (err) {
      toast(String(err));
    }
  }

  return (
    <form action={onSub}>
      <Button type="submit">Remove pic</Button>
    </form>
  );
}
