"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { formatCurrency, formatDelta } from "@/lib/format";
import { SectionTitle } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";

function Row({
  name,
  value,
  deltaPct,
  comparing,
  currency,
}: {
  name: string;
  value: number;
  deltaPct: number;
  comparing: boolean;
  currency: string;
}) {
  return (
    <li className="flex items-center justify-between py-2.5 border-b border-neutral-500 last:border-0 gap-3">
      <span className="flex items-center gap-2 text-body text-neutral-900 min-w-0">
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-700 shrink-0" />
        <span className="truncate">{name}</span>
      </span>
      <span className="flex items-center gap-2 shrink-0">
        {comparing && (
          <span className={`text-muted font-medium ${deltaPct >= 0 ? "text-error" : "text-success"}`}>
            {formatDelta(deltaPct)}
          </span>
        )}
        <span className="text-body font-medium text-neutral-900">{formatCurrency(value, currency)}</span>
      </span>
    </li>
  );
}

export function TopCostsExpenses() {
  const { data, comparing } = useDashboard();
  const { left, right } = data.topCostsExpenses;
  const { currency } = data;

  return (
    <section className="bg-white rounded-[10px] border border-neutral-500 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SectionTitle>Principales Costos y Gastos</SectionTitle>
        <span className="text-muted text-neutral-700 whitespace-nowrap">Julio 2026</span>
      </div>
      {left.length === 0 && right.length === 0 ? (
        <EmptyState message="Sin costos ni gastos registrados." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <ul>
            {left.map((item) => (
              <Row key={item.name} {...item} comparing={comparing} currency={currency} />
            ))}
          </ul>
          <ul>
            {right.map((item) => (
              <Row key={item.name} {...item} comparing={comparing} currency={currency} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
