"use client";

import { Infinity as Inf, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import type { UserPurchasesForCourse } from "@/lib/actions/admin";

interface Props {
  lessonId: string;
  studentsAndPurchases: UserPurchasesForCourse[];
}

export function AttendenceForm({ lessonId, studentsAndPurchases }: Props) {
  return (
    <div>
      {studentsAndPurchases.map((s) => (
        <Item key={s.id}>
          <ItemMedia variant="icon">
            <UserIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{s.name}</ItemTitle>

            {s.purchases.map((p) => (
              <div key={p.id}>
                {p.product.name}{" "}
                {p.participant && <span> ({p.participant.name})</span>}:<br />
                {p.PurchaseItems.map((itm) => (
                  <div key={itm.id}>
                    {itm.course.name}{" "}
                    {itm.unlimited ? (
                      <Inf />
                    ) : (
                      <span>
                        {
                          itm.remainingCount /* Vi behöver ha en hjälparfunktion för att få reaining beroende på typ */
                        }
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </ItemContent>
          <ItemActions>
            <Button id={lessonId}>Action</Button>
          </ItemActions>
        </Item>
      ))}
    </div>
  );
}
