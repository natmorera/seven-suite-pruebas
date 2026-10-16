"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { PageHeader } from "@/components/Header";
import { FilterBar } from "@/components/FilterBar";
import { DashboardProvider } from "@/lib/dashboard-context";
import { CONTENT_PADDING } from "@/lib/layout";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <DashboardProvider>
      <div className="flex w-full h-screen">
        <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

        {/* Columna derecha: header y barra de filtros quedan fijos (shrink-0);
            solo el contenido del dashboard scrollea (flex-1 + min-h-0 + overflow-y-auto).
            Importante: NO ponemos overflow-hidden en estos contenedores, porque
            eso recortaría los dropdowns (fecha, comparación, switcher de empresa)
            que se posicionan absolute por fuera de su fila. */}
        <div className="flex-1 min-w-0 flex flex-col h-screen">
          <PageHeader onMenuClick={() => setMobileOpen(true)} />
          <FilterBar />

          <div className="flex-1 min-h-0 overflow-y-auto">
            <main
              id="dashboard-export-root"
              className={`${CONTENT_PADDING} py-6 flex flex-col gap-5 max-w-[1400px] w-full mx-auto`}
            >
              {children}
            </main>
          </div>

          <footer className="h-8 shrink-0 bg-white border-t border-neutral-500 flex items-center justify-between px-5 text-muted text-neutral-700">
            <span>Seven Analytics</span>
            <span>© {new Date().getFullYear()} · Todos los derechos reservados</span>
          </footer>
        </div>
      </div>
    </DashboardProvider>
  );
}
