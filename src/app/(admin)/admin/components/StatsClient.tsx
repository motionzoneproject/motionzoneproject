"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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

export function StatsClient({ terminer, initialStats }: Props) {
  const [stats, setStats] = useState(initialStats);
  const [selectedTerminId, setSelectedTerminId] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasMounted = useRef(false);

  const fetchStats = useCallback(
    (nextTerminId: string, nextFrom: string, nextTo: string) => {
      startTransition(async () => {
        try {
          const nextStats = await getTerminsStats(
            nextTerminId === "all" ? null : nextTerminId,
            nextFrom || null,
            nextTo || null,
          );

          setStats(nextStats);
        } catch (_error) {
          toast.error("Kunde inte hämta statistik.");
        }
      });
    },
    [],
  );

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

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
    }
  };

  const handleDateFilterChange = (name: string, value: string) => {
    if (name === "from") {
      setFromDate(value);
      return;
    }

    if (name === "to") {
      setToDate(value);
    }
  };

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Statistik</h2>
          <Badge variant="outline">
            {stats.selectedPeriod ? stats.selectedPeriod.name : "Alla terminer"}
          </Badge>
          {isPending && (
            <span className="text-sm text-muted-foreground">Uppdaterar...</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {stats.selectedPeriod
            ? `Period ${formatDate(stats.selectedPeriod.from)} - ${formatDate(stats.selectedPeriod.to)}`
            : "Visar samlad statistik för hela verksamheten."}
        </p>
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
            <CardDescription>Aktiva elever</CardDescription>
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
              {stats.overview.soldProducts} skapade produkter fördelat på{" "}
              {stats.products.length} produkter.
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
                    <TableHead className="text-right">Platser kvar</TableHead>
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
                      <TableCell className="text-right">
                        {product.unlimitedCustomers
                          ? "Obegränsat"
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
              {stats.overview.courseCount} kurser och{" "}
              {stats.overview.customerCount} kunder i urvalet.
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
                    <TableHead>Lärare</TableHead>
                    <TableHead className="text-right">Elever</TableHead>
                    <TableHead className="text-right">Bokningar</TableHead>
                    <TableHead className="text-right">Produkter</TableHead>
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
                      <TableCell>{course.teacherName}</TableCell>
                      <TableCell className="text-right">
                        {course.studentCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {course.bookingCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {course.linkedProducts}
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
