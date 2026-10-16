"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUpDown, Calendar, Check } from "lucide-react";
import { dateOptions, comparisonOptions, useDashboard } from "@/lib/dashboard-context";
import { CONTENT_PADDING } from "@/lib/layout";

function ComparisonDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-3 h-8 rounded border text-body font-medium text-neutral-900 cursor-pointer transition-colors whitespace-nowrap ${
          open ? "border-primary" : "border-neutral-500 hover:border-neutral-700"
        }`}
      >
        <ArrowUpDown size={13} />
        <span>{value}</span>
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg border border-neutral-500 py-1 z-30">
          {comparisonOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-body text-left hover:bg-neutral-200 cursor-pointer ${
                opt === value ? "text-primary bg-primary-soft font-medium" : "text-neutral-900"
              }`}
            >
              {opt}
              {opt === value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type DateMode = "preset" | "single" | "range";

function DateDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DateMode>("range");
  const [single, setSingle] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fmt = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  function applySingle() {
    if (!single) return;
    onChange(fmt(single));
    setOpen(false);
  }

  function applyRange() {
    if (!desde || !hasta) return;
    onChange(`${fmt(desde)} – ${fmt(hasta)}`);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-3 h-8 rounded border text-body font-medium text-neutral-900 cursor-pointer transition-colors whitespace-nowrap ${
          open ? "border-primary" : "border-neutral-500 hover:border-neutral-700"
        }`}
      >
        <Calendar size={13} />
        <span className="max-w-[160px] truncate">{value}</span>
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg border border-neutral-500 py-1 z-30">
          {dateOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-body text-left hover:bg-neutral-200 cursor-pointer ${
                opt === value ? "text-primary bg-primary-soft font-medium" : "text-neutral-900"
              }`}
            >
              {opt}
              {opt === value && <Check size={14} />}
            </button>
          ))}
          <div className="border-t border-neutral-500 mt-1 pt-3 px-4 pb-4">
            <div className="flex items-center gap-1 bg-neutral-200 rounded p-0.5 mb-3 w-fit">
              <button
                onClick={() => setMode("single")}
                className={`px-2.5 py-1 text-muted font-medium rounded cursor-pointer transition-colors ${
                  mode === "single" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-700"
                }`}
              >
                Fecha única
              </button>
              <button
                onClick={() => setMode("range")}
                className={`px-2.5 py-1 text-muted font-medium rounded cursor-pointer transition-colors ${
                  mode === "range" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-700"
                }`}
              >
                Rango
              </button>
            </div>

            {mode === "single" ? (
              <>
                <label className="text-muted text-neutral-700 block mb-1">Fecha</label>
                <input
                  type="date"
                  value={single}
                  onChange={(e) => setSingle(e.target.value)}
                  className="w-full text-body border border-neutral-500 rounded h-8 px-2 text-neutral-900 mb-3 min-w-0"
                />
                <button
                  onClick={applySingle}
                  disabled={!single}
                  className="w-full bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white text-body font-medium h-8 rounded cursor-pointer"
                >
                  Aplicar fecha
                </button>
              </>
            ) : (
              <>
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
                  onClick={applyRange}
                  disabled={!desde || !hasta}
                  className="w-full bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white text-body font-medium h-8 rounded cursor-pointer"
                >
                  Aplicar rango
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Franja de filtros, independiente del header. Fija (no scrollea), con fondo
// blanco para diferenciarla del fondo gris del contenido.
export function FilterBar() {
  const { comparison, setComparison, date, setDate } = useDashboard();

  return (
    <div className={`${CONTENT_PADDING} h-[48px] shrink-0 bg-white border-b border-neutral-500 flex items-center`}>
      <div className="flex flex-wrap items-center gap-2 max-w-[1400px] w-full mx-auto">
        <ComparisonDropdown value={comparison} onChange={setComparison} />
        <DateDropdown value={date} onChange={setDate} />
      </div>
    </div>
  );
}
