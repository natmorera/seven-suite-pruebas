"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useDashboard } from "@/lib/dashboard-context";
import { formatCurrencyCompact } from "@/lib/format";
import type { RevenuePoint } from "@/lib/companies";
import { SectionTitle, ChartScroll } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";

const periods = ["1D", "7D", "1M", "1Y", "Personalizado"] as const;
type Period = (typeof periods)[number];

// Genera una serie sintética para un rango personalizado, repartiendo el
// promedio diario observado en la serie de 7 días entre las fechas elegidas.
function buildCustomSeries(base7d: RevenuePoint[], desde: string, hasta: string): RevenuePoint[] {
  const avg = base7d.length
    ? base7d.reduce((s, p) => s + p.value, 0) / base7d.length
    : 0;
  const start = new Date(desde + "T12:00:00");
  const end = new Date(hasta + "T12:00:00");
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

  const days = Math.min(31, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const label = d.toLocaleDateString("es-CR", { day: "2-digit", month: "short" }).replace(".", "");
    const variance = 0.85 + ((i * 37) % 30) / 100; // variación determinista, no aleatoria en cada render
    const value = Math.round(avg * variance);
    return { label, value, previous: Math.round(value * 0.85) };
  });
}

export function RevenueOverTime() {
  const { data, comparing } = useDashboard();
  const [period, setPeriod] = useState<Period>("7D");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [customRange, setCustomRange] = useState<{ desde: string; hasta: string } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const { revenueOverTime, revenueProjection, currency } = data;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const customSeries = useMemo(() => {
    if (!customRange) return [];
    return buildCustomSeries(revenueOverTime["7D"], customRange.desde, customRange.hasta);
  }, [customRange, revenueOverTime]);

  const series = period === "Personalizado" ? customSeries : revenueOverTime[period];

  function selectPeriod(p: Period) {
    if (p === "Personalizado") {
      setPickerOpen(true);
    } else {
      setPeriod(p);
      setPickerOpen(false);
    }
  }

  function applyCustom() {
    if (!desde || !hasta) return;
    setCustomRange({ desde, hasta });
    setPeriod("Personalizado");
    setPickerOpen(false);
  }

  return (
    <section className="bg-white rounded-[10px] border border-neutral-500 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SectionTitle>Ingresos totales en el tiempo</SectionTitle>
        <div className="relative" ref={pickerRef}>
          <div className="flex items-center gap-1 bg-neutral-200 rounded p-1">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => selectPeriod(p)}
                className={`px-2.5 py-1 text-body font-medium rounded cursor-pointer transition-colors whitespace-nowrap ${
                  period === p ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-700 hover:text-neutral-900"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {pickerOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-neutral-500 p-4 z-30">
              <div className="flex gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <label className="text-muted text-neutral-700 block mb-1">Desde</label>
                  <input
                    type="date"
                    value={desde}
                    onChange={(e) => setDesde(e.target.value)}
                    className="w-full text-body border border-neutral-500 rounded h-8 px-2 text-neutral-900 min-w-0"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-muted text-neutral-700 block mb-1">Hasta</label>
                  <input
                    type="date"
                    value={hasta}
                    onChange={(e) => setHasta(e.target.value)}
                    className="w-full text-body border border-neutral-500 rounded h-8 px-2 text-neutral-900 min-w-0"
                  />
                </div>
              </div>
              <button
                onClick={applyCustom}
                disabled={!desde || !hasta}
                className="w-full bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white text-body font-medium h-8 rounded cursor-pointer"
              >
                Aplicar rango
              </button>
            </div>
          )}
        </div>
      </div>

      {series.length === 0 ? (
        <EmptyState
          message={
            period === "Personalizado"
              ? "Elige un rango de fechas para ver los ingresos."
              : "Sin ingresos registrados en este periodo."
          }
        />
      ) : (
        <>
          {/* key=period fuerza a Recharts a remontar el gráfico en vez de
              reutilizar el ResponsiveContainer anterior: sin esto, cambiar
              de dataset a veces deja el gráfico con las dimensiones/escala
              del periodo previo. */}
          <ChartScroll key={period} minWidth={Math.max(480, series.length * 20)}>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} barCategoryGap="30%" barGap={4}>
                  <CartesianGrid vertical={false} stroke="var(--color-neutral-500)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--color-neutral-700)" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCurrencyCompact(v, currency)}
                    tick={{ fontSize: 11, fill: "var(--color-neutral-700)" }}
                    width={52}
                  />
                  <Tooltip
                    formatter={(v, name) => [
                      `${currency}${Number(v).toLocaleString("en-US")}`,
                      name === "previous" ? "Periodo anterior" : "Ingresos",
                    ]}
                    cursor={{ fill: "var(--color-neutral-200)" }}
                  />
                  {comparing && (
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "var(--color-neutral-700)" }} />
                  )}
                  <Bar dataKey="value" name="Ingresos" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                  {comparing && (
                    <Bar
                      dataKey="previous"
                      name="Periodo anterior"
                      fill="var(--color-chart-muted)"
                      radius={[3, 3, 0, 0]}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartScroll>

          <p className="text-muted font-medium text-neutral-700 mt-4 mb-1.5">Forecast 7 días</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-neutral-200 rounded-lg p-3.5">
              <p className="text-muted text-neutral-700 mb-1">Ingresos proyectados</p>
              <p className="text-[14px] font-semibold text-neutral-900">
                {currency}
                {revenueProjection.projectedRevenue7d.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-neutral-200 rounded-lg p-3.5">
              <p className="text-muted text-neutral-700 mb-1">Ocupación proyectada</p>
              <p className="text-[14px] font-semibold text-neutral-900">
                {revenueProjection.projectedOccupancy.toFixed(2)}%
              </p>
            </div>
            <div className="bg-neutral-200 rounded-lg p-3.5">
              <p className="text-muted text-neutral-700 mb-1">Reservas proyectadas</p>
              <p className="text-[14px] font-semibold text-neutral-900">
                +{revenueProjection.projectedBookings} reservas
              </p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
