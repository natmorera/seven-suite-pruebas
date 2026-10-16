'use client';
// Cambiar la actividad de la empresa en una o varias compras ya importadas,
// y opcionalmente dejarla como la actividad de sus proveedores.
import { useMemo, useState } from 'react';
import { C, FONT, Modal, Button, Select, Checkbox } from '@/components/ui/primitives';
import type { EmisorInfo } from './comprasComun';

export function actividadesDeEmpresa(emisores: EmisorInfo[]): string[] {
  const e = emisores.find(x => Number(x.activo) === 1) ?? emisores[0];
  let acts: { codigo: string; nombre: string; principal?: boolean }[] = [];
  try { acts = e?.actividades_json ? JSON.parse(e.actividades_json) : []; } catch { acts = []; }
  const l = acts.sort((a, b) => Number(Boolean(b.principal)) - Number(Boolean(a.principal))).map(a => `${a.codigo} - ${a.nombre}`);
  return l.length ? l : e?.actividad_economica ? [e.actividad_economica] : [];
}

export default function CambiarActividadModal({ ids, actual, emisores, onClose, onHecho }: {
  ids: string[]; actual?: string | null; emisores: EmisorInfo[]; onClose: () => void; onHecho: (m: string) => void;
}) {
  const opciones = useMemo(() => actividadesDeEmpresa(emisores), [emisores]);
  const [actividad, setActividad] = useState(actual && opciones.includes(actual) ? actual : opciones[0] ?? '');
  const [recordar, setRecordar] = useState(true);
  const [guardando, setGuardando] = useState(false);
  async function guardar() {
    setGuardando(true);
    const r = await fetch('/api/recepcion/actividad', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, actividad, recordar }) });
    const d = await r.json().catch(() => ({}));
    setGuardando(false);
    if (!r.ok) { onHecho(d.error ?? 'No se pudo cambiar la actividad.'); return; }
    onHecho(`Actividad cambiada en ${ids.length} compra${ids.length === 1 ? '' : 's'}${recordar && d.proveedores ? ` y en ${d.proveedores} proveedor${d.proveedores === 1 ? '' : 'es'}` : ''}.`);
  }
  return (
    <Modal open title={ids.length === 1 ? 'Actividad de la compra' : `Actividad de ${ids.length} compras`} onClose={onClose}
      footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={guardar} disabled={!actividad || guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
      </div>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT }}>
        <p style={{ margin: 0, fontSize: 12.5, color: C.n700 }}>La actividad de la empresa a la que corresponde{ids.length === 1 ? ' esta compra' : 'n estas compras'}. Se usa en el Reporte de IVA y en el de Actividad económica.</p>
        <Select value={actividad} onChange={setActividad} options={opciones.map(a => ({ value: a, label: a }))} />
        <Checkbox checked={recordar} onChange={setRecordar} label={ids.length === 1 ? 'Usarla también en las próximas compras de este proveedor' : 'Usarla también en las próximas compras de estos proveedores'} />
      </div>
    </Modal>
  );
}
