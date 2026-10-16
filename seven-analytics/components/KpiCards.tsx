"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useDashboard } from "@/lib/dashboard-context";
import { formatCurrency, formatDelta } from "@/lib/format";

type KpiKey = "utilidadNeta" | "ingresos" | "costoVentas" | "gastosOperativos";

function DeltaTag({ value, comparing }: { value: number; comparing: boolean }) {
  if (!comparing) return null;
  const positive = value >= 0;
  return (
    <span className={`text-muted font-medium ${positive ? "text-success" : "text-error"}`}>
      {formatDelta(value)} vs. Jun 2026
    </span>
  );
}

// Tile de detalle (no fila de lista): así el grid se reparte en todo el
// ancho disponible sin importar cuántos ítems haya, en vez de quedar
// confinado a una sola columna con la mitad derecha vacía.
function DetailTile({
  label,
  value,
  bold,
  currency,
}: {
  label: string;
  value: number;
  bold?: boolean;
  currency: string;
}) {
  return (
    <div className={`border rounded-lg p-3 ${bold ? "border-primary bg-primary-soft" : "border-neutral-500"}`}>
      <p className="text-muted text-neutral-700 truncate">{label}</p>
      <p className={`text-body mt-0.5 ${bold ? "font-semibold text-primary" : "text-neutral-900"}`}>
        {formatCurrency(value, currency)}
      </p>
    </div>
  );
}

export function KpiCards() {
  const { data, comparing } = useDashboard();
  const { kpis, revenueByDepartment, costoDeVentasDetail, gastosOperativosDetail, currency } = data;
  const [expanded, setExpanded] = useState<KpiKey | null>(null);
  const [expandedForCompany, setExpandedForCompany] = useState(data.id);

  // Si se cambia de empresa, cierra el detalle abierto para evitar mostrar
  // datos obsoletos de la empresa anterior (calculado durante el render,
  // sin useEffect, siguiendo el patrón recomendado por React).
  if (expandedForCompany !== data.id) {
    setExpandedForCompany(data.id);
    setExpanded(null);
  }

  const toggle = (k: KpiKey) => setExpanded((cur) => (cur === k ? null : k));

  const cards: { key: KpiKey; label: string; content: React.ReactNode }[] = [
    {
      key: "utilidadNeta",
      label: "Utilidad Neta",
      content: (
        <>
          <p className="text-kpi text-neutral-900">{formatCurrency(kpis.utilidadNeta.value, currency)}</p>
          <p className="text-muted text-success font-medium">
            {kpis.utilidadNeta.margin.toFixed(2)}% margen{" "}
            <span className="text-neutral-700 font-normal">sobre ingresos totales</span>
          </p>
          <DeltaTag value={kpis.utilidadNeta.deltaPct} comparing={comparing} />
        </>
      ),
    },
    {
      key: "ingresos",
      label: "Ingresos",
      content: (
        <>
          <p className="text-kpi text-neutral-900">{formatCurrency(kpis.ingresos.value, currency)}</p>
          <p className="text-muted text-neutral-700">{kpis.ingresos.breakdown}</p>
          <DeltaTag value={kpis.ingresos.deltaPct} comparing={comparing} />
        </>
      ),
    },
    {
      key: "costoVentas",
      label: "Costo de Ventas",
      content: (
        <>
          <p className="text-kpi text-neutral-900">{formatCurrency(kpis.costoVentas.value, currency)}</p>
          <p className="text-muted text-neutral-700">{kpis.costoVentas.pctOfRevenue.toFixed(2)}% de ingresos</p>
          <DeltaTag value={kpis.costoVentas.deltaPct} comparing={comparing} />
        </>
      ),
    },
    {
      key: "gastosOperativos",
      label: "Gastos Operativos",
      content: (
        <>
          <p className="text-kpi text-neutral-900">{formatCurrency(kpis.gastosOperativos.value, currency)}</p>
          <p className="text-muted text-neutral-700">{kpis.gastosOperativos.pctOfRevenue.toFixed(2)}% de ingresos</p>
          <DeltaTag value={kpis.gastosOperativos.deltaPct} comparing={comparing} />
        </>
      ),
    },
  ];

  const activeCard = cards.find((c) => c.key === expanded);

  const tileGrid = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3";

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.key} className="bg-white rounded-[10px] border border-neutral-500 p-4 flex flex-col gap-1">
            <button
              onClick={() => toggle(card.key)}
              className="flex items-center gap-1 text-muted font-semibold tracking-wide text-neutral-700 uppercase cursor-pointer w-fit"
            >
              {card.label}
              {expanded === card.key ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {card.content}
          </div>
        ))}
      </div>

      {/* Detalle a ancho completo, debajo de las 4 tarjetas. El contenido se
          organiza como grid de tiles (no una lista de una sola columna), así
          ocupa todo el ancho disponible en vez de quedarse a medias. */}
      {activeCard && (
        <div className="bg-white rounded-[10px] border border-neutral-500 p-4 mt-4">
          <p className="text-muted font-semibold tracking-wide text-neutral-700 uppercase mb-3">
            Detalle · {activeCard.label}
          </p>
          {!data.hasData ? (
            <p className="text-muted text-neutral-700">Sin datos para este periodo.</p>
          ) : (
            <>
              {expanded === "utilidadNeta" && (
                <div className={tileGrid}>
                  <DetailTile label="Ingresos" value={kpis.ingresos.value} currency={currency} />
                  <DetailTile label="Costo de Ventas" value={-kpis.costoVentas.value} currency={currency} />
                  <DetailTile
                    label="Utilidad Bruta"
                    value={kpis.ingresos.value - kpis.costoVentas.value}
                    currency={currency}
                  />
                  <DetailTile label="Gastos Operativos" value={-kpis.gastosOperativos.value} currency={currency} />
                  <DetailTile label="Utilidad Neta" value={kpis.utilidadNeta.value} currency={currency} bold />
                </div>
              )}
              {expanded === "ingresos" && (
                <div className={tileGrid}>
                  {revenueByDepartment.map((d) => (
                    <DetailTile key={d.id} label={d.name} value={d.value} currency={currency} />
                  ))}
                  <DetailTile label="Ingresos Totales" value={kpis.ingresos.value} currency={currency} bold />
                </div>
              )}
              {expanded === "costoVentas" && (
                <div className={tileGrid}>
                  {costoDeVentasDetail.cuentas.map((c) => (
                    <DetailTile key={c.name} label={c.name} value={c.value} currency={currency} />
                  ))}
                  <DetailTile label="Total" value={costoDeVentasDetail.total} currency={currency} bold />
                </div>
              )}
              {expanded === "gastosOperativos" && (
                <div className={tileGrid}>
                  {gastosOperativosDetail.cuentas.map((c) => (
                    <DetailTile key={c.name} label={c.name} value={c.value} currency={currency} />
                  ))}
                  <DetailTile label="Total" value={gastosOperativosDetail.total} currency={currency} bold />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
