"use client";

import type { AnalyticsDailyPoint } from "@/lib/api";
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

function formatTick(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Intl.DateTimeFormat("es-AR", {
    month: "short",
    day: "numeric",
  }).format(new Date(y, m - 1, d));
}

export function AnalyticsVisitsOrdersChart({ data }: { data: AnalyticsDailyPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-zinc-500">No hay datos en este período.</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="vxFillVisits" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22C55E" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="vxFillOrders" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a3441" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatTick}
          stroke="#71717a"
          tick={{ fill: "#a1a1aa", fontSize: 11 }}
          axisLine={{ stroke: "#3f3f46" }}
          interval="preserveStartEnd"
          minTickGap={28}
        />
        <YAxis
          stroke="#71717a"
          tick={{ fill: "#a1a1aa", fontSize: 11 }}
          axisLine={{ stroke: "#3f3f46" }}
          allowDecimals={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: "12px",
            color: "#fafafa",
          }}
          labelStyle={{ color: "#a1a1aa" }}
          formatter={(value, name) => [
            typeof value === "number" ? value : String(value ?? ""),
            name === "visits" ? "Visitas" : "Pedidos",
          ]}
          labelFormatter={(label) => label}
        />
        <Legend
          wrapperStyle={{ paddingTop: 16 }}
          formatter={(value) => (value === "visits" ? "Visitas" : "Pedidos")}
        />
        <Area
          type="monotone"
          dataKey="visits"
          name="visits"
          stroke="#22C55E"
          strokeWidth={2}
          fill="url(#vxFillVisits)"
        />
        <Area
          type="monotone"
          dataKey="orders"
          name="orders"
          stroke="#3B82F6"
          strokeWidth={2}
          fill="url(#vxFillOrders)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
