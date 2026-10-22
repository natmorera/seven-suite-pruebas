"use client";

import { createContext, useContext, useState, useMemo } from "react";
import { companies, defaultCompanyId, getCompanyById, type CompanyData } from "@/lib/companies";

export const dateOptions = [
  "Hoy",
  "Últimos 7 días",
  "Este mes",
  "Mes pasado",
  "Julio 2026",
  "Año 2026 (acumulado)",
];

export const comparisonOptions = [
  "Sin comparación",
  "vs. mes anterior",
  "vs. mismo mes año anterior",
];

type DashboardContextValue = {
  companies: CompanyData[];
  companyId: string;
  setCompanyId: (id: string) => void;
  data: CompanyData;
  comparison: string;
  setComparison: (v: string) => void;
  comparing: boolean;
  date: string;
  setDate: (v: string) => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

// Empresa elegida en el selector: se recuerda al pasar entre Dashboard y Configuración
let empresaElegida = defaultCompanyId;

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [companyId, setCompanyIdEstado] = useState(() => empresaElegida);
  const setCompanyId = (id: string) => { empresaElegida = id; setCompanyIdEstado(id); };
  const [comparison, setComparison] = useState(comparisonOptions[0]);
  const [date, setDate] = useState(dateOptions[4]);

  const data = useMemo(() => getCompanyById(companyId), [companyId]);

  const value: DashboardContextValue = {
    companies,
    companyId,
    setCompanyId,
    data,
    comparison,
    setComparison,
    comparing: comparison !== "Sin comparación",
    date,
    setDate,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard debe usarse dentro de <DashboardProvider>");
  return ctx;
}
