'use client';
// Compras › Facturas de compra: las facturas electrónicas de compra (08) que
// emitió la empresa, con su estado ante Hacienda y la compra que generaron.
// Misma tabla, columnas y filtros que Ventas.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { C, StatusBadge, Button, EmptyState } from '@/components/ui/primitives';
import { MontoCelda } from '@/components/ui/Monto';
import { ESTADO_DOC_COLOR, ESTADO_DOC_AYUDA } from '@/data/estadosHacienda';
import DocumentosTable, { type DocColumn, type RowAction } from './DocumentosTable';
import GenerarAsientoBoton from './GenerarAsientoBoton';
import { NumeroYClave } from '@/components/ui/NumeroClave';

export const URL_NUEVA_FEC = `/facturacion/emitidos/nuevo?tipo=${encodeURIComponent('Factura electrónica de compra')}`;

export interface Fec {
  id: string; numero_factura: string; cliente_nombre: string; receptor_identificacion: string | null; fecha_emision: string;
  clave?: string | null; estado: string; total: number; moneda: string; compra_id?: string | null; asiento_consecutivo?: string | null; tipo: string;
}

export function useFacturasCompra(version = 0) {
  const [lista, setLista] = useState<Fec[] | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch('/api/documentos').then(r => r.json()).then((d: Fec[]) => { if (vivo) setLista(d.filter(x => x.tipo === 'Factura electrónica de compra')); }).catch(() => { if (vivo) setLista([]); });
    return () => { vivo = false; };
  }, [version]);
  return lista;
}

const fecha = (s: string) => new Date(s).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
const SUB = { display: 'block', fontSize: 11, color: C.n700, marginTop: 2 } as const;
const url = (f: Fec) => `/facturacion/emitidos/${f.id.replace('#', '')}`;

const COLUMNAS: DocColumn<Fec>[] = [
  { key: 'documento', label: 'Documento', render: f => (
    <div>
      <a href={url(f)} style={{ color: C.brand, fontWeight: 500, textDecoration: 'underline' }}>{f.id}</a>
      <div style={{ marginTop: 2 }}><NumeroYClave numero={f.numero_factura} clave={f.clave} /></div>
    </div>
  ) },
  { key: 'proveedor', label: 'Proveedor', wrap: true, render: f => (
    <div style={{ minWidth: 110, maxWidth: 220 }}>{f.cliente_nombre}{f.receptor_identificacion && <span style={SUB}>Céd. {f.receptor_identificacion}</span>}</div>
  ) },
  { key: 'fecha', label: 'Fecha', render: f => fecha(f.fecha_emision) },
  { key: 'estado', label: 'Estado', render: f => (
    <div>
      <StatusBadge label={f.estado} color={ESTADO_DOC_COLOR[f.estado] ?? 'yellow'} title={ESTADO_DOC_AYUDA[f.estado]} />
      <span style={SUB}>{f.compra_id ? 'Registrada en Compras' : f.estado === 'Aceptado' ? 'Pendiente de registrar' : 'Se registra al aceptarse'}</span>
    </div>
  ) },
  { key: 'asiento', label: 'Asiento', render: f => f.asiento_consecutivo
      ? <span style={{ fontVariantNumeric: 'tabular-nums' }}>{f.asiento_consecutivo}</span>
      : f.estado === 'Aceptado' ? <GenerarAsientoBoton url={`/api/documentos/${f.id.replace('#', '')}/asiento`} compacto />
      : <span style={{ color: C.n700 }}>—</span> },
  { key: 'total', label: 'Total', align: 'right', render: f => <span style={{ display: 'inline-block', minWidth: 104, whiteSpace: 'nowrap' }}><MontoCelda valor={f.total} moneda={f.moneda} fuerte /></span> },
];

export default function FacturasCompraLista({ filas, total, vacio, contabilidad }: {
  filas: Fec[] | null; total: number; vacio?: React.ReactNode; contabilidad: boolean;
}) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<string | null>(null);
  if (!filas) return <p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p>;
  if (!total) return (
    <EmptyState message="Todavía no has emitido facturas de compra. Se usan cuando le compras a alguien que no factura electrónicamente (un productor, una persona no inscrita o un proveedor del exterior)."
      action={<Link href={URL_NUEVA_FEC}><Button>Agregar factura de compra</Button></Link>} />
  );
  const acciones = (f: Fec): RowAction<Fec>[] => [{ label: 'Ver detalle', grupo: 0, onClick: () => { window.location.href = url(f); } }];
  return (
    <DocumentosTable
      columns={contabilidad ? COLUMNAS : COLUMNAS.filter(c => c.key !== 'asiento')}
      rows={filas} rowKey={f => f.id} selected={sel}
      onToggleAll={c => setSel(c ? new Set(filas.map(f => f.id)) : new Set())}
      onToggleRow={(id, c) => setSel(s => { const n = new Set(s); if (c) n.add(id); else n.delete(id); return n; })}
      openMenuId={menu} onOpenMenuChange={setMenu} rowActions={acciones}
      onRowClick={f => { window.location.href = url(f); }}
      empty={vacio}
    />
  );
}
