'use client';
// Consecutivos de documentos: la misma tabla y el mismo editor en Empresa y en
// el onboarding. En el onboarding la empresa es nueva: no hay emitidos y el
// próximo número es el primero.
import { useEffect, useState } from 'react';
import { C, FONT, Button, FormField, Input, Select, InfoBox, DataTable, DataRow, Td, Modal, radius } from '@/components/ui/primitives';
import { IcEdit } from '@/components/ui/icons';
import { REINICIOS, proximoNumero, validarFormato, type ConsecutivoDoc, type Reinicio } from '@/lib/consecutivosDocumentos';

const etiquetaReinicio = (r: Reinicio) => REINICIOS.find(x => x.value === r)?.label ?? r;

export default function ConsecutivosDocumentos({ onboarding = false }: { onboarding?: boolean }) {
  const [lista, setLista] = useState<ConsecutivoDoc[] | null>(null);
  const [editando, setEditando] = useState<ConsecutivoDoc | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch('/api/empresa/consecutivos').then(r => r.json()).then(d => { if (vivo) setLista(d); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  const proximo = (c: ConsecutivoDoc) => proximoNumero(onboarding ? { ...c, enPeriodo: 0 } : c);
  const encabezados = onboarding ? ['Tipo', 'Formato', 'Reinicio', 'Primer número', 'Acciones'] : ['Tipo', 'Formato', 'Reinicio', 'Emitidos', 'Próximo número (hoy)', 'Acciones'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!onboarding && (
        <InfoBox>
          El contador lo lleva el sistema: sube solo al emitir cada documento y no se retrocede. Año, mes y reinicio salen de la fecha contable del documento. Un cambio de formato rige solo para los documentos nuevos; los ya emitidos conservan su número.
        </InfoBox>
      )}
      <DataTable headers={encabezados}>
        {!lista && <DataRow><Td colSpan={encabezados.length} muted>Cargando…</Td></DataRow>}
        {lista?.map(c => (
          <DataRow key={c.id}>
            <Td>{c.nombre}</Td>
            <Td>{c.formato}</Td>
            <Td>{etiquetaReinicio(c.reinicio)}</Td>
            {!onboarding && <Td>{c.emitidos}</Td>}
            <Td>{proximo(c)}</Td>
            <Td>
              <button onClick={() => setEditando(c)} aria-label={`Editar formato de ${c.nombre}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, display: 'flex' }}>
                <IcEdit className="w-3.5 h-3.5" />
              </button>
            </Td>
          </DataRow>
        ))}
      </DataTable>
      {editando && <EditarFormato c={editando} onboarding={onboarding} onClose={() => setEditando(null)} onGuardado={l => { setLista(l); setEditando(null); }} />}
    </div>
  );
}

function EditarFormato({ c, onboarding, onClose, onGuardado }: { c: ConsecutivoDoc; onboarding: boolean; onClose: () => void; onGuardado: (l: ConsecutivoDoc[]) => void }) {
  const [formato, setFormato] = useState(c.formato);
  const [reinicio, setReinicio] = useState<Reinicio>(c.reinicio);
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const error = validarFormato(formato, reinicio);
  const marcaN = formato.match(/\{N:\d{1,2}\}/)?.[0] ?? '{N:5}';
  const insertar = (m: string) => setFormato(f => (m.startsWith('{N:') ? f.replace(/\{N:\d{1,2}\}/g, '') : f) + m);
  // Al cambiar el reinicio el contador del período vuelve a 1
  const vista = !error ? proximoNumero({ formato, reinicio, enPeriodo: onboarding || reinicio !== c.reinicio ? 0 : c.enPeriodo, periodo: c.periodo }) : '';

  async function guardar() {
    setGuardando(true); setErrorServidor(null);
    const r = await fetch('/api/empresa/consecutivos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, formato, reinicio }) });
    const d = await r.json().catch(() => ({}));
    setGuardando(false);
    if (!r.ok) { setErrorServidor(d.error ?? 'No se pudo guardar.'); return; }
    onGuardado(d);
  }

  return (
    <Modal open title={`Editar formato — ${c.nombre}`} onClose={onClose} width={560}
      footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={guardar} disabled={Boolean(error) || guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
      </div>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FormField label="Formato" error={error ?? undefined}
            hint="Texto fijo más {AAAA} (año), {MM} (mes) y {N:k} (consecutivo con k dígitos, de 1 a 18). Año y mes salen de la fecha contable del documento.">
            <Input value={formato} onChange={setFormato} />
          </FormField>
          <div style={{ display: 'flex', gap: 8 }}>
            {['{AAAA}', '{MM}', marcaN].map(m => (
              <button key={m} onClick={() => insertar(m)} style={{ height: 30, padding: '0 12px', border: `1px solid ${C.n500}`, borderRadius: radius.sm, background: C.n000, cursor: 'pointer', fontSize: 12, fontFamily: FONT, color: C.n900 }}>{m}</button>
            ))}
          </div>
        </div>
        <FormField label="Reinicio" hint="Mensual exige {AAAA} y {MM} en el formato; anual exige {AAAA}. Así los números de distintos períodos no se repiten.">
          <Select value={reinicio} onChange={v => setReinicio(v as Reinicio)} options={REINICIOS} />
        </FormField>
        <div style={{ padding: '12px 14px', border: `1px solid ${C.n500}`, borderRadius: radius.md, fontSize: 13, color: C.n700 }}>
          {onboarding ? 'Primer número con fecha de hoy: ' : 'Próximo número con fecha de hoy: '}<b style={{ color: C.n900, fontVariantNumeric: 'tabular-nums' }}>{vista || '—'}</b>
        </div>
        {errorServidor && <div role="alert" style={{ fontSize: 12, color: C.error }}>{errorServidor}</div>}
      </div>
    </Modal>
  );
}
