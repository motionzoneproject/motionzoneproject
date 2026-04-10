"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTerminsStats, type TerminStats } from "@/lib/actions/admin-stats";
import { formatPrice } from "@/lib/money";
import { StatsChart } from "./StatsChart";
import { StatsFilter } from "./StatsFilter";

type TerminOption = {
  id: string;
  name: string;
};

type Props = {
  terminer: TerminOption[];
  initialStats: TerminStats;
};

function formatDate(date: string | null) {
  return date ? new Date(date).toLocaleDateString("sv-SE") : "Ej satt";
}

function getDefaultDateRange() {
  const today = new Date();

  const from = new Date(today);
  from.setDate(today.getDate() - 30);

  const to = new Date(today);
  to.setDate(today.getDate() + 30);

  const format = (d: Date) => d.toISOString().split("T")[0];

  return {
    from: format(from),
    to: format(to),
  };
}

export function StatsClient({ terminer, initialStats }: Props) {
  const defaultRange = getDefaultDateRange();

  const [stats, setStats] = useState(initialStats);
  const [selectedTerminId, setSelectedTerminId] = useState("all");
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);

  const [isPending, startTransition] = useTransition();

  const fetchStats = useCallback(
    (terminId: string, from: string, to: string) => {
      startTransition(async () => {
        try {
          const nextStats = await getTerminsStats(
            terminId === "all" ? null : terminId,
            from || null,
            to || null,
          );

          setStats(nextStats);
        } catch {
          toast.error("Kunde inte hämta statistik.");
        }
      });
    },
    [],
  );

  useEffect(() => {
    if (selectedTerminId === "all" && Boolean(fromDate) !== Boolean(toDate)) {
      return;
    }

    fetchStats(selectedTerminId, fromDate, toDate);
  }, [selectedTerminId, fromDate, toDate, fetchStats]);

  const handleTerminChange = (value: string) => {
    setSelectedTerminId(value);

    if (value !== "all") {
      setFromDate("");
      setToDate("");
    } else {
      const range = getDefaultDateRange();
      setFromDate(range.from);
      setToDate(range.to);
    }
  };

  const handleDateFilterChange = (name: string, value: string) => {
    setSelectedTerminId("all");

    if (name === "from") {
      setFromDate(value);
    }

    if (name === "to") {
      setToDate(value);
    }
  };

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {stats.selectedPeriod ? stats.selectedPeriod.name : "Alla terminer"}
          </Badge>

          {isPending && (
            <span className="text-sm text-muted-foreground">Uppdaterar...</span>
          )}
        </div>
      </div>

      <StatsFilter
        terminer={terminer}
        value={selectedTerminId}
        from={fromDate}
        to={toDate}
        disabled={isPending}
        onValueChange={handleTerminChange}
        onDateFilterChange={handleDateFilterChange}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>Ordrar</CardDescription>
            <CardTitle className="text-3xl">
              {stats.overview.orderCount}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="gap-1">
            <CardDescription>Intäkter</CardDescription>
            <CardTitle className="text-3xl">
              {formatPrice(stats.overview.totalIncome)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="gap-1">
            <CardDescription>Antal nya elever</CardDescription>
            <CardTitle className="text-3xl">
              {stats.overview.activeStudents}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="gap-1">
            <CardDescription>Bokningar</CardDescription>
            <CardTitle className="text-3xl">
              {stats.overview.bookingCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <StatsChart timeline={stats.timeline} disabled={isPending} />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Produktförsäljning</CardTitle>
            <CardDescription>
              {stats.overview.soldProducts} skapade produkter i perioden,
              fördelat på {stats.products.length} produkter.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isPending ? (
              <Skeleton className="h-48 w-full" />
            ) : stats.products.length === 0 ? (
              <div className="text-sm text-muted-foreground italic">
                Inga produkter matchar valt filter.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produkt</TableHead>
                    <TableHead className="text-right">Skapade</TableHead>
                    <TableHead className="text-right">Reserverade</TableHead>
                    <TableHead className="text-right">Intäkt</TableHead>
                    <TableHead
                      className={
                        selectedTerminId === "all"
                          ? "hidden"
                          : "" + " text-right"
                      }
                    >
                      Platser kvar (nu)
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {stats.products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium whitespace-normal">
                        {product.name}
                      </TableCell>

                      <TableCell className="text-right">
                        {product.sold}
                      </TableCell>

                      <TableCell className="text-right">
                        {product.reserved}
                      </TableCell>

                      <TableCell className="text-right">
                        {formatPrice(product.income)}
                      </TableCell>

                      <TableCell
                        className={
                          selectedTerminId === "all"
                            ? "hidden"
                            : "" + " text-right"
                        }
                      >
                        {product.unlimitedCustomers
                          ? "∞"
                          : (product.spotsLeft ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Kursöversikt</CardTitle>
            <CardDescription>
              {stats.overview.courseCount} kurser har lektioner i vald period.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isPending ? (
              <Skeleton className="h-48 w-full" />
            ) : stats.courses.length === 0 ? (
              <div className="text-sm text-muted-foreground italic">
                Inga kurser matchar valt filter.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kurs</TableHead>
                    <TableHead className="text-right">
                      Antal nya elever
                    </TableHead>
                    <TableHead className="text-right">
                      Antal bokningar
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {stats.courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="max-w-[260px] whitespace-normal">
                        <div className="font-medium">{course.name}</div>

                        <div className="text-xs text-muted-foreground">
                          {formatDate(course.periodStart)} -{" "}
                          {formatDate(course.periodEnd)}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        {course.studentCount}
                      </TableCell>

                      <TableCell className="text-right">
                        {course.bookingCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
