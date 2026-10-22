'use client';
// Piezas compartidas por las vistas de Caja: tipos de navegación, íconos, firma y conteo de billetes.
import { useState, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Input, Modal } from '@/components/suite/ui';
import { useHotel } from '@/components/hotel/store';
import { CAJEROS, DENOMINACIONES, TC, cajeroDe, fmtCRC, fmtN, fmtUSD, totalConteo, type Conteo } from '@/components/hotel/finanzas';
import { AvisoPie, Banda, FiltroUno, Firma } from '../comun';
import { CONFIG_CAJA, type Declaracion } from './calc';

export type Vista =
  | { v: 'inicio'; tab?: string; usuario?: string }
  | { v: 'abrir'; modo: 'caja' | 'turno'; cajero: string }
  // `desde: 'cierreDia'`: el turno se cierra desde el cierre del día y al terminar se vuelve ahí
  | { v: 'arqueo'; turnoId: string; decl?: Declaracion; obs?: string; desde?: 'cierreDia' }
  | { v: 'resumen'; turnoId: string; decl: Declaracion; obs: string; desde?: 'cierreDia' }
  | { v: 'turnoCerrado'; turnoId: string }
  | { v: 'cierreDia'; obs?: string }
  | { v: 'resumenDia'; obs: string };

export interface P { ir: (v: Vista) => void; toast: (t: string) => void }

// ── Selector de usuario (no hay login: permite recorrer los roles) ──────────
export function VerComo() {
  const h = useHotel();
  return (
    <FiltroUno label="Usuario" value={h.sesion} onChange={v => v && h.setSesion(v)} todos={null} prefijo={false} ancho={280}
      opciones={CAJEROS.map(x => ({ value: x.nombre, label: `${x.nombre} · ${x.rol === 'Regular' ? 'Cajero Regular' : x.rol === 'Responsable' ? 'Cajero Responsable' : 'Administrador'}` }))} />
  );
}
export const PillUsuario = () => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.n700 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: C.success }} />Sesión:</span>;

export const sumar = (s: string, n: number) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

export const Candado = () => <span style={{ width: 84, height: 84, borderRadius: '50%', background: 'rgba(238,179,0,.12)', color: '#E0A800', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg></span>;
export const Check = () => <span style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(76,175,80,.12)', color: C.success, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg></span>;

// ── Movimientos del día ─────────────────────────────────────────────────────
export const hrefReferencia = (ref: string) => {
  if (ref.startsWith('DG-')) return `/facturacion/depositos-en-garantia?q=${ref.slice(3).split(' ')[0]}`;
  if (/^R[DL]-/.test(ref)) return `/facturacion/folios?q=${ref.split(' ')[0]}`;
  if (ref.startsWith('FE-')) return `/facturacion/folios-externos?folio=${ref.slice(3).split(' ')[0]}`;
  if (ref.startsWith('CJ-')) return '/facturacion/canje-de-divisas';
  return null;
};
export function Etq({ children, color, fondo }: { children: ReactNode; color: string; fondo?: string }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color, background: fondo ?? `color-mix(in srgb, ${color} 10%, transparent)`, padding: '3px 10px', borderRadius: radius.control, whiteSpace: 'nowrap' }}>
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />{children}</span>;
}
// ── Abrir caja / abrir turno (verificación de saldo inicial) ────────────────
export function TablaConteo({ moneda, conteo, onChange, titulo }: { moneda: 'USD' | 'CRC'; conteo: Conteo; onChange: (c: Conteo) => void; titulo: string }) {
  const sim = moneda === 'USD' ? '$' : '₡';
  const total = totalConteo(conteo, moneda);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      {titulo && <span style={{ fontSize: 13, color: C.n700, marginBottom: 8 }}>{titulo}</span>}
      {DENOMINACIONES[moneda].map(d => {
        const n = conteo[moneda][d] ?? 0;
        return (
          <div key={d} style={{ display: 'grid', gridTemplateColumns: '1fr 84px 1fr', alignItems: 'center', gap: 10, padding: '6px 0' }}>
            <span style={{ fontSize: 13 }}>{sim}{fmtN(d, 0)}</span>
            <input value={n || (conteo[moneda][d] === 0 ? '0' : '')} inputMode="numeric" aria-label={`Cantidad de ${sim}${d}`} className="suite-campo"
              onChange={e => { const v = Math.max(0, Math.floor(Number(e.target.value.replace(/\D/g, '')) || 0)); onChange({ ...conteo, [moneda]: { ...conteo[moneda], [d]: v } }); }}
              style={{ height: 34, border: `1px solid ${C.n500}`, borderRadius: radius.control, textAlign: 'right', padding: '0 10px', fontSize: 13, fontFamily: FONT, outline: 'none' }} />
            <span style={{ textAlign: 'right', color: C.n700, fontSize: 13 }}>{n ? (moneda === 'USD' ? fmtUSD(d * n) : fmtCRC(d * n)) : '—'}</span>
          </div>
        );
      })}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.n500}`, marginTop: 8, paddingTop: 12, fontSize: 13, fontWeight: 600 }}>
        <span>Total {moneda} declarado</span><span>{moneda === 'USD' ? fmtUSD(total) : fmtCRC(total)}</span>
      </div>
      {moneda === 'CRC' && <span style={{ textAlign: 'right', fontSize: 11.5, color: C.n700 }}>Equivalente: {fmtUSD(total / TC)} USD</span>}
    </div>
  );
}
export const Dato = ({ l, v }: { l: string; v: ReactNode }) => <div><div style={{ fontSize: 12.5, color: C.n700 }}>{l}</div><div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>{v}</div></div>;
export const Linea = ({ l, v, azul, verde, rojo, bold }: { l: ReactNode; v: ReactNode; azul?: boolean; verde?: boolean; rojo?: boolean; bold?: boolean }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: radius.md, border: `1px solid ${azul ? C.brandBd : verde ? 'rgba(76,175,80,.3)' : rojo ? 'rgba(244,67,54,.3)' : C.n500}`,
    background: azul ? '#EEF2FA' : verde ? 'rgba(76,175,80,.07)' : rojo ? 'rgba(244,67,54,.05)' : C.n200, fontSize: 13, color: rojo ? C.error : undefined }}>
    <span style={{ fontWeight: bold ? 600 : 400 }}>{l}</span><b style={{ color: azul ? C.brand : verde ? '#2E7D32' : rojo ? C.error : C.n900, fontWeight: 700, fontSize: bold ? 16 : 13 }}>{v}</b>
  </div>
);
export const Volver = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} aria-label="Volver" style={{ order: -1, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: 4, color: C.n900, marginLeft: -6 }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
  </button>
);

export const Renglon = ({ l, v, fuerte }: { l: string; v: ReactNode; fuerte?: boolean }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 12px', borderBottom: `1px solid ${C.n500}`, fontSize: 13, background: fuerte ? '#EEF2FA' : undefined, fontWeight: fuerte ? 600 : 400 }}><span>{l}</span><span>{v}</span></div>
);

/** Firma en pantalla + PIN según «Método de firma» de Configuración → Caja. */
export function FirmaModal({ titulo, sub, firmante, resumen, aviso, onClose, onFirmar, confirmar, peligro, extra }: {
  titulo: string; sub: string; firmante: string; resumen: ReactNode; aviso: string; onClose: () => void; onFirmar: (datos: { recibidoPor: string }) => void; confirmar: string; peligro?: boolean; extra?: 'contabilidad';
}) {
  const [firma, setFirma] = useState('');
  const [pin, setPin] = useState('');
  const [recibido, setRecibido] = useState('');
  const [error, setError] = useState('');
  const modo = CONFIG_CAJA.firma;
  const pideTrazo = modo === 'trazo' || modo === 'ambos';
  const pidePin = modo === 'pin' || modo === 'ambos';
  const ok = () => {
    if (pideTrazo && !firma) return setError('Firma en el recuadro para continuar.');
    if (pidePin && !pin) return setError('Escribe tu PIN para continuar.');
    if (pidePin && pin !== (cajeroDe(firmante)?.pin ?? '')) return setError('El PIN no coincide. Vuelve a escribirlo.');
    onFirmar({ recibidoPor: recibido.trim() });
  };
  const limpiarError = () => error && setError('');
  return (
    <Modal open title={titulo} onClose={onClose} width={640}
      footer={<>{error && <AvisoPie>{error}</AvisoPie>}<Button variant="secondary" onClick={onClose}>{extra ? 'Volver' : 'Cancelar'}</Button><Button onClick={ok} style={peligro ? { background: C.error, borderColor: C.error } : undefined}>{confirmar}</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13 }}>
        <span style={{ fontSize: 12, color: C.n700, marginTop: -8 }}>{sub}</span>
        <div style={{ border: `1px solid ${peligro ? 'rgba(244,67,54,.3)' : C.brandBd}`, background: peligro ? 'rgba(244,67,54,.05)' : '#EEF2FA', borderRadius: radius.md, padding: '12px 16px' }}>{resumen}</div>
        {modo !== 'pin' && <div><span>Firma {extra ? 'del Cajero Responsable' : 'en pantalla'} <span style={{ color: C.error }}>*</span></span><div style={{ marginTop: 6 }}><Firma onChange={v => { setFirma(v); limpiarError(); }} placeholder={`Firma de ${firmante}`} alto={extra ? 110 : 130} /></div></div>}
        {modo !== 'trazo' && <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span>PIN de {firmante} <span style={{ color: C.error }}>*</span></span>
          <Input type="password" value={pin} onChange={v => { setPin(v.replace(/\D/g, '')); limpiarError(); }} inputMode="numeric" maxLength={6} aria-label="PIN" style={{ textAlign: 'center', letterSpacing: 6, maxWidth: 240 }} />
          {/* Sin inicio de sesión todavía: los cajeros de ejemplo comparten el PIN de prueba */}
          <span style={{ fontSize: 11.5, color: C.n700 }}>Mientras no haya inicio de sesión, el PIN de prueba es 1234.</span></label>}
        {extra === 'contabilidad' && <div style={{ background: C.n200, border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 11, color: C.n700, fontWeight: 600, letterSpacing: '.04em' }}>RECIBIDO POR CONTABILIDAD</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>Nombre<Input value={recibido} onChange={setRecibido} placeholder="Nombre del responsable de contabilidad" /></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>Firma en pantalla<Firma onChange={() => {}} alto={70} placeholder="Firma aquí" /></div>
          </div>
        </div>}
        <Banda tono="info">{aviso}</Banda>
      </div>
    </Modal>
  );
}
