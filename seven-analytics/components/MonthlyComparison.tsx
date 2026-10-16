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
} from "recharts";
import { useDashboard } from "@/lib/dashboard-context";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { SectionTitle, ChartScroll } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";

export function MonthlyComparison() {
  const { data } = useDashboard();
  const { monthlyComparison, monthlyComparisonTotal, currency } = data;

  return (
    <section className="bg-white rounded-[10px] border border-neutral-500 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SectionTitle>Comparativo Mensual</SectionTitle>
        <span className="text-muted text-neutral-700 whitespace-nowrap">Todos los meses cargados en el sistema</span>
      </div>

      {monthlyComparison.length === 0 ? (
        <EmptyState message="Aún no hay meses cargados en el sistema." />
      ) : (
        <>
          <ChartScroll>
            <div className="h-52 mb-5">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyComparison}>
                  <CartesianGrid vertical={false} stroke="var(--color-neutral-500)" />
                  <XAxis
                    dataKey="month"
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
                  <Bar dataKey="ingresos" name="Ingresos" fill="var(--color-chart-primary)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="gastos" name="Gastos" fill="var(--color-chart-secondary)" radius={[3, 3, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="utilidadNeta"
                    name="Utilidad Neta"
                    stroke="var(--color-chart-navy)"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: "var(--color-chart-navy)" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartScroll>

          <ChartScroll minWidth={560}>
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center gap-1.5 text-muted text-neutral-700">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--color-chart-primary)" }} /> Ingresos
              </span>
              <span className="flex items-center gap-1.5 text-muted text-neutral-700">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--color-chart-secondary)" }} /> Gastos
              </span>
              <span className="flex items-center gap-1.5 text-muted text-neutral-700">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--color-chart-navy)" }} /> Utilidad Neta
              </span>
            </div>
            <table className="w-full text-body">
              <thead>
                <tr className="text-left text-muted text-neutral-700 border-b border-neutral-500">
                  <th className="py-2 font-normal">Mes</th>
                  <th className="py-2 font-normal text-right">Ingresos</th>
                  <th className="py-2 font-normal text-right">Costo de Ventas</th>
                  <th className="py-2 font-normal text-right">Gastos</th>
                  <th className="py-2 font-normal text-right">Utilidad Neta</th>
                </tr>
              </thead>
              <tbody>
                {monthlyComparison.map((row) => (
                  <tr key={row.month} className="border-b border-neutral-500">
                    <td className="py-3 text-neutral-900 whitespace-nowrap">{row.month}</td>
                    <td className="py-3 text-right text-neutral-900">{formatCurrency(row.ingresos, currency)}</td>
                    <td className="py-3 text-right text-neutral-900">{formatCurrency(row.costoVentas, currency)}</td>
                    <td className="py-3 text-right text-neutral-900">{formatCurrency(row.gastos, currency)}</td>
                    <td className="py-3 text-right font-medium text-neutral-900">
                      {formatCurrency(row.utilidadNeta, currency)}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-3 text-neutral-900 whitespace-nowrap">{monthlyComparisonTotal.month}</td>
                  <td className="py-3 text-right text-neutral-900">{formatCurrency(monthlyComparisonTotal.ingresos, currency)}</td>
                  <td className="py-3 text-right text-neutral-900">{formatCurrency(monthlyComparisonTotal.costoVentas, currency)}</td>
                  <td className="py-3 text-right text-neutral-900">{formatCurrency(monthlyComparisonTotal.gastos, currency)}</td>
                  <td className="py-3 text-right text-neutral-900">{formatCurrency(monthlyComparisonTotal.utilidadNeta, currency)}</td>
                </tr>
              </tbody>
            </table>
          </ChartScroll>
          <p className="text-muted text-neutral-700 mt-3">
            Los meses adicionales aparecerán aquí automáticamente al cargarse en el sistema.
          </p>
        </>
      )}
    </section>
  );
}
