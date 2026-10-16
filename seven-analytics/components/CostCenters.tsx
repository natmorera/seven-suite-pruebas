"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useDashboard } from "@/lib/dashboard-context";
import { formatCurrency, formatCurrencyCompact, formatPct } from "@/lib/format";
import { SectionTitle, ChartScroll } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";

export function CostCenters() {
  const { data, comparing } = useDashboard();
  const { costCenters, currency } = data;
  const totalCosto = costCenters.reduce((s, c) => s + c.costo, 0);

  return (
    <section className="bg-white rounded-[10px] border border-neutral-500 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SectionTitle>Centros de Costo</SectionTitle>
        <span className="text-muted text-neutral-700 whitespace-nowrap">Julio 2026</span>
      </div>

      {costCenters.length === 0 ? (
        <EmptyState message="Sin centros de costo registrados." />
      ) : (
        <>
          <ChartScroll>
            <div className="h-52 mb-5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costCenters} barCategoryGap="35%" barGap={3}>
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
                    width={44}
                  />
                  <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} cursor={{ fill: "var(--color-neutral-200)" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "var(--color-neutral-700)" }} />
                  <Bar dataKey="ingresos" name="Ingresos" fill="var(--color-chart-primary)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="costo" name="Costo" fill="var(--color-chart-secondary)" radius={[3, 3, 0, 0]} />
                  {comparing && (
                    <Bar
                      dataKey="costoAnterior"
                      name="Costo periodo anterior"
                      fill="var(--color-chart-muted)"
                      radius={[3, 3, 0, 0]}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartScroll>

          <ChartScroll minWidth={560}>
            <table className="w-full text-body">
              <thead>
                <tr className="text-left text-muted text-neutral-700 border-b border-neutral-500">
                  <th className="py-2 px-1 font-normal">Centro de costos</th>
                  <th className="py-2 px-1 font-normal text-right">Ingresos</th>
                  <th className="py-2 px-1 font-normal text-right">Costo</th>
                  <th className="py-2 px-1 font-normal text-right">% de costos de ventas</th>
                  <th className="py-2 px-1 font-normal text-right">Neto</th>
                </tr>
              </thead>
              <tbody>
                {costCenters.map((c) => {
                  const neto = c.ingresos - c.costo;
                  const pctOfTotalCosts = totalCosto > 0 ? (c.costo / totalCosto) * 100 : 0;
                  return (
                    <tr key={c.name} className="border-b border-neutral-500 last:border-0">
                      <td className="py-3 px-1 text-neutral-900 whitespace-nowrap">{c.name}</td>
                      <td className="py-3 px-1 text-right text-neutral-900">{formatCurrency(c.ingresos, currency)}</td>
                      <td className="py-3 px-1 text-right text-neutral-900">{formatCurrency(c.costo, currency)}</td>
                      <td className="py-3 px-1 text-right text-neutral-700">{formatPct(pctOfTotalCosts)}</td>
                      <td className={`py-3 px-1 text-right font-medium ${neto >= 0 ? "text-success" : "text-error"}`}>
                        {formatCurrency(neto, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ChartScroll>
        </>
      )}
    </section>
  );
}
