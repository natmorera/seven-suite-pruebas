"use client";
// Configuración: pestañas Empresa (datos de la empresa) y API Key, igual que
// Configuración › Empresa en Accounting y los demás módulos de la suite.
import { useState, useSyncExternalStore } from "react";
import { Sidebar } from "@/components/Sidebar";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import { leerEmpresa, guardarEmpresa, PAISES, TIPOS_ID, type DatosEmpresa } from "@/lib/empresa";
import SeccionApiKey from "@/components/integracion/SeccionApiKey";
import { obtenerApiKey, regenerarApiKey } from "@/lib/apiKey";
import { PageHeader, TabBar, Section, FormField, Input, Select, Button, C, FONT } from "@/components/configuracion/piezas";

const TABS = ["Empresa", "API Key"];

function TabEmpresa({ d, patch }: { d: DatosEmpresa; patch: (p: Partial<DatosEmpresa>) => void }) {
  const grid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } as const;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Section title="Identificación" hint="Datos legales y fiscales de la empresa.">
        <div style={grid}>
          <FormField label="Nombre legal">{(id) => <Input id={id} value={d.nombreLegal} onChange={(v) => patch({ nombreLegal: v })} />}</FormField>
          <FormField label="Nombre comercial">{(id) => <Input id={id} value={d.nombreComercial} onChange={(v) => patch({ nombreComercial: v })} />}</FormField>
          <FormField label="Tipo de identificación">{(id) => <Select id={id} value={d.tipoId} onChange={(v) => patch({ tipoId: v })} options={TIPOS_ID} />}</FormField>
          <FormField label="Número de identificación">{(id) => <Input id={id} value={d.numeroId} onChange={(v) => patch({ numeroId: v })} placeholder="Ej. 3101123456" />}</FormField>
          <FormField label="País">{(id) => <Select id={id} value={d.pais} options={PAISES}
            onChange={(v) => patch({ pais: v, zonaHoraria: PAISES.find((p) => p.value === v)?.zona ?? d.zonaHoraria })} />}</FormField>
          <FormField label="Zona horaria">{(id) => <Input id={id} value={d.zonaHoraria} onChange={(v) => patch({ zonaHoraria: v })} />}</FormField>
        </div>
      </Section>
      <Section title="Contacto" hint="Información de contacto de la empresa.">
        <div style={grid}>
          <FormField label="Dirección">{(id) => <Input id={id} value={d.direccion} onChange={(v) => patch({ direccion: v })} placeholder="Dirección física" />}</FormField>
          <FormField label="Teléfono">{(id) => <Input id={id} value={d.telefono} onChange={(v) => patch({ telefono: v })} placeholder="+506 2222-3333" />}</FormField>
          <FormField label="Correo electrónico">{(id) => <Input id={id} type="email" value={d.email} onChange={(v) => patch({ email: v })} placeholder="contabilidad@empresa.com" />}</FormField>
          <FormField label="Sitio web">{(id) => <Input id={id} value={d.web} onChange={(v) => patch({ web: v })} placeholder="www.empresa.com" />}</FormField>
        </div>
      </Section>
    </div>
  );
}

function Configuracion() {
  const { data } = useDashboard();
  const montado = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [guardado, setGuardado] = useState<{ id: string; d: DatosEmpresa } | null>(null);
  const [borrador, setBorrador] = useState<DatosEmpresa | null>(null);
  const [aviso, setAviso] = useState("");
  // Al abrir la pantalla o cambiar de empresa en el selector se cargan sus datos
  if (montado && guardado?.id !== data.id) {
    setGuardado({ id: data.id, d: leerEmpresa(data.id, data.name) });
    setBorrador(null);
  }
  const actual = borrador ?? guardado?.d ?? null;
  const dirty = borrador !== null && JSON.stringify(borrador) !== JSON.stringify(guardado?.d);
  function guardar() {
    if (!borrador || !guardado) return;
    guardarEmpresa(guardado.id, borrador); setGuardado({ id: guardado.id, d: borrador }); setBorrador(null);
    setAviso("Se guardaron los datos de la empresa."); setTimeout(() => setAviso(""), 2500);
  }

  return (
    <div className="flex w-full h-screen">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div style={{ flex: 1, minWidth: 0, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: FONT }}>
        <PageHeader title="Configuración" onMenu={() => setMobileOpen(true)}>
          {tab === 0 && dirty && <>
            <Button variant="secondary" onClick={() => setBorrador(null)}>Cancelar</Button>
            <Button onClick={guardar}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7.5l3 3 6-7" /></svg>
              Guardar cambios
            </Button>
          </>}
        </PageHeader>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 24, background: C.n200 }}>
          {tab === 0 && (actual ? <TabEmpresa d={actual} patch={(p) => setBorrador({ ...actual, ...p })} /> : <span style={{ fontSize: 12, color: C.n700 }}>Cargando…</span>)}
          {tab === 1 && <SeccionApiKey obtener={obtenerApiKey} regenerar={regenerarApiKey} marca={C.brand} />}
        </div>
        <footer className="h-8 shrink-0 bg-white border-t border-neutral-500 flex items-center justify-between px-5 text-muted text-neutral-700">
          <span>Seven Analytics</span>
          <span>© {new Date().getFullYear()} · Todos los derechos reservados</span>
        </footer>
      </div>
      {aviso && <div role="status" style={{ position: "fixed", bottom: 48, right: 24, background: C.n900, color: "#fff", padding: "10px 14px", borderRadius: 6, fontSize: 12, fontFamily: FONT }}>{aviso}</div>}
    </div>
  );
}

export function ConfiguracionPage() {
  return <DashboardProvider><Configuracion /></DashboardProvider>;
}
