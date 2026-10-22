'use client';
// Sección «API Key» de un módulo de la suite (DICR, DIGT, ACC, ANA, FDK…):
// la llave con la que Management (MAN) se conecta a este módulo, para copiarla. Sin dependencias del resto del proyecto:
// se copia igual en cada módulo; cada uno decide dónde guarda la llave.
import { useEffect, useState } from 'react';

export interface LlaveModulo { clave: string; creada: string }
const FONT = 'Montserrat, system-ui, sans-serif';
const N900 = '#0F0F0F', N700 = '#757575', N500 = '#ECECEC', N200 = '#F9F9F9';

const enmascarar = (c: string) => (c.length > 16 ? `${c.slice(0, 12)}${'•'.repeat(16)}${c.slice(-4)}` : c);
const fecha = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? '-' : d.toLocaleString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };

async function copiar(texto: string) {
  try { await navigator.clipboard.writeText(texto); return true; } catch {
    const t = document.createElement('textarea'); t.value = texto; document.body.appendChild(t); t.select();
    const ok = document.execCommand('copy'); t.remove(); return ok;
  }
}

function Campo({ etiqueta, valor, mostrar, onMostrar, ayuda, marca }: { etiqueta: string; valor: string; mostrar?: boolean; onMostrar?: () => void; ayuda?: string; marca: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: N900 }}>{etiqueta}</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <code aria-label={etiqueta} style={{ flex: '1 1 320px', minWidth: 0, height: 34, display: 'flex', alignItems: 'center', padding: '0 12px', border: `1px solid ${N500}`, borderRadius: 4, background: N200,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5, color: N900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {onMostrar && !mostrar ? enmascarar(valor) : valor}
        </code>
        {onMostrar && <button type="button" onClick={onMostrar} style={boton(false, marca)}>{mostrar ? 'Ocultar' : 'Mostrar'}</button>}
        <button type="button" onClick={async () => { if (await copiar(valor)) { setCopiado(true); setTimeout(() => setCopiado(false), 2000); } }} style={boton(true, marca)}>
          {copiado ? 'Copiada ✓' : 'Copiar'}
        </button>
      </div>
      {ayuda && <span style={{ fontSize: 11.5, color: N700 }}>{ayuda}</span>}
    </div>
  );
}
const boton = (primario: boolean, marca: string) => ({
  height: 34, padding: '0 14px', borderRadius: 4, fontSize: 12, fontWeight: 500, fontFamily: FONT, cursor: 'pointer', whiteSpace: 'nowrap' as const,
  border: primario ? 'none' : `1px solid ${N500}`, background: primario ? marca : '#fff', color: primario ? '#fff' : N900,
});

export default function SeccionApiKey({ obtener, regenerar, marca = '#243B84', puedeRegenerar = true }: {
  obtener: () => Promise<LlaveModulo>;
  regenerar: () => Promise<LlaveModulo>;
  marca?: string;
  puedeRegenerar?: boolean;
}) {
  const [llave, setLlave] = useState<LlaveModulo | null>(null);
  const [mostrar, setMostrar] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  useEffect(() => {
    let vivo = true;
    obtener().then(l => { if (vivo) setLlave(l); }).catch(() => {});
    return () => { vivo = false; };
  }, [obtener]);

  async function nueva() {
    setTrabajando(true);
    try { setLlave(await regenerar()); setMostrar(true); setConfirmar(false); } finally { setTrabajando(false); }
  }

  const tarjeta = { background: '#fff', border: `1px solid ${N500}`, borderRadius: 8, padding: '18px 20px', display: 'flex', flexDirection: 'column' as const, gap: 16, fontFamily: FONT };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 860 }}>
      <div style={tarjeta}>
        {llave
          ? <Campo etiqueta="API Key" valor={llave.clave} mostrar={mostrar} onMostrar={() => setMostrar(m => !m)} marca={marca}
              ayuda={`Generada el ${fecha(llave.creada)}. Trátala como una contraseña: no la compartas por correo ni chat.`} />
          : <span style={{ fontSize: 12, color: N700 }}>Cargando…</span>}
      </div>

      {puedeRegenerar && (
        <div style={tarjeta}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: N900 }}>Generar una API Key nueva</div>
            <div style={{ fontSize: 12, color: N700, marginTop: 3 }}>Úsalo si crees que la llave se filtró. La anterior deja de funcionar de inmediato.</div>
          </div>
          {!confirmar
            ? <div><button type="button" onClick={() => setConfirmar(true)} style={{ ...boton(false, marca), color: '#C62828', borderColor: 'rgba(244,67,54,.35)' }}>Generar API Key nueva</button></div>
            : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'rgba(244,67,54,.05)', border: '1px solid rgba(244,67,54,.2)', borderRadius: 6, padding: '10px 12px' }}>
                <span style={{ fontSize: 12, color: N900, flex: '1 1 260px' }}>¿Seguro? La API Key actual dejará de funcionar.</span>
                <button type="button" onClick={() => setConfirmar(false)} style={boton(false, marca)} disabled={trabajando}>Cancelar</button>
                <button type="button" onClick={nueva} style={{ ...boton(true, marca), background: '#C62828' }} disabled={trabajando}>{trabajando ? 'Generando…' : 'Sí, generar nueva'}</button>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
