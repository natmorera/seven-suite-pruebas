'use client';
// Panel lateral del folio: se abre sobre la lista (que conserva su ancho) con
// el resumen arriba (cliente, habitación, estado, saldo y uso del crédito) y
// las acciones de uso diario a un clic: Registrar pago, Agregar cargo,
// Prefactura. Debajo, el detalle completo (Información · Cargos · Pagos · Bitácora).
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, radius, shadow, Z } from '@/components/suite/tokens';
import { Button, StatusBadge } from '@/components/suite/ui';
import { fmtF } from '@/components/hotel/datos';
import { fmtMon } from '@/components/hotel/finanzas';
import { DetalleFolio } from './Detalle';
import { Exoneracion, Referencia } from './Pagos';
import type { FolioVista } from './modelo';

export const tituloNombre = (s: string) => (s === s.toUpperCase() ? s.toLowerCase().replace(/(^|\s)\S/g, x => x.toUpperCase()) : s);

export function PanelFolio({ folio, onClose, onToast, onEliminado }: { folio: FolioVista; onClose: () => void; onToast: (t: string) => void; onEliminado?: () => void }) {
  const [dialogo, setDialogo] = useState<null | 'exo' | 'ref'>(null);
  const [tab, setTab] = useState<'Cargos' | 'Pagos' | 'Información' | 'Bitácora'>('Cargos');
  const [k, setK] = useState(0);
  const [dlg, setDlg] = useState<'cargo' | 'pago' | 'prefactura' | undefined>(undefined);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !dialogo) onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose, dialogo]);
  const abierto = folio.estado === 'Abierto';
  const usoCredito = folio.limite ? Math.min(1, Math.max(0, folio.saldo) / folio.limite) : 0;
  const excede = !!folio.limite && folio.saldo > folio.limite;
  const ir = (t: typeof tab, d?: 'cargo' | 'pago' | 'prefactura') => { setTab(t); setDlg(d); setK(x => x + 1); };
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: Z.modal, fontFamily: FONT }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,15,15,.25)' }} />
      <aside role="dialog" aria-label={`Folio ${folio.numero}`} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(760px, 100vw)', background: C.n000, boxShadow: shadow.modal, display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '18px 22px 16px', borderBottom: `1px solid ${C.n500}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{tituloNombre(folio.nombre)}</h2>
                <StatusBadge label={folio.estado} color={abierto ? 'green' : 'gray'} />
                {excede && <StatusBadge label="Excede crédito" color="red" />}
              </div>
              <div style={{ fontSize: 12.5, color: C.n700, marginTop: 4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <span>Folio {folio.numero}</span>
                {folio.habitacion && <span>Hab. {folio.habitacion}</span>}
                {folio.reserva && <Link href={`/reservaciones/reservas?id=${folio.reserva.id}`} style={{ color: C.brand }}>{folio.reservaNumero}</Link>}
                <span>{fmtF(folio.emision)} – {fmtF(folio.vencimiento)}</span>
                {folio.factura && <span>Factura {folio.factura}</span>}
              </div>
            </div>
            <button type="button" aria-label="Cerrar panel" onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 18, color: C.n700, cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 }}>
            {[['Cargos', fmtMon(folio.totalCargos, folio.moneda)], ['Pagado', fmtMon(folio.totalPagado, folio.moneda)], ['Saldo', fmtMon(folio.saldo, folio.moneda)], ['Crédito', folio.limite ? fmtMon(folio.limite, folio.moneda) : 'Sin crédito']].map(([l, v]) => (
              <div key={l} style={{ background: l === 'Saldo' ? (folio.saldo > 0.005 ? '#FFF4ED' : '#EEF8F3') : C.n200, borderRadius: radius.md, padding: '10px 12px' }}>
                <div style={{ fontSize: 11.5, color: C.n700 }}>{l}</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2, color: l === 'Saldo' ? (folio.saldo > 0.005 ? '#B45309' : '#0E7A57') : C.n900 }}>{v}</div>
                {l === 'Crédito' && folio.limite > 0 && <div aria-label={`Uso del crédito ${Math.round(usoCredito * 100)}%`} style={{ height: 4, background: C.n500, borderRadius: 2, marginTop: 6 }}><div style={{ width: `${usoCredito * 100}%`, height: '100%', borderRadius: 2, background: excede ? C.error : usoCredito > 0.8 ? '#E0A800' : C.brand }} /></div>}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button disabled={!abierto || folio.saldo <= 0.009} onClick={() => ir('Pagos', 'pago')} style={{ background: C.success, borderColor: C.success }}>Registrar pago</Button>
            <Button variant="secondary" disabled={!abierto} onClick={() => ir('Cargos', 'cargo')}>Agregar cargo</Button>
            <Button variant="secondary" onClick={() => ir('Información', 'prefactura')}>Prefactura</Button>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <Button variant="ghost" onClick={() => setDialogo('exo')}>Exoneración{folio.exoneracion ? ' ✓' : ''}</Button>
              <Button variant="ghost" onClick={() => setDialogo('ref')}>Referencia{folio.referencia ? ' ✓' : ''}</Button>
            </span>
          </div>
        </header>
        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          <DetalleFolio key={`${folio.id}-${k}`} folio={folio} tabInicial={tab} dialogoInicial={dlg} sinCabecera onEliminado={onEliminado} />
        </div>
      </aside>
      {dialogo === 'exo' && <Exoneracion folio={folio} onClose={() => setDialogo(null)} onListo={t => { setDialogo(null); onToast(t); }} />}
      {dialogo === 'ref' && <Referencia folio={folio} onClose={() => setDialogo(null)} onListo={t => { setDialogo(null); onToast(t); }} />}
    </div>,
    document.body,
  );
}
