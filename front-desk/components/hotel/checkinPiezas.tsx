'use client';
// Piezas del check-in: bloque con título, firma en pantalla y carga de documentos.
import { useRef, useState, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Campo, LinkButton } from '@/components/configuracion/kit';

// ── Formulario de check-in ──────────────────────────────────────────────────
export const th = { padding: '8px 6px', textAlign: 'left' as const, fontSize: 11, fontWeight: 400, color: C.n700, whiteSpace: 'nowrap' as const };
export const td = { padding: '7px 6px', fontSize: 12, color: C.n900, borderTop: `1px solid ${C.n500}`, whiteSpace: 'nowrap' as const };

export function Bloque({ titulo, estado, children, abierto: inicial = false }: { titulo: string; estado?: ReactNode; children: ReactNode; abierto?: boolean }) {
  const [abierto, setAbierto] = useState(inicial);
  return (
    <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md }}>
      <button type="button" onClick={() => setAbierto(a => !a)} aria-expanded={abierto}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: C.n900 }}>{titulo}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: C.n700 }}>{estado}<span style={{ transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>⌄</span></span>
      </button>
      {abierto && <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>}
    </div>
  );
}

// ── Tarjeta de registro ─────────────────────────────────────────────────────
export function Firma({ onChange }: { onChange: (vacia: boolean) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const pos = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  return (
    <div>
      <canvas ref={ref} width={360} height={120} aria-label="Área de firma" style={{ width: '100%', maxWidth: 360, height: 120, border: `1px dashed ${C.n500}`, borderRadius: radius.md, touchAction: 'none', background: C.n000, cursor: 'crosshair' }}
        onPointerDown={e => { dibujando.current = true; const c = ref.current!.getContext('2d')!; const [x, y] = pos(e); c.beginPath(); c.moveTo(x, y); c.lineWidth = 2; c.strokeStyle = C.n900; }}
        onPointerMove={e => { if (!dibujando.current) return; const c = ref.current!.getContext('2d')!; const [x, y] = pos(e); c.lineTo(x, y); c.stroke(); onChange(false); }}
        onPointerUp={() => { dibujando.current = false; }} onPointerLeave={() => { dibujando.current = false; }} />
      <LinkButton onClick={() => { ref.current!.getContext('2d')!.clearRect(0, 0, 360, 120); onChange(true); }} style={{ fontSize: 11 }}>Limpiar firma</LinkButton>
    </div>
  );
}
export function Subida({ label, valor, onChange }: { label: string; valor: string; onChange: (v: string) => void }) {
  const [error, setError] = useState('');
  return (
    <Campo label={label} error={error}>
      <label style={{ border: `1.5px dashed ${C.brandBd}`, borderRadius: radius.md, minHeight: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4, cursor: 'pointer', background: C.brandBg, overflow: 'hidden', fontSize: 11, color: C.n700, textAlign: 'center', padding: 8 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- archivo local del usuario (blob:) */}
        {valor ? <img src={valor} alt={label} style={{ maxHeight: 90, maxWidth: '100%' }} /> : <><b style={{ color: C.brand, fontWeight: 500 }}>Clic para subir</b>PNG, JPG o JPEG (máx. 25 MB)</>}
        <input type="file" accept="image/png,image/jpeg" hidden onChange={e => {
          const f = e.target.files?.[0]; if (!f) return;
          if (f.size > 25 * 1024 * 1024) return setError('Supera 25 MB');
          const rd = new FileReader(); rd.onload = () => { onChange(String(rd.result)); setError(''); }; rd.readAsDataURL(f);
        }} />
      </label>
    </Campo>
  );
}
