import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAllGalleryItems } from "@/lib/actions/gallery";
import AddGalleryItemBtn from "./components/AddGalleryItemBtn";
import DeleteGalleryItemBtn from "./components/DeleteGalleryItemBtn";
import ToggleActiveBtn from "./components/ToggleActiveBtn";

/* OBS VIBEKODAD FÖR ATT TESTA VIDEOUPPLADDNINGEN 
   Integrera med riktiga galleriet senare!!! */

export default async function AdminVideoGalleryPage() {
  const items = await getAllGalleryItems();

  return (
    <div className="p-4 w-full mt-8 gap-4">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold ml-4">Videogalleri</h1>
        <AddGalleryItemBtn />
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Inga videor än. Lägg till din första video!
        </p>
      ) : (
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Ordning</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Förhandsvisning</TableHead>
              <TableHead>Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>
                  <Badge variant="outline">{item.type}</Badge>
                </TableCell>
                <TableCell>{item.displayOrder}</TableCell>
                <TableCell>
                  <Badge variant={item.active ? "default" : "secondary"}>
                    {item.active ? "Synlig" : "Dold"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {item.type === "VIDEO" ? (
                    <video
                      src={item.url}
                      className="w-32 rounded"
                      preload="metadata"
                      muted
                    >
                      <track kind="captions" />
                    </video>
                  ) : (
                    <Image
                      src={item.url}
                      alt={item.title}
                      width={128}
                      height={72}
                      className="w-32 rounded object-cover"
                    />
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <ToggleActiveBtn id={item.id} active={item.active} />
                    <DeleteGalleryItemBtn id={item.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
