'use client';
import { useEffect, useState } from 'react';
import { PageHeader, C, Button, DataTable, DataRow, Td, Modal, FormField, Input, Select, Switch, SearchInput, EmptyState } from '@/components/ui/primitives';
import { IcTrash, IcEdit } from '@/components/ui/icons';
import InfoTooltip from './InfoTooltip';

export interface Retencion {
  id: string; nombre: string; tipo: string; porcentaje: number; descripcion: string; activo: number;
}

const TIPOS = ['IVA', 'Renta', 'Otro'];

export default function RetencionesPage({ hideHeader, addSignal }: { hideHeader?: boolean; addSignal?: number } = {}) {
  const [items, setItems] = useState<Retencion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState(TIPOS[0]);
  const [porcentaje, setPorcentaje] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Carga con contador de versión: `cargar()` pide recargar y el efecto
  // hace el fetch (sin setState síncrono dentro del efecto).
  const [version, setVersion] = useState(0);
  const cargar = () => setVersion(v => v + 1);
  useEffect(() => {
    let vivo = true;
    fetch('/api/retenciones').then(r => r.json()).then(d => { if (vivo) { setItems(d); setCargando(false); } }).catch(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [version]);

  // Señal del botón «+» del encabezado: se atiende al cambiar (durante el
  // render, como recomienda React para derivar de props).
  const [senal, setSenal] = useState(addSignal);
  if (addSignal !== senal) { setSenal(addSignal); if (addSignal) { abrirNuevo(); } }

  function abrirNuevo() {
    setEditId(null); setNombre(''); setTipo(TIPOS[0]); setPorcentaje(''); setDescripcion(''); setError(null);
    setOpen(true);
  }
  function abrirEditar(r: Retencion) {
    setEditId(r.id); setNombre(r.nombre); setTipo(r.tipo || TIPOS[0]); setPorcentaje(String(r.porcentaje)); setDescripcion(r.descripcion);
    setError(null); setOpen(true);
  }

  async function guardar() {
    if (!nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    setGuardando(true);
    const body = JSON.stringify({ nombre, tipo, porcentaje: Number(porcentaje) || 0, descripcion });
    if (editId) {
      await fetch(`/api/retenciones/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body });
    } else {
      await fetch('/api/retenciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    }
    setGuardando(false);
    setOpen(false);
    cargar();
  }
  async function eliminar(id: string) {
    setItems(is => is.filter(i => i.id !== id));
    await fetch(`/api/retenciones/${id}`, { method: 'DELETE' });
  }
  async function toggleActivo(r: Retencion, valor: boolean) {
    setItems(is => is.map(x => x.id === r.id ? { ...x, activo: valor ? 1 : 0 } : x));
    await fetch(`/api/retenciones/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: valor }) });
  }

  const filtrados = items.filter(r => `${r.nombre} ${r.tipo} ${r.descripcion}`.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {!hideHeader && <PageHeader title="Retenciones"><Button onClick={abrirNuevo}>+ Nueva retención</Button></PageHeader>}
      <div style={{ padding: 24, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre, tipo…" width={240} />
          <InfoTooltip text="Una retención es distinta de una exoneración: aquí el cliente (normalmente un gran contribuyente) retiene un % del pago y lo gira directo a Hacienda, en vez de pagártelo a ti." />
        </div>
        {cargando ? <p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p> : (
          <DataTable headers={['Nombre', 'Tipo', 'Porcentaje', 'Descripción', 'Activo', '']}>
            {filtrados.map(r => (
              <DataRow key={r.id}>
                <Td>{r.nombre}</Td>
                <Td muted>{r.tipo}</Td>
                <Td>{r.porcentaje}%</Td>
                <Td muted>{r.descripcion}</Td>
                <Td><Switch checked={Boolean(r.activo)} onChange={v => toggleActivo(r, v)} /></Td>
                <Td right>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button title="Editar" onClick={() => abrirEditar(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, display: 'inline-flex', padding: 4 }}><IcEdit className="w-3.5 h-3.5" /></button>
                    <button title="Eliminar" onClick={() => eliminar(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.error, display: 'inline-flex', padding: 4 }}><IcTrash className="w-4 h-4" /></button>
                  </div>
                </Td>
              </DataRow>
            ))}
            {filtrados.length === 0 && (
              <DataRow><Td colSpan={6}>
                <EmptyState message={items.length === 0 ? 'Todavía no hay retenciones registradas. Usa "+ Nueva retención" para empezar.' : 'Ninguna retención coincide con la búsqueda.'} />
              </Td></DataRow>
            )}
          </DataTable>
        )}
      </div>

      <Modal open={open} title={editId ? 'Editar retención' : 'Nueva retención'} onClose={() => setOpen(false)}
        footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
        </div>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={{ fontSize: 12, color: C.error, background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
          <FormField label="Nombre" required><Input value={nombre} onChange={setNombre} placeholder="Nombre de la retención" /></FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label="Tipo"><Select value={tipo} onChange={setTipo} options={TIPOS.map(t => ({ value: t, label: t }))} /></FormField>
            <FormField label="Porcentaje"><Input value={porcentaje} onChange={setPorcentaje} type="number" placeholder="0%" /></FormField>
          </div>
          <FormField label="Descripción" hint="Opcional"><Input value={descripcion} onChange={setDescripcion} /></FormField>
        </div>
      </Modal>
    </div>
  );
}
