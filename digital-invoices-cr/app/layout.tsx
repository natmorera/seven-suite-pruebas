import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { VisualizacionAsientosProvider } from "@/components/pages/config/visualizacionAsientos";
import { FirmasProvider } from "@/components/pages/config/firmasConfig";
import { CentrosCostoProvider } from "@/components/pages/catalogo/centrosCostoConfig";

export const metadata: Metadata = {
  title: "Seven Accounting Cloud",
  description: "Módulo contable · Hotel Fortuna · Costa Rica",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ height: "100vh" }}>
        <VisualizacionAsientosProvider>
          <CentrosCostoProvider>
            <FirmasProvider>
              <AppShell>{children}</AppShell>
            </FirmasProvider>
          </CentrosCostoProvider>
        </VisualizacionAsientosProvider>
      </body>
    </html>
  );
}
