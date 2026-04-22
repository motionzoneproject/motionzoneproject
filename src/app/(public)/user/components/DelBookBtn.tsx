"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Loader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { delBooking } from "@/lib/actions/server-actions";

interface Props {
  lId: string;
  pId: string;
}

export function DelBookBtn({ lId, pId }: Props) {
  const [loading, setloading] = useState<boolean>(false);

  return (
    <div>
      {!loading ? (
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
          type="button"
          onClick={async () => {
            setloading(true);
            const del = await delBooking(lId, pId);

            if (del.success) {
              toast.success(del.msg);
            } else {
              toast.error(
                `Något gick fel, kunde inte ta bort bokning. ${del.msg}`,
              );
            }

            setloading(false);
          }}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">x</span>
        </Button>
      ) : (
        <Loader small={true} />
      )}
    </div>
  );
}
