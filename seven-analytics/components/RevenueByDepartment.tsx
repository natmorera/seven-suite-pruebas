"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { formatCurrency, formatDelta } from "@/lib/format";
import { SectionTitle } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";

// Genera un color HSL distinto por departamento (ángulo dorado), determinista
// por empresa + índice, así cada hotel muestra una paleta variada y estable
// (no cambia entre renders) en vez de un solo tono repetido.
function hashSeed(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function deptColor(companyId: string, index: number) {
  const seed = hashSeed(companyId) % 360;
  const hue = (seed + index * 137.508) % 360;
  return `hsl(${hue.toFixed(0)}, 62%, 45%)`;
}

export function RevenueByDepartment() {
  const { data, comparing } = useDashboard();
  const { currency } = data;
  const items = data.revenueByDepartment;

  const gridCols =
    items.length <= 2
      ? "grid-cols-1 md:grid-cols-2"
      : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4";

  return (
    <section className="bg-white rounded-[10px] border border-neutral-500 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SectionTitle>Revenue por Departamento</SectionTitle>
        <span className="text-muted text-neutral-700 whitespace-nowrap">Julio 2026</span>
      </div>

      {items.length === 0 ? (
        <EmptyState message="Aún no hay ingresos registrados por departamento." />
      ) : (
        <div className={`grid ${gridCols} gap-3`}>
          {items.map((dept, i) => {
            const color = deptColor(data.id, i);
            const previous = dept.value / (1 + dept.deltaPct / 100);
            const previousPct = dept.value > 0 ? dept.pct * (previous / dept.value) : 0;

            return (
              <div key={dept.id} className="border border-neutral-500 rounded-lg p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-body text-neutral-900 truncate">{dept.name}</span>
                </div>
                <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                  <span className="text-[14px] font-semibold text-neutral-900">
                    {formatCurrency(dept.value, currency)}
                  </span>
                  <span className="text-muted text-neutral-700">{dept.pct.toFixed(2)}% del total</span>
                </div>

                <div className="h-1.5 rounded-full bg-neutral-500 overflow-hidden mb-1">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${dept.pct}%`, backgroundColor: color }}
                  />
                </div>

                {comparing && (
                  <div className="mb-2">
                    <div className="h-1.5 rounded-full bg-neutral-500 overflow-hidden opacity-60">
                      <div
                        className="h-full rounded-full bg-neutral-700"
                        style={{ width: `${Math.min(previousPct, 100)}%` }}
                      />
                    </div>
                    <p className="text-muted text-neutral-700 mt-1">
                      Periodo anterior: {formatCurrency(previous, currency)}
                    </p>
                  </div>
                )}

                {comparing && (
                  <span
                    className={`text-muted font-medium ${dept.deltaPct >= 0 ? "text-success" : "text-error"}`}
                  >
                    {formatDelta(dept.deltaPct)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
