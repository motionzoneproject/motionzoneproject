"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Style } from "@/generated/prisma/client";

interface DansStilarProps {
  styles: Style[];
}

const DansStilar = ({ styles }: DansStilarProps) => {
  const danceStyles = styles.filter((style) => style.active);

  if (danceStyles.length === 0) return null;

  return (
    <section
      className="py-10 relative overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-brand/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-brand-secondary/5 blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <h2 className="text-2xl font-bold mb-8 text-center text-foreground">
          Dansstilar
        </h2>

        <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-4">
          {danceStyles.map((style) => (
            <Dialog key={style.id}>
              <DialogTrigger>
                <div className="w-[180px] cursor-pointer rounded-xl border border-border p-3 text-center text-lg font-semibold text-foreground transition-colors hover:border-brand/50">
                  {style.imageUrl && (
                    <Image
                      src={style.imageUrl}
                      alt={style.name}
                      height={150}
                      width={150}
                      className="w-50 h-50 rounded-lg object-cover mt-2"
                    />
                  )}
                  <h3>{style.name}</h3>
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{style.name}</DialogTitle>
                  <DialogDescription className="text-base mt-2 whitespace-pre-wrap">
                    {style.description}
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DansStilar;
