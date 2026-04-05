"use client";

import { Ban, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminBanUser, adminUnbanUser } from "@/lib/actions/user-management";

export default function BanUserDialog({
  userId,
  userName,
  isBanned,
}: {
  userId: string;
  userName: string;
  isBanned: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleBan() {
    setLoading(true);
    try {
      const result = await adminBanUser(userId, reason || undefined);
      if (result.success) {
        toast.success(`${userName} har blockerats`);
        setOpen(false);
        setReason("");
        router.refresh();
      } else {
        toast.error("Kunde inte blockera", { description: result.error });
      }
    } catch {
      toast.error("Ett oväntat fel inträffade");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnban() {
    setLoading(true);
    try {
      const result = await adminUnbanUser(userId);
      if (result.success) {
        toast.success(`${userName} har avblockerats`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Kunde inte avblockera", { description: result.error });
      }
    } catch {
      toast.error("Ett oväntat fel inträffade");
    } finally {
      setLoading(false);
    }
  }

  if (isBanned) {
    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" title="Avblockera">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-h-[90dvh] overflow-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Avblockera {userName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Användaren kommer kunna logga in igen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <Button onClick={handleUnban} disabled={loading}>
              {loading ? "Avblockerar..." : "Avblockera"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Blockera">
          <Ban className="h-4 w-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[90dvh] overflow-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Blockera {userName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Användaren kommer loggas ut och kan inte logga in igen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="ban-reason">Anledning (valfritt)</Label>
          <Input
            id="ban-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ange anledning..."
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <Button variant="destructive" onClick={handleBan} disabled={loading}>
            {loading ? "Blockerar..." : "Blockera"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
