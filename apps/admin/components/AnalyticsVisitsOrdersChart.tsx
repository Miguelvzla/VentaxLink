"use client";

import type { AnalyticsDailyPoint } from "@/lib/api";
import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type AnalyticsChartTheme = "light" | "dark";

function formatTick(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Intl.DateTimeFormat("es-AR", {
    month: "short",
    day: "numeric",
  }).format(new Date(y, m - 1, d));
}

export function AnalyticsVisitsOrdersChart({
  data,
  theme = "dark",
}: {
  data: AnalyticsDailyPoint[];
  theme?: AnalyticsChartTheme;
}) {
  const uid = useId().replace(/:/g, "");
  const gidV = `vxFillVisits-${uid}`;
  const gidO = `vxFillOrders-${uid}`;
  const L = theme === "light";

  if (data.length === 0) {
    return (
      <p className={`py-16 text-center text-sm ${L ? "text-[#6B7280]" : "text-zinc-500"}`}>
        No hay datos en este período.
      </p>
    );
  }

  const gridStroke = L ? "#e5e7eb" : "#2a3441";
  const axisStroke = L ? "#9ca3af" : "#71717a";
  const tickFill = L ? "#4b5563" : "#a1a1aa";
  const axisLine = L ? "#d1d5db" : "#3f3f46";
  const tooltipBg = L ? "#ffffff" : "#18181b";
  const tooltipBorder = L ? "#e5e7eb" : "#3f3f46";
  const tooltipColor = L ? "#111827" : "#fafafa";
  const tooltipLabel = L ? "#6b7280" : "#a1a1aa";

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id={gidV} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22C55E" stopOpacity={L ? 0.2 : 0.35} />
            <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={gidO} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity={L ? 0.2 : 0.35} />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatTick}
          stroke={axisStroke}
          tick={{ fill: tickFill, fontSize: 11 }}
          axisLine={{ stroke: axisLine }}
          interval="preserveStartEnd"
          minTickGap={28}
        />
        <YAxis
          stroke={axisStroke}
          tick={{ fill: tickFill, fontSize: 11 }}
          axisLine={{ stroke: axisLine }}
          allowDecimals={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: "12px",
            color: tooltipColor,
          }}
          labelStyle={{ color: tooltipLabel }}
          formatter={(value, name) => [
            typeof value === "number" ? value : String(value ?? ""),
            name === "visits" ? "Visitas" : "Pedidos",
          ]}
          labelFormatter={(label) => label}
        />
        <Legend
          wrapperStyle={{ paddingTop: 16, color: L ? "#374151" : "#d4d4d8" }}
          formatter={(value) => (value === "visits" ? "Visitas" : "Pedidos")}
        />
        <Area
          type="monotone"
          dataKey="visits"
          name="visits"
          stroke="#22C55E"
          strokeWidth={2}
          fill={`url(#${gidV})`}
        />
        <Area
          type="monotone"
          dataKey="orders"
          name="orders"
          stroke="#3B82F6"
          strokeWidth={2}
          fill={`url(#${gidO})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
