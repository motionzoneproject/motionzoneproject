"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StatsTimelinePoint } from "@/lib/actions/admin-stats";
import { formatPrice, oreToSek } from "@/lib/money";

type Granularity = "day" | "week" | "month";

type Props = {
  timeline: StatsTimelinePoint[];
  disabled?: boolean;
};

type AggregatedPoint = {
  bucket: string;
  label: string;
  fullLabel: string;
  income: number;
  orders: number;
  bookings: number;
};

const chartConfig = {
  income: {
    label: "Intäkt",
    color: "var(--chart-1)",
  },
  orders: {
    label: "Ordrar",
    color: "var(--chart-2)",
  },
  bookings: {
    label: "Bokningar",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

function parseDayKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDayKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getWeekStart(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const weekday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - weekday);
  return start;
}

function getWeekEnd(weekStart: Date) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return end;
}

function getMonthStart(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function formatAxisLabel(date: Date, granularity: Granularity) {
  if (granularity === "month") {
    return new Intl.DateTimeFormat("sv-SE", {
      month: "short",
      year: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatFullLabel(date: Date, granularity: Granularity) {
  if (granularity === "day") {
    return new Intl.DateTimeFormat("sv-SE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  }

  if (granularity === "week") {
    const weekEnd = getWeekEnd(date);
    return `${new Intl.DateTimeFormat("sv-SE", {
      day: "numeric",
      month: "long",
    }).format(date)} - ${new Intl.DateTimeFormat("sv-SE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(weekEnd)}`;
  }

  return new Intl.DateTimeFormat("sv-SE", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getBucketStart(date: Date, granularity: Granularity) {
  if (granularity === "week") return getWeekStart(date);
  if (granularity === "month") return getMonthStart(date);
  return date;
}

function aggregateTimeline(
  timeline: StatsTimelinePoint[],
  granularity: Granularity,
): AggregatedPoint[] {
  const grouped = new Map<string, AggregatedPoint>();

  for (const point of timeline) {
    const date = parseDayKey(point.date);
    const bucketDate = getBucketStart(date, granularity);
    const bucketKey = toDayKey(bucketDate);

    const existing = grouped.get(bucketKey) ?? {
      bucket: bucketKey,
      label: formatAxisLabel(bucketDate, granularity),
      fullLabel: formatFullLabel(bucketDate, granularity),
      income: 0,
      orders: 0,
      bookings: 0,
    };

    existing.income += point.income;
    existing.orders += point.orders;
    existing.bookings += point.bookings;

    grouped.set(bucketKey, existing);
  }

  return Array.from(grouped.values()).sort((a, b) =>
    a.bucket.localeCompare(b.bucket),
  );
}

function formatCurrencyTick(value: number) {
  const sek = oreToSek(value);

  if (sek >= 1000) {
    return `${new Intl.NumberFormat("sv-SE", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(sek)} kr`;
  }

  return formatPrice(value);
}

function formatCountTick(value: number) {
  return value.toLocaleString("sv-SE");
}

export function StatsChart({ timeline, disabled = false }: Props) {
  const [granularity, setGranularity] = useState<Granularity>("month");

  const data = useMemo(
    () => aggregateTimeline(timeline, granularity),
    [timeline, granularity],
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Utveckling över tid</CardTitle>
          <CardDescription>
            Intäkter, ordrar och bokningar grupperade per{" "}
            {granularity === "day"
              ? "dag"
              : granularity === "week"
                ? "vecka"
                : "månad"}
            .
          </CardDescription>
        </div>

        <Select
          value={granularity}
          onValueChange={(value) => setGranularity(value as Granularity)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Välj upplösning" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Dag</SelectItem>
            <SelectItem value="week">Vecka</SelectItem>
            <SelectItem value="month">Månad</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">
            Ingen tidsserie finns för valt filter.
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="h-[260px] min-h-[260px] w-full aspect-auto"
          >
            <ComposedChart accessibilityLayer data={data}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
              />
              <YAxis
                yAxisId="income"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatCurrencyTick}
              />
              <YAxis
                yAxisId="counts"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatCountTick}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_label, payload) =>
                      payload?.[0]?.payload?.fullLabel ?? ""
                    }
                    formatter={(value, name) => (
                      <div className="flex min-w-[140px] items-center justify-between gap-4">
                        <span>
                          {chartConfig[name as keyof typeof chartConfig]
                            ?.label ?? name}
                        </span>
                        <span className="font-mono font-medium text-foreground">
                          {name === "income"
                            ? formatPrice(Number(value))
                            : Number(value).toLocaleString("sv-SE")}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                yAxisId="income"
                dataKey="income"
                fill="var(--color-income)"
                radius={[6, 6, 0, 0]}
              />
              <Line
                yAxisId="counts"
                type="monotone"
                dataKey="orders"
                stroke="var(--color-orders)"
                strokeWidth={2}
                dot={false}
              />
              {/* Bokningar stämmer ej, ev fix. <Line
                yAxisId="counts"
                type="monotone"
                dataKey="bookings"
                stroke="var(--color-bookings)"
                strokeWidth={2}
                dot={false}
              /> */}
            </ComposedChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
