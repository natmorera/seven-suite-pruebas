'use client';
import { FONT } from '../../../ui/tokens';
import { Cuenta } from '../catalogoData';
import { EnlaceAjuste } from '../datos/ajustes';

export const F = FONT;
export const BRAND = '#A77600';
// ── Helpers ───────────────────────────────────────────────────────────────────
// Issue: la lista de centros de costo vivía acá duplicada como mock local -
// ahora viene del contexto compartido (centrosCostoConfig.tsx) para que
// coincida siempre con lo que ve Presupuesto y cualquier otra pantalla que
// también la use.
export const GRUPOS_PATRIMONIO = [
  { value:'001', label:'001 · Capital social'         },
  { value:'002', label:'002 · Reserva legal'          },
  { value:'003', label:'003 · Aporte de socios'       },
  { value:'004', label:'004 · Resultados del período' },
  { value:'005', label:'005 · Utilidades acumuladas'  },
];
// ── Cascada NIIF: Grupo → Sub grupo → Sub sub grupo ────────────────────────────
export const NIIF_TREE: Record<string, { label:string; sgs: Record<string, { label:string; ssgs: Record<string, string> }> }> = {
  '1': { label:'1 · Activos', sgs: {
    '1.1': { label:'Activos corrientes', ssgs: { '1.1.1':'Activos corrientes circulantes', '1.1.2':'Otros activos circulantes' } },
    '1.2': { label:'Activos no corrientes', ssgs: { '1.2.1':'Propiedad planta y equipo' } },
  }},
  '2': { label:'2 · Pasivos', sgs: {
    '2.1': { label:'Pasivos corrientes', ssgs: { '2.1.1':'Obligaciones a corto plazo' } },
    '2.2': { label:'Pasivos no corrientes', ssgs: { '2.2.1':'Obligaciones a largo plazo' } },
  }},
  '3': { label:'3 · Patrimonio', sgs: {
    '3.1': { label:'Capital', ssgs: { '3.1.1':'Capital social y reservas' } },
  }},
  '4': { label:'4 · Ingresos', sgs: {
    '4.1': { label:'Ingresos operativos', ssgs: { '4.1.1':'Ingresos por ventas y servicios' } },
  }},
  '5': { label:'5 · Costos', sgs: {
    '5.1': { label:'Costo de ventas', ssgs: { '5.1.1':'Costos directos de operación' } },
  }},
  '6': { label:'6 · Gastos', sgs: {
    '6.1': { label:'Gastos de operación', ssgs: { '6.1.1':'Gastos operativos y administrativos' } },
  }},
};
// Lista plana de hojas (sub sub grupo) para el selector con búsqueda - reemplaza la cascada de 3 pasos
export interface NiifLeaf { grupo:string; sg:string; ssg:string; grupoLabel:string; sgLabel:string; ssgLabel:string; search:string }
export const NIIF_LEAVES: NiifLeaf[] = Object.entries(NIIF_TREE).flatMap(([gVal, g]) =>
  Object.entries(g.sgs).flatMap(([sgVal, sg]) =>
    Object.entries(sg.ssgs).map(([ssgVal, ssgLabel]) => {
      const leaf = { grupo:gVal, sg:sgVal, ssg:ssgVal, grupoLabel:g.label, sgLabel:sg.label, ssgLabel, search:'' };
      leaf.search = `${ssgVal} ${ssgLabel} ${sg.label} ${g.label}`.toLowerCase();
      return leaf;
    })
  )
);
// ── Orchestrator ──────────────────────────────────────────────────────────────
export interface Props {
  mode: 'view'|'edit'|'new';
  account: Cuenta|null;
  parentAccount: Cuenta|null;
  allNodes: Cuenta[];
  onClose: ()=>void;
  onSave: (c:Cuenta)=>void;
  onDelete: (id:string)=>void;
  onAddChild: (p:Cuenta)=>void;
  onModeChange: (m:'view'|'edit'|'new')=>void;
  onSelect: (n:Cuenta)=>void;
  enlacesAjuste?: EnlaceAjuste[];
}
