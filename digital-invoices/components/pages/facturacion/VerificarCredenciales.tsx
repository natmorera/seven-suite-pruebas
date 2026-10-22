'use client';
// Botón «Verificar credenciales»: prueba el usuario y la contraseña contra
// Hacienda sin guardar nada. Sin contraseña escrita usa la guardada.
import { useState } from 'react';
import { C, Button } from '@/components/ui/primitives';
import { IcCheck, IcWarning } from '@/components/ui/icons';

export default function VerificarCredenciales({ emisorId, usuario, clave, ambiente, disabled }: {
  emisorId: string; usuario: string; clave: string; ambiente: string; disabled?: boolean;
}) {
  const [estado, setEstado] = useState<{ ok: boolean; mensaje: string; para: string } | null>(null);
  const [probando, setProbando] = useState(false);
  const firma = `${usuario}|${clave}|${ambiente}`;
  async function probar() {
    setProbando(true);
    const r = await fetch('/api/hacienda/credenciales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emisorId, usuario, clave, ambiente }) });
    const d = await r.json().catch(() => ({ ok: false, mensaje: 'No se pudo verificar.' }));
    setProbando(false);
    setEstado({ ok: Boolean(d.ok), mensaje: String(d.mensaje ?? ''), para: firma });
  }
  // Un resultado deja de valer si se cambia el usuario, la contraseña o el ambiente
  const vigente = estado?.para === firma ? estado : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <Button variant="secondary" onClick={probar} disabled={disabled || probando || !usuario.trim()}>{probando ? 'Verificando…' : 'Verificar credenciales'}</Button>
      {vigente && (
        <span role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: vigente.ok ? C.successDk : C.error }}>
          {vigente.ok ? <IcCheck className="w-3.5 h-3.5" /> : <IcWarning className="w-3.5 h-3.5" />}{vigente.mensaje}
        </span>
      )}
    </div>
  );
}
