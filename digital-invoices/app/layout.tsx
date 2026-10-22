import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { VisualizacionAsientosProvider } from "@/components/pages/config/visualizacionAsientos";
import { FirmasProvider } from "@/components/pages/config/firmasConfig";
import { CentrosCostoProvider } from "@/components/pages/catalogo/centrosCostoConfig";
import { PaisProvider } from "@/lib/paisCliente";
import { COOKIE_EMPRESA, empresaOInicial, paisDeEmpresa } from "@/lib/empresas";

export const metadata: Metadata = {
  title: "Seven Accounting Cloud",
  description: "Módulo contable y facturación electrónica · Costa Rica y Guatemala",
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // La empresa elegida (cookie) decide el país de todas las pantallas
  const empresa = empresaOInicial((await cookies()).get(COOKIE_EMPRESA)?.value);
  return (
    <html lang="es">
      <body style={{ height: "100vh" }}>
        <PaisProvider pais={paisDeEmpresa(empresa)}>
          <VisualizacionAsientosProvider>
            <CentrosCostoProvider>
              <FirmasProvider>
                <AppShell empresa={empresa}>{children}</AppShell>
              </FirmasProvider>
            </CentrosCostoProvider>
          </VisualizacionAsientosProvider>
        </PaisProvider>
      </body>
    </html>
  );
}
