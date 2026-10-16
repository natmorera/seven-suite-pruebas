"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useDashboard } from "@/lib/dashboard-context";
import { formatDelta } from "@/lib/format";
import { SectionTitle } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";

function MetricBox({
  label,
  subtitle,
  value,
  sub,
  deltaPct,
  comparing,
}: {
  label: string;
  subtitle?: string;
  value: string;
  sub?: string;
  deltaPct?: number;
  comparing: boolean;
}) {
  return (
    <div className="border border-neutral-500 rounded-lg p-3.5">
      <p className="text-muted text-neutral-700">{label}</p>
      {subtitle && <p className="text-[10px] text-neutral-700/70 -mt-0.5 mb-1">{subtitle}</p>}
      <p className="text-[14px] font-semibold text-neutral-900 mt-1">{value}</p>
      {deltaPct !== undefined && comparing ? (
        <span className={`text-muted font-medium ${deltaPct >= 0 ? "text-success" : "text-error"}`}>
          {formatDelta(deltaPct)} vs. mes ant.
        </span>
      ) : (
        <p className="text-muted text-neutral-700">{sub}</p>
      )}
    </div>
  );
}

export function FrontDeskLive() {
  const { data, comparing, date } = useDashboard();
  const { frontDeskLive, currency } = data;
  const { occupied, free } = frontDeskLive;
  const hasOccupancyData = occupied + free > 0;

  const chartData = [
    { name: "Ocupadas", value: occupied, color: "var(--color-error)" },
    { name: "Libres", value: free, color: "var(--color-success)" },
  ];

  return (
    <section className="bg-white rounded-[10px] border border-neutral-500 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SectionTitle>Front Desk Live</SectionTitle>
        {frontDeskLive.synced && (
          <span className="flex items-center gap-1.5 text-tiny font-medium text-success bg-success-bg border border-success-border px-2 py-0.5 rounded-full whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Sincronizado con PMS
          </span>
        )}
      </div>

      {!hasOccupancyData ? (
        <EmptyState message="Sin datos de ocupación disponibles." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-3">
          <div className="border border-neutral-500 rounded-lg p-3.5 flex flex-col items-center justify-center">
            <div className="w-28 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    innerRadius="72%"
                    outerRadius="100%"
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    {chartData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-3 mt-2 text-muted text-neutral-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-error" /> Ocupadas · {occupied}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success" /> Libres · {free}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <MetricBox
              comparing={comparing}
              label="ADR"
              value={`${currency}${frontDeskLive.adr.value.toFixed(2)}`}
              deltaPct={frontDeskLive.adr.deltaPct}
            />
            <MetricBox
              comparing={comparing}
              label="RevPAR"
              value={`${currency}${frontDeskLive.revpar.value.toFixed(2)}`}
              deltaPct={frontDeskLive.revpar.deltaPct}
            />
            <MetricBox
              comparing={comparing}
              label="RevPOR"
              value={`${currency}${frontDeskLive.revpor.value.toFixed(2)}`}
              deltaPct={frontDeskLive.revpor.deltaPct}
            />
            <MetricBox
              comparing={comparing}
              label="Ocupación"
              value={`${frontDeskLive.occupancy.value.toFixed(2)}%`}
              deltaPct={frontDeskLive.occupancy.deltaPct}
            />
            <MetricBox
              comparing={comparing}
              label="Ingresos diarios"
              value={`${currency}${frontDeskLive.dailyRevenue.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              sub={date}
            />
            <MetricBox
              comparing={comparing}
              label="Ingresos del mes"
              value={`${currency}${frontDeskLive.monthRevenue.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              sub={date}
            />
          </div>
        </div>
      )}
    </section>
  );
}
