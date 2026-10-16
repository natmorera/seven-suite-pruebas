'use client';
// Consecutivos de documentos: la misma tabla y el mismo editor en Empresa y en
// el onboarding. En el onboarding la empresa es nueva: no hay emitidos y el
// próximo número es el primero.
import { useState } from 'react';
import { InfoBox, Modal, RowAction } from '@/components/ui/primitives';
import { C, FONT, radius } from '@/components/ui/tokens';
import { Button, FormField, Input, Select } from '@/components/ui/formulario';
import { DataTable, DataRow, Td } from '@/components/ui/tabla';
import { IcEdit } from '@/components/ui/icons';
import { REINICIOS, consecutivosAlmacen, guardarConsecutivo, proximoNumero, validarFormato, type ConsecutivoDoc, type Reinicio } from './datos/consecutivos';
import { useAlmacen } from './datos/almacen';

const etiquetaReinicio = (r: Reinicio) => REINICIOS.find(x => x.value === r)?.label ?? r;

export default function ConsecutivosDocumentos({ onboarding = false }: { onboarding?: boolean }) {
  const lista = useAlmacen(consecutivosAlmacen);
  const [editando, setEditando] = useState<ConsecutivoDoc | null>(null);
  const proximo = (c: ConsecutivoDoc) => proximoNumero(onboarding ? { ...c, enPeriodo: 0 } : c);
  const encabezados = onboarding
    ? ['Tipo', 'Formato', 'Reinicio', 'Primer número', 'Acciones']
    : ['Tipo', 'Formato', 'Reinicio', 'Emitidos', 'Próximo número (hoy)', 'Acciones'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!onboarding && (
        <InfoBox>
          El contador lo lleva el sistema: sube solo al emitir cada documento y no se retrocede. Año, mes y reinicio salen de la fecha contable del documento. Un cambio de formato rige solo para los documentos nuevos; los ya emitidos conservan su número.
        </InfoBox>
      )}
      <DataTable headers={encabezados}>
        {lista.map(c => (
          <DataRow key={c.id}>
            <Td>{c.nombre}</Td>
            <Td>{c.formato}</Td>
            <Td>{etiquetaReinicio(c.reinicio)}</Td>
            {!onboarding && <Td>{c.emitidos}</Td>}
            <Td>{proximo(c)}</Td>
            <Td><RowAction title={`Editar formato de ${c.nombre}`} onClick={() => setEditando(c)}><IcEdit className="w-3.5 h-3.5" /></RowAction></Td>
          </DataRow>
        ))}
      </DataTable>
      {editando && <EditarFormato c={editando} onboarding={onboarding} onClose={() => setEditando(null)} />}
    </div>
  );
}

function EditarFormato({ c, onboarding, onClose }: { c: ConsecutivoDoc; onboarding: boolean; onClose: () => void }) {
  const [formato, setFormato] = useState(c.formato);
  const [reinicio, setReinicio] = useState<Reinicio>(c.reinicio);
  const error = validarFormato(formato, reinicio);
  const marcaN = formato.match(/\{N:\d{1,2}\}/)?.[0] ?? '{N:5}';
  // Solo puede haber un {N:k}: al insertarlo se quita el que hubiera
  const insertar = (m: string) => setFormato(f => (m.startsWith('{N:') ? f.replace(/\{N:\d{1,2}\}/g, '') : f) + m);
  // Al cambiar el reinicio el contador del período vuelve a 1
  const vista = error ? '' : proximoNumero({ formato, reinicio, enPeriodo: onboarding || reinicio !== c.reinicio ? 0 : c.enPeriodo, periodo: c.periodo });
  const cambiado = formato.trim() !== c.formato || reinicio !== c.reinicio;

  return (
    <Modal open title={`Editar formato — ${c.nombre}`} onClose={onClose}
      footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => { guardarConsecutivo(c.id, formato, reinicio); onClose(); }} disabled={Boolean(error) || !cambiado}>Guardar</Button>
      </div>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FormField label="Formato" error={error ?? undefined}
            hint="Texto fijo más {AAAA} (año), {MM} (mes) y {N:k} (consecutivo con k dígitos, de 1 a 18). Año y mes salen de la fecha contable del documento.">
            <Input value={formato} onChange={setFormato} />
          </FormField>
          <div style={{ display: 'flex', gap: 8 }}>
            {['{AAAA}', '{MM}', marcaN].map(m => (
              <button key={m} type="button" onClick={() => insertar(m)} style={{ height: 30, padding: '0 12px', border: `1px solid ${C.n500}`, borderRadius: radius.sm, background: C.n000, cursor: 'pointer', fontSize: 12, fontFamily: FONT, color: C.n900 }}>{m}</button>
            ))}
          </div>
        </div>
        <FormField label="Reinicio" hint="Mensual exige {AAAA} y {MM} en el formato; anual exige {AAAA}. Así los números de distintos períodos no se repiten.">
          <Select value={reinicio} onChange={v => setReinicio(v as Reinicio)} options={REINICIOS} />
        </FormField>
        <div style={{ padding: '12px 14px', border: `1px solid ${C.n500}`, borderRadius: radius.md, fontSize: 12, color: C.n700 }}>
          {onboarding ? 'Primer número con fecha de hoy: ' : 'Próximo número con fecha de hoy: '}<b style={{ color: C.n900, fontWeight: 600 }}>{vista || '—'}</b>
        </div>
      </div>
    </Modal>
  );
}
