import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getTermin } from "@/lib/actions/admin";
import AddTerminForm from "./forms/AddTerminForm";
import TerminItem from "./TerminItem";

export default async function Page() {
  const terminer = await getTermin();

  return (
    <div>
      <div className="w-full md:grid md:grid-cols-2 gap-2 p-2">
        <div className="col-span-2 border rounded p-2 flex gap-2">
          <div>
            <span className="font-bold text-2xl">Terminer / scheman</span>
          </div>
          <div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant={"default"} className="bg-green-500">
                  Ny termin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Skapa en ny termin</DialogTitle>
                  <DialogDescription>
                    Ange terminens namn och vilka datum terminen har.
                  </DialogDescription>
                </DialogHeader>

                <AddTerminForm />

                <DialogFooter className="sm:justify-start">
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Close
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <br />
        </div>
        {terminer.map((t) => (
          <TerminItem termin={t} key={t.id}></TerminItem>
        ))}
      </div>
    </div>
  );
}
