"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList, ReferenceLine } from "recharts";
import { useDashboard } from "@/lib/dashboard-context";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { SectionTitle, ChartScroll } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";

type Row = {
  name: string;
  display: number;
  kind: "total" | "increase" | "decrease";
};

function buildRows(items: { name: string; value: number; type: "total" | "delta" }[]): Row[] {
  return items.map((item) => ({
    name: item.name,
    display: item.value,
    kind: item.type === "total" ? "total" : item.value >= 0 ? "increase" : "decrease",
  }));
}

const COLOR = {
  total: "var(--color-chart-primary)",
  increase: "var(--color-success)",
  decrease: "var(--color-chart-secondary)",
};

export function PLBridge() {
  const { data } = useDashboard();
  const { currency } = data;
  const rows = buildRows(data.plBridge);

  return (
    <section className="bg-white rounded-[10px] border border-neutral-500 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <SectionTitle>P&amp;L Bridge · Jul 2026</SectionTitle>
        <span className="text-muted text-neutral-700 whitespace-nowrap">
          Ingresos, Costo de Ventas, Gastos Operativos y Utilidad Neta
        </span>
      </div>

      {rows.length > 0 && (
        <div className="flex items-center gap-4 mt-2">
          <span className="flex items-center gap-1.5 text-muted text-neutral-700">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLOR.total }} /> Total
          </span>
          <span className="flex items-center gap-1.5 text-muted text-neutral-700">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLOR.decrease }} /> Disminuye
          </span>
          <span className="flex items-center gap-1.5 text-muted text-neutral-700">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLOR.increase }} /> Aumenta
          </span>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState message="Sin datos suficientes para construir el P&L." />
      ) : (
        <ChartScroll>
          <div className="h-60 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="var(--color-neutral-500)" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "var(--color-neutral-700)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCurrencyCompact(v, currency)}
                  tick={{ fontSize: 11, fill: "var(--color-neutral-700)" }}
                  width={48}
                />
                <ReferenceLine y={0} stroke="var(--color-neutral-700)" />
                <Bar dataKey="display" radius={[3, 3, 3, 3]}>
                  {rows.map((r) => (
                    <Cell key={r.name} fill={COLOR[r.kind]} />
                  ))}
                  <LabelList
                    dataKey="display"
                    position="top"
                    formatter={(v: React.ReactNode) => formatCurrency(Number(v), currency)}
                    style={{ fontSize: 11, fontWeight: 600, fill: "var(--color-neutral-900)" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartScroll>
      )}

      <p className="text-muted text-neutral-700 mt-3 leading-relaxed">
        Todas las barras parten de {formatCurrencyCompact(0, currency)}. Los totales (Ingresos, Utilidad Bruta,
        Utilidad Neta) van hacia arriba; los rubros que restan (Costo de Ventas, Gastos Operativos) se muestran como
        valores negativos hacia abajo.
      </p>
    </section>
  );
}
