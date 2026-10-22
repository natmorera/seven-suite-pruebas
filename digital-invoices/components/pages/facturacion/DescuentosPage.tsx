'use client';
// Descuentos: catálogo como el de Impuestos. Cada descuento lleva el código
// de Hacienda (01 regalía … 99 otros), si es % o monto fijo, y su valor. En
// la factura se eligen desde el modal de descuento de cada línea.
import { useEffect, useState } from 'react';
import { conContabilidad } from '@/lib/modulosCliente';
import { PageHeader, C, Button, DataTable, DataRow, Td, StatusBadge, Modal, FormField, Input, Select, Switch } from '@/components/ui/primitives';
import { IcTrash, IcEdit } from '@/components/ui/icons';
import { useListaFiltrable } from '@/components/ui/ListaFiltrable';
import { CODIGOS_DESCUENTO } from '@/lib/calculoFactura';
import { MontoCelda, MontoInput, fmtMonto } from '@/components/ui/Monto';
import { CuentaCampo } from './CuentaPicker';
import { usePermisos } from '@/lib/permisosCliente';
import { segunPais } from '@/lib/paisActual';

export interface Descuento {
  id: string; nombre: string; codigo: string; naturaleza: string; tipo: 'porcentaje' | 'monto'; valor: number; descripcion: string; activo: number; cuenta?: string; codigo_otro?: string;
}
const VACIO = { nombre: '', codigo: '07', naturaleza: '', codigoOtro: '', tipo: 'porcentaje' as 'porcentaje' | 'monto', valor: '', descripcion: '', cuenta: '' };
const labelCodigo = (c: string) => CODIGOS_DESCUENTO.find(x => x.value === c)?.label ?? c;

export default function DescuentosPage({ hideHeader, addSignal }: { hideHeader?: boolean; addSignal?: number } = {}) {
  const { puede } = usePermisos();
  const [items, setItems] = useState<Descuento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState(VACIO);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Carga con contador de versión: `cargar()` pide recargar y el efecto
  // hace el fetch (sin setState síncrono dentro del efecto).
  const [version, setVersion] = useState(0);
  const cargar = () => setVersion(v => v + 1);
  useEffect(() => {
    let vivo = true;
    fetch('/api/descuentos').then(r => r.json()).then(d => { if (vivo) { setItems(d); setCargando(false); } }).catch(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [version]);

  // Señal del botón «+» del encabezado: se atiende al cambiar (durante el
  // render, como recomienda React para derivar de props).
  const [senal, setSenal] = useState(addSignal);
  if (addSignal !== senal) { setSenal(addSignal); if (addSignal) { setEditId(null); setF(VACIO); setError(null); setOpen(true); } }

  function abrirEditar(d: Descuento) {
    setEditId(d.id); setF({ nombre: d.nombre, codigo: d.codigo, naturaleza: d.naturaleza, codigoOtro: d.codigo_otro ?? '', tipo: d.tipo, valor: String(d.valor), descripcion: d.descripcion, cuenta: d.cuenta ?? '' });
    setError(null); setOpen(true);
  }
  async function guardar() {
    const v = Number(f.valor);
    if (!f.nombre.trim()) { setError('Escribe el nombre.'); return; }
    if (!(v > 0)) { setError('Escribe el valor del descuento.'); return; }
    if (f.tipo === 'porcentaje' && v > 100) { setError('El porcentaje no puede ser mayor a 100.'); return; }
    if (f.codigo === '99' && (!f.naturaleza.trim() || !f.codigoOtro.trim())) { setError('Con el código 99 (otros), indica qué descuento es y su naturaleza.'); return; }
    if (!f.cuenta && conContabilidad()) { setError('Elige la cuenta contable del descuento.'); return; }
    setGuardando(true);
    const body = JSON.stringify({ ...f, valor: v, naturaleza: f.codigo === '99' ? f.naturaleza : '', codigoOtro: f.codigo === '99' ? f.codigoOtro : '' });
    await fetch(editId ? `/api/descuentos/${editId}` : '/api/descuentos', { method: editId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body });
    setGuardando(false); setOpen(false); cargar();
  }
  async function eliminar(id: string) {
    if (!window.confirm('¿Eliminar este descuento?')) return;
    setItems(is => is.filter(i => i.id !== id));
    await fetch(`/api/descuentos/${id}`, { method: 'DELETE' });
  }
  async function toggleActivo(d: Descuento, valor: boolean) {
    setItems(is => is.map(x => x.id === d.id ? { ...x, activo: valor ? 1 : 0 } : x));
    await fetch(`/api/descuentos/${d.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: valor }) });
  }
  const lista = useListaFiltrable({
    items, texto: d => `${d.nombre} ${labelCodigo(d.codigo)} ${d.descripcion}`, placeholder: 'Buscar por nombre, código o descripción',
    defs: [
      { tipo: 'lista', clave: 'tipo', label: 'Tipo', opciones: [{ value: 'porcentaje', label: 'Porcentaje' }, { value: 'monto', label: 'Monto fijo' }], valor: d => d.tipo },
      { tipo: 'lista', clave: 'codigo', label: segunPais('Código de Hacienda'), opciones: [...new Set(items.map(d => d.codigo))].map(v => ({ value: v, label: `${v} · ${labelCodigo(v)}` })), valor: d => d.codigo },
      { tipo: 'check', clave: 'activos', label: 'Solo activos', cumple: d => Boolean(Number(d.activo)) },
    ],
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {!hideHeader && <PageHeader title="Descuentos"><Button onClick={() => { setEditId(null); setF(VACIO); setOpen(true); }}>+ Nuevo descuento</Button></PageHeader>}
      {lista.barra}
      {lista.chips}
      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {cargando ? <p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p> : (
          <DataTable headers={['Nombre', segunPais('Código de Hacienda'), 'Tipo', 'Valor', 'Descripción', 'Activo', '']}>
            {lista.filasPagina.map(d => (
              <DataRow key={d.id}>
                <Td>{d.nombre}</Td>
                <Td muted>{d.codigo} · {labelCodigo(d.codigo)}{d.codigo === '99' && d.naturaleza ? ` (${d.naturaleza})` : ''}</Td>
                <Td><StatusBadge label={d.tipo === 'monto' ? 'Monto fijo' : 'Porcentaje'} color={d.tipo === 'monto' ? 'blue' : 'brand'} /></Td>
                <Td width="130px">{d.tipo === 'monto' ? <MontoCelda valor={d.valor} simbolo="" /> : <span style={{ display: 'block', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtMonto(d.valor)}%</span>}</Td>
                <Td muted>{d.descripcion}</Td>
                <Td><Switch checked={Boolean(d.activo)} onChange={v => toggleActivo(d, v)} /></Td>
                <Td right>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    {puede('fe.config.descuentos.editar') && <button title="Editar" onClick={() => abrirEditar(d)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, display: 'inline-flex', padding: 4 }}><IcEdit className="w-3.5 h-3.5" /></button>}
                    {puede('fe.config.descuentos.eliminar') && <button title="Eliminar" onClick={() => eliminar(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.error, display: 'inline-flex', padding: 4 }}><IcTrash className="w-4 h-4" /></button>}
                  </div>
                </Td>
              </DataRow>
            ))}
            {lista.filtrados.length === 0 && (
              <DataRow><Td colSpan={7}>{lista.vacio('Todavía no hay descuentos. Usa "+ Nuevo descuento".')}</Td></DataRow>
            )}
          </DataTable>
        )}
      </div>

      {!cargando && lista.paginacion}
      <Modal open={open} title={editId ? 'Editar descuento' : 'Nuevo descuento'} onClose={() => setOpen(false)}
        footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
        </div>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={{ fontSize: 12, color: C.error, background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
          <FormField label="Nombre" required><Input value={f.nombre} onChange={v => setF(x => ({ ...x, nombre: v }))} placeholder="Ej. Comisión agencia de viajes 15%" /></FormField>
          <FormField label={segunPais('Código de Hacienda')} hint={segunPais('Clasificación de Hacienda para este descuento.')}>
            <Select value={f.codigo} onChange={v => setF(x => ({ ...x, codigo: v }))} options={CODIGOS_DESCUENTO.map(c => ({ value: c.value, label: `${c.value} - ${c.label}` }))} />
          </FormField>
          {f.codigo === '99' && <FormField label="¿Qué otro descuento es?" required hint={segunPais('Código de Hacienda para este descuento.')}><Input value={f.codigoOtro} onChange={v => setF(x => ({ ...x, codigoOtro: v }))} placeholder="Ej. Descuento por lealtad" /></FormField>}
          {f.codigo === '99' && <FormField label="Naturaleza del descuento" required><Input value={f.naturaleza} onChange={v => setF(x => ({ ...x, naturaleza: v }))} /></FormField>}
          <CuentaCampo titulo="Cuenta contable del descuento" value={f.cuenta} onChange={c => setF(x => ({ ...x, cuenta: c }))} grupoInicial="4" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label="Tipo"><Select value={f.tipo} onChange={v => setF(x => ({ ...x, tipo: v as 'porcentaje' | 'monto' }))} options={[{ value: 'porcentaje', label: 'Porcentaje (%)' }, { value: 'monto', label: 'Monto fijo' }]} /></FormField>
            <FormField label={f.tipo === 'monto' ? 'Monto' : 'Porcentaje'} required hint={f.tipo === 'monto' ? 'Se aplica en la moneda de la factura.' : undefined}>
              {f.tipo === 'monto'
                ? <MontoInput value={f.valor} onChange={v => setF(x => ({ ...x, valor: v }))} simbolo="" />
                : <MontoInput value={f.valor} onChange={v => setF(x => ({ ...x, valor: v }))} simbolo="%" />}
            </FormField>
          </div>
          <FormField label="Descripción" hint="Opcional. Por ejemplo, cuándo aplica."><Input value={f.descripcion} onChange={v => setF(x => ({ ...x, descripcion: v }))} /></FormField>
        </div>
      </Modal>
    </div>
  );
}
