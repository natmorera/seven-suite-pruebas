'use client';
// Certificado (llave criptográfica) del emisor: estado, archivo, vigencia y PIN,
// con los botones para subir el .p12 o generar uno nuevo. Lo usan Información
// tributaria y el asistente inicial.
import { useRef, useState } from 'react';
import { C, FONT, Button, FormField, Input, Modal, StatusBadge, radius } from '@/components/ui/primitives';
import { IcLock } from '@/components/ui/icons';
import LlaveCriptograficaModal from './LlaveCriptograficaModal';
import type { EmisorRow } from './EmisoresPage';

function diasHasta(iso: string | null | undefined) {
  if (!iso) return null;
  return Math.ceil((new Date(iso + 'T00:00:00').getTime() - Date.now()) / 86_400_000);
}

export function insigniaLlave(emisor: EmisorRow) {
  const dias = diasHasta(emisor.vigencia_llave);
  return !emisor.llave_cargada ? <StatusBadge label="Sin certificado" color="red" />
    : dias !== null && dias < 0 ? <StatusBadge label="Certificado vencido" color="red" />
      : dias !== null && dias <= 30 ? <StatusBadge label={`Vence en ${dias} días`} color="yellow" />
        : <StatusBadge label="Certificado vigente" color="green" />;
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, color: C.n700 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: C.n900, marginTop: 2, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{children || '-'}</div>
    </div>
  );
}

export default function CertificadoEmisor({ emisor, puedeCambiar = true, onCambio }: {
  emisor: EmisorRow; puedeCambiar?: boolean; onCambio: (mensaje: string) => void;
}) {
  const [modal, setModal] = useState<'subir' | 'generar' | null>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
        <Dato label="Estado">{insigniaLlave(emisor)}</Dato>
        <Dato label="Archivo">{emisor.certificado_nombre ?? (emisor.llave_cargada ? 'llave.p12' : null)}</Dato>
        <Dato label="Vigente hasta">{emisor.vigencia_llave}</Dato>
        <Dato label="PIN">{emisor.tiene_pin ? '•••• guardado' : 'Sin PIN'}</Dato>
      </div>
      {emisor.certificado_emisor && <p style={{ fontSize: 11.5, color: C.n700, margin: 0 }}>A nombre de: {emisor.certificado_emisor}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        {puedeCambiar ? <>
          <Button onClick={() => setModal('subir')} icon={<IcLock />}>{emisor.llave_cargada ? 'Reemplazar .p12' : 'Subir .p12'}</Button>
          <Button variant="secondary" onClick={() => setModal('generar')}>Generar llave nueva</Button>
        </> : <span style={{ fontSize: 12, color: C.n700 }}>No tienes permiso para cambiar la llave.</span>}
      </div>
      <LlaveCriptograficaModal open={modal === 'generar'} emisor={emisor} onClose={() => setModal(null)} onSaved={() => { setModal(null); onCambio('Se generó la llave criptográfica.'); }} />
      {modal === 'subir' && <SubirP12Modal emisor={emisor} onClose={() => setModal(null)} onSubido={() => { setModal(null); onCambio('Se cargó el certificado.'); }} />}
    </div>
  );
}

export function SubirP12Modal({ emisor, onClose, onSubido }: { emisor: EmisorRow; onClose: () => void; onSubido: () => void }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  async function subir() {
    if (!archivo || !pin) { setError('Elige el archivo .p12 y escribe su PIN.'); return; }
    setSubiendo(true); setError(null);
    const fd = new FormData();
    fd.append('archivo', archivo); fd.append('pin', pin);
    const r = await fetch(`/api/emisores/${emisor.id}/llave`, { method: 'POST', body: fd });
    const d = await r.json();
    setSubiendo(false);
    if (!r.ok) { setError(d.error ?? 'No se pudo leer el certificado.'); return; }
    onSubido();
  }
  return (
    <Modal open title="Subir certificado .p12" onClose={onClose}
      footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={subir} disabled={subiendo}>{subiendo ? 'Validando…' : 'Subir certificado'}</Button>
      </div>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input ref={ref} type="file" accept=".p12,.pfx" style={{ display: 'none' }} onChange={e => setArchivo(e.target.files?.[0] ?? null)} />
        <button onClick={() => ref.current?.click()}
          style={{ border: `1.5px dashed ${archivo ? C.brand : C.brandBd}`, background: archivo ? C.brandBg : C.n000, borderRadius: radius.md, padding: '16px 14px', cursor: 'pointer', textAlign: 'left', fontFamily: FONT, fontSize: 12.5 }}>
          {archivo ? <>📄 <b>{archivo.name}</b> <span style={{ color: C.n700 }}>· cambiar</span></> : 'Selecciona el archivo .p12'}
        </button>
        <FormField label="PIN del .p12" required hint="Lo validamos con el archivo antes de guardarlo.">
          <Input value={pin} onChange={setPin} type="password" autoComplete="new-password" />
        </FormField>
        {error && <div style={{ fontSize: 12, color: C.error, background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
      </div>
    </Modal>
  );
}
