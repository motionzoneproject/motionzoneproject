"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { AccountUser } from "@/lib/actions/accounts";

interface UserDetailsDialogProps {
  user: AccountUser;
}

function Field({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">
        {value || <span className="text-muted-foreground italic">—</span>}
      </p>
    </div>
  );
}

export function UserDetailsDialog({ user }: UserDetailsDialogProps) {
  const d = user.details;

  const fullAddress = [d?.address, d?.postalCode, d?.city]
    .filter(Boolean)
    .join(", ");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Användaruppgifter
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Kontouppgifter</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Roll"
                value={user.role === "admin" ? "Admin" : "Användare"}
              />
              <Field
                label="Skapad"
                value={user.createdAt.toLocaleDateString("sv-SE")}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Personuppgifter</h3>
            {!d ? (
              <p className="text-sm text-muted-foreground italic">
                Inga uppgifter registrerade.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Förnamn" value={d.firstName ?? undefined} />
                <Field label="Efternamn" value={d.lastName ?? undefined} />
                <Field label="Telefon" value={d.phoneNumber ?? undefined} />
                <Field
                  label="Född"
                  value={
                    d.dateOfBirth
                      ? d.dateOfBirth.toLocaleDateString("sv-SE")
                      : undefined
                  }
                />
                <div className="col-span-2">
                  <Field label="Adress" value={fullAddress || undefined} />
                </div>
                {d.bio && (
                  <div className="col-span-2">
                    <Field label="Bio" value={d.bio} />
                  </div>
                )}
                <div className="col-span-2">
                  <Field
                    label="Foto/video tillåtet"
                    value={d.allowPhotoVideo ? "Ja" : "Nej"}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
