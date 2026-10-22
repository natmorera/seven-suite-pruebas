'use client';
// Lo que usa cada módulo de un perfil según su rol: los campos del formulario, las columnas de cada pestaña
// y los valores por defecto al agregar un rol.
import { type ReactNode } from 'react';
import { C } from '@/components/suite/tokens';
import { Checkbox, Input, Select } from '@/components/suite/ui';
import { Campo, Grid, Insignia } from '@/components/kit';
import type { DatosCliente, DatosEmpresa, DatosProveedor, DatosReceptor, Perfil, RolPerfil } from '../../tipos';

const num = (n: number) => n.toLocaleString('es-CR');
const MONEDAS = ['CRC', 'USD', 'EUR'];
const ops = (xs: readonly string[]) => xs.map(x => ({ value: x, label: x }));

/** Datos con que nace un rol al marcarlo en un perfil. */
export const DEFECTO = {
  Cliente: { cliente: { condicion: 'Contado', plazo: 0, limite: 0, moneda: 'CRC' } as DatosCliente },
  Proveedor: { proveedor: { plazo: 30, moneda: 'CRC', categoria: 'Servicios', cuenta: '' } as DatosProveedor },
  Receptor: { receptor: { correoComprobantes: '', actividad: '', provincia: 'San José', exonerado: false } as DatosReceptor },
  Empresa: { empresa: { tipo: 'Corporativo', tarifa: 'Rack', credito: false, comision: 0 } as DatosEmpresa },
} satisfies Record<RolPerfil, Partial<Perfil>>;

/** Columnas propias de cada pestaña de rol (además de nombre e identificación). */
export const COLUMNAS: Record<RolPerfil, { titulo: string; valor: (p: Perfil) => ReactNode }[]> = {
  Cliente: [
    { titulo: 'Condición', valor: p => (p.cliente ? (p.cliente.condicion === 'Crédito' ? `Crédito ${p.cliente.plazo} días` : 'Contado') : '-') },
    { titulo: 'Límite de crédito', valor: p => (p.cliente?.limite ? `${p.cliente.moneda} ${num(p.cliente.limite)}` : '-') },
  ],
  Proveedor: [
    { titulo: 'Categoría y plazo', valor: p => (p.proveedor ? <>{p.proveedor.categoria}<span style={{ display: 'block', fontSize: 11.5, color: C.n700 }}>{p.proveedor.plazo} días · {p.proveedor.moneda}</span></> : '-') },
    { titulo: 'Cuenta IBAN', valor: p => <span style={{ wordBreak: 'break-all' }}>{p.proveedor?.cuenta || '-'}</span> },
  ],
  Receptor: [
    { titulo: 'Correo para comprobantes', valor: p => <>{p.receptor?.correoComprobantes || p.correo || '-'}{p.receptor?.exonerado && <span style={{ display: 'block', marginTop: 4 }}><Insignia label="Exonerado" color="yellow" /></span>}</> },
    { titulo: 'Actividad económica', valor: p => p.receptor?.actividad || '-' },
  ],
  Empresa: [
    { titulo: 'Tipo y comisión', valor: p => (p.empresa ? `${p.empresa.tipo} · ${p.empresa.comision} %` : '-') },
    { titulo: 'Tarifa', valor: p => (p.empresa ? <>{p.empresa.tarifa}<span style={{ display: 'block', fontSize: 11.5, color: C.n700 }}>{p.empresa.credito ? 'Con crédito' : 'Sin crédito'}</span></> : '-') },
  ],
};

/** Campos de un rol dentro del formulario del perfil. */
export function CamposRol({ rol, p, setP }: { rol: RolPerfil; p: Perfil; setP: (p: Perfil) => void }) {
  const titulo = (t: string) => <p style={{ margin: 0, fontSize: 12.5, fontWeight: 500, color: C.n900, gridColumn: '1 / -1' }}>{t}</p>;
  if (rol === 'Cliente') {
    const d = p.cliente ?? DEFECTO.Cliente.cliente;
    const set = (x: Partial<DatosCliente>) => setP({ ...p, cliente: { ...d, ...x } });
    return <Grid cols={4}>{titulo('Cliente · ACC y FDK')}
      <Campo label="Condición de pago"><Select value={d.condicion} onChange={v => set({ condicion: v as DatosCliente['condicion'], plazo: v === 'Contado' ? 0 : d.plazo || 30 })} options={ops(['Contado', 'Crédito'])} /></Campo>
      <Campo label="Plazo (días)"><Input type="number" value={d.plazo} disabled={d.condicion === 'Contado'} onChange={v => set({ plazo: Number(v) || 0 })} /></Campo>
      <Campo label="Límite de crédito"><Input type="number" value={d.limite} disabled={d.condicion === 'Contado'} onChange={v => set({ limite: Number(v) || 0 })} /></Campo>
      <Campo label="Moneda"><Select value={d.moneda} onChange={v => set({ moneda: v })} options={ops(MONEDAS)} /></Campo>
    </Grid>;
  }
  if (rol === 'Proveedor') {
    const d = p.proveedor ?? DEFECTO.Proveedor.proveedor;
    const set = (x: Partial<DatosProveedor>) => setP({ ...p, proveedor: { ...d, ...x } });
    return <Grid cols={4}>{titulo('Proveedor · ACC')}
      <Campo label="Categoría"><Select value={d.categoria} onChange={v => set({ categoria: v })} options={ops(['Alimentos y bebidas', 'Servicios', 'Suministros', 'Servicios públicos'])} /></Campo>
      <Campo label="Plazo de pago (días)"><Input type="number" value={d.plazo} onChange={v => set({ plazo: Number(v) || 0 })} /></Campo>
      <Campo label="Moneda"><Select value={d.moneda} onChange={v => set({ moneda: v })} options={ops(MONEDAS)} /></Campo>
      <Campo label="Cuenta IBAN"><Input value={d.cuenta} onChange={v => set({ cuenta: v })} placeholder="CR…" /></Campo>
    </Grid>;
  }
  if (rol === 'Receptor') {
    const d = p.receptor ?? DEFECTO.Receptor.receptor;
    const set = (x: Partial<DatosReceptor>) => setP({ ...p, receptor: { ...d, ...x } });
    return <Grid cols={4}>{titulo('Receptor de comprobantes · DICR')}
      <Campo label="Correo para comprobantes" style={{ gridColumn: 'span 2' }}><Input type="email" value={d.correoComprobantes} onChange={v => set({ correoComprobantes: v })} placeholder={p.correo} /></Campo>
      <Campo label="Actividad económica"><Input value={d.actividad} onChange={v => set({ actividad: v })} /></Campo>
      <Campo label="Provincia"><Select value={d.provincia} onChange={v => set({ provincia: v })} options={ops(['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón'])} /></Campo>
      <div style={{ gridColumn: '1 / -1' }}><Checkbox checked={d.exonerado} onChange={b => set({ exonerado: b })} label="Exonerado de impuestos" /></div>
    </Grid>;
  }
  const d = p.empresa ?? DEFECTO.Empresa.empresa;
  const set = (x: Partial<DatosEmpresa>) => setP({ ...p, empresa: { ...d, ...x } });
  return <Grid cols={4}>{titulo('Empresa · FDK')}
    <Campo label="Tipo"><Select value={d.tipo} onChange={v => set({ tipo: v as DatosEmpresa['tipo'] })} options={ops(['Agencia', 'Corporativo', 'OTA', 'Mayorista'])} /></Campo>
    <Campo label="Tarifa"><Input value={d.tarifa} onChange={v => set({ tarifa: v })} /></Campo>
    <Campo label="Comisión (%)"><Input type="number" value={d.comision} onChange={v => set({ comision: Number(v) || 0 })} /></Campo>
    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}><Checkbox checked={d.credito} onChange={b => set({ credito: b })} label="Tiene crédito" /></div>
  </Grid>;
}
