import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Termin } from "@/generated/prisma/client";
import { getSchemaItems } from "@/lib/actions/admin";
import Schema from "./Schema";

interface Props {
  termin: Termin;
}

export default async function TerminItem({ termin }: Props) {
  const schemaItems = await getSchemaItems(termin.id);

  return (
    <div className="p-2 border rounded">
      <Card>
        <CardHeader>
          <CardTitle>{termin.name}</CardTitle>
        </CardHeader>

        <CardContent>
          <CardDescription>
            Start: {termin.startDate.toLocaleDateString()}
            <br />
            Slut: {termin.endDate.toLocaleDateString()}
          </CardDescription>
          <CardAction>
            <Button variant={"default"}>Ändra</Button>
          </CardAction>
          <span className="font-bold">Veckoschema:</span>
          <br />
          <Schema schemaItems={schemaItems} />
        </CardContent>
      </Card>
    </div>
  );
}
