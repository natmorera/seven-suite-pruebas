"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useDashboard } from "@/lib/dashboard-context";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { SectionTitle, ChartScroll } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";

export function NetIncomeTrend() {
  const { data, comparing } = useDashboard();
  const { netIncomeTrend, currency } = data;

  return (
    <section className="bg-white rounded-[10px] border border-neutral-500 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SectionTitle>Tendencia de Utilidad Neta</SectionTitle>
        <span className="text-muted text-neutral-700 whitespace-nowrap">
          Barras = utilidad neta · Línea = margen %
        </span>
      </div>

      {netIncomeTrend.length === 0 ? (
        <EmptyState message="Sin historial de utilidad para mostrar." />
      ) : (
        <ChartScroll>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={netIncomeTrend}>
                <CartesianGrid vertical={false} stroke="var(--color-neutral-500)" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--color-neutral-700)" }}
                />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCurrencyCompact(v, currency)}
                  tick={{ fontSize: 11, fill: "var(--color-neutral-700)" }}
                  width={44}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: "var(--color-neutral-700)" }}
                  width={36}
                />
                <Tooltip
                  formatter={(v, name) => {
                    if (name === "margin") return [`${v}%`, "Margen"];
                    if (name === "utilidadAnterior") return [formatCurrency(Number(v), currency), "Periodo anterior"];
                    return [formatCurrency(Number(v), currency), "Utilidad Neta"];
                  }}
                />
                {comparing && (
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "var(--color-neutral-700)" }} />
                )}
                <Bar
                  yAxisId="left"
                  dataKey="utilidad"
                  name="Utilidad Neta"
                  fill="var(--color-chart-primary)"
                  radius={[3, 3, 0, 0]}
                  barSize={comparing ? 16 : 32}
                />
                {comparing && (
                  <Bar
                    yAxisId="left"
                    dataKey="utilidadAnterior"
                    name="Periodo anterior"
                    fill="var(--color-chart-muted)"
                    radius={[3, 3, 0, 0]}
                    barSize={16}
                  />
                )}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="margin"
                  name="margin"
                  stroke="var(--color-chart-navy)"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: "var(--color-chart-navy)" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartScroll>
      )}
    </section>
  );
}
