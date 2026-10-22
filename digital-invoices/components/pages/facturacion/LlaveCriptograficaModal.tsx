'use client';
import { useState } from 'react';
import { Modal, FormField, Input, Button, C, InfoBox } from '@/components/ui/primitives';
import type { EmisorRow } from './EmisoresPage';

type Paso = 'formulario' | 'listo';

export default function LlaveCriptograficaModal({
  open, emisor, onClose, onSaved,
}: {
  open: boolean;
  emisor: EmisorRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [paso, setPaso] = useState<Paso>('formulario');
  const [pin, setPin] = useState('');
  const [confirmacionPin, setConfirmacionPin] = useState('');
  const [verPin, setVerPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [archivoBase64, setArchivoBase64] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState('llave.p12');

  if (!emisor) return null;

  function limpiarYcerrar() {
    setPaso('formulario'); setPin(''); setConfirmacionPin(''); setError(null); setArchivoBase64(null);
    onClose();
  }

  async function generar() {
    setError(null);
    if (pin.length < 4) { setError('El PIN debe tener al menos 4 caracteres.'); return; }
    if (pin !== confirmacionPin) { setError('El PIN y su confirmación no coinciden.'); return; }
    setGenerando(true);
    const res = await fetch(`/api/emisores/${emisor!.id}/llave/generar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin, confirmacionPin }),
    });
    const data = await res.json();
    setGenerando(false);
    if (!res.ok) { setError(data.error ?? 'No se pudo generar la llave.'); return; }
    setArchivoBase64(data.archivoBase64);
    setNombreArchivo(data.nombreArchivo);
    setPaso('listo');
  }

  function descargar() {
    if (!archivoBase64) return;
    const bytes = atob(archivoBase64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: 'application/x-pkcs12' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombreArchivo; a.click();
    URL.revokeObjectURL(url);
  }

  if (paso === 'listo') {
    return (
      <Modal open={open} title="" onClose={() => { limpiarYcerrar(); onSaved(); }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '10px 0 4px', textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </div>
          <b style={{ fontSize: 16 }}>Se generó la llave criptográfica</b>
          <p style={{ fontSize: 12, color: C.n700, margin: 0, maxWidth: 380 }}>
            Guarda una copia de este archivo en un lugar seguro. La necesitarás si cambias de equipo o de servidor.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 320, marginTop: 8 }}>
            <Button onClick={descargar}>Descargar llave criptográfica</Button>
            <Button variant="secondary" onClick={() => { limpiarYcerrar(); onSaved(); }}>Continuar</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} title="Generar llave criptográfica" onClose={limpiarYcerrar}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={limpiarYcerrar}>Cancelar</Button>
          <Button onClick={generar} disabled={generando}>{generando ? 'Generando…' : 'Generar'}</Button>
        </div>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <InfoBox>
          La llave nueva de <b>{emisor.nombre_comercial}</b> reemplaza a la anterior, que deja de servir para firmar comprobantes.
        </InfoBox>

        {error && (
          <div style={{ fontSize: 12, color: C.error, background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '8px 12px' }}>{error}</div>
        )}

        <p style={{ fontSize: 12, margin: 0 }}>Crea un <b>PIN</b> de al menos <b>4 caracteres</b>. Lo necesitarás para usar la llave.</p>
        <FormField label="PIN">
          <div style={{ position: 'relative' }}>
            <Input value={pin} onChange={setPin} type={verPin ? 'text' : 'password'} />
            <button type="button" onClick={() => setVerPin(v => !v)}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.n700 }}>
              {verPin ? '🙈' : '👁'}
            </button>
          </div>
        </FormField>
        <FormField label="Confirma el PIN">
          <Input value={confirmacionPin} onChange={setConfirmacionPin} type={verPin ? 'text' : 'password'} />
        </FormField>
      </div>
    </Modal>
  );
}
