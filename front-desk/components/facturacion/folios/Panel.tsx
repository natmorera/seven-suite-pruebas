'use client';
// Panel lateral del folio (media pantalla): resumen arriba (cliente, habitación, estado, saldo y uso del
// crédito), el detalle completo en el centro (Información · Cargos · Pagos · Bitácora) y la barra de acciones
// fija al pie: a la izquierda Eliminar y «Más acciones», a la derecha Prefactura, Agregar cargo y Registrar pago.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, radius, shadow, Z } from '@/components/suite/tokens';
import { Button, StatusBadge } from '@/components/suite/ui';
import { Alerta, MenuBoton, type OpcionMenu } from '@/components/hotel/ui';
import { useHotel } from '@/components/hotel/store';
import { fmtF } from '@/components/hotel/datos';
import { ahoraHotel, fmtMon } from '@/components/hotel/finanzas';
import { DetalleFolio, type DialogoFolio } from './Detalle';
import { AsociarDepositos, AsociarPerfil } from './Operaciones';
import { Exoneracion, Referencia } from './Pagos';
import type { FolioVista } from './modelo';

export const tituloNombre = (s: string) => (s === s.toUpperCase() ? s.toLowerCase().replace(/(^|\s)\S/g, x => x.toUpperCase()) : s);

export function PanelFolio({ folio, onClose, onToast, onEliminado, onNuevo }: { folio: FolioVista; onClose: () => void; onToast: (t: string) => void; onEliminado?: () => void; onNuevo?: () => void }) {
  const h = useHotel();
  const [dialogo, setDialogo] = useState<null | 'exo' | 'ref' | 'perfil' | 'depositos' | 'eliminar'>(null);
  const [tab, setTab] = useState<'Cargos' | 'Pagos' | 'Información' | 'Bitácora'>('Cargos');
  const [k, setK] = useState(0);
  const [dlg, setDlg] = useState<DialogoFolio | undefined>(undefined);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !dialogo) onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose, dialogo]);
  const abierto = folio.estado === 'Abierto';
  const usoCredito = folio.limite ? Math.min(1, Math.max(0, folio.saldo) / folio.limite) : 0;
  const excede = !!folio.limite && folio.saldo > folio.limite;
  const externo = folio.clase === 'externo';
  const eliminable = externo && folio.lineas.length === 0 && folio.pagos.length === 0 && folio.depGarantia <= 0 && Math.abs(folio.saldo) < 0.01;
  const mas: OpcionMenu[] = [
    ...(externo && onNuevo ? [{ label: 'Nuevo folio externo', onClick: onNuevo }] : []),
    ...(externo ? [{ label: folio.perfilId ? 'Cambiar perfil asociado' : 'Asociar perfil', onClick: () => setDialogo('perfil') }, { label: 'Asociar depósitos en garantía', onClick: () => setDialogo('depositos'), disabled: !abierto }] : []),
    { label: 'Trasladar cargos', onClick: () => ir('Cargos', 'traslado'), disabled: !abierto },
    { label: `Redirigir cargos${folio.redirecciones.length ? ` (${folio.redirecciones.length})` : ''}`, onClick: () => ir('Cargos', 'redirigir'), disabled: !abierto },
    { label: 'Corrección de cargos', onClick: () => ir('Cargos', 'corregir'), disabled: !abierto || !folio.lineas.some(l => !l.bloqueado && !l.historico && l.importe > 0) },
    { label: `Exoneración${folio.exoneracion ? ' ✓' : ''}`, onClick: () => setDialogo('exo') },
    { label: `Referencia${folio.referencia ? ' ✓' : ''}`, onClick: () => setDialogo('ref') },
    ...(folio.factura ? [{ label: `Ver factura ${folio.factura}`, onClick: () => ir('Información', 'factura') }, { label: 'Nota de crédito / débito', onClick: () => ir('Información', 'nota') }] : []),
    ...(!abierto && folio.clase !== 'reserva' ? [{ label: 'Reabrir folio', onClick: () => { h.reabrirFolio(folio.id, h.sesion, ahoraHotel()); onToast('Folio reabierto'); } }] : []),
    ...(abierto && folio.reserva?.estado !== 'In-House' && Math.abs(folio.saldo) < 0.01 ? [{ label: 'Cerrar folio y facturar', onClick: () => ir('Información', 'cerrar') }] : []),
  ];
  const ir = (t: typeof tab, d?: DialogoFolio) => { setTab(t); setDlg(d); setK(x => x + 1); };
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
        </header>
        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          <DetalleFolio key={`${folio.id}-${k}`} folio={folio} tabInicial={tab} dialogoInicial={dlg} sinCabecera accionesFuera onEliminado={onEliminado} />
        </div>
        <footer style={{ padding: '12px 22px', borderTop: `1px solid ${C.n500}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          {externo && <Button variant="secondary" style={{ color: C.error }} onClick={() => setDialogo('eliminar')}>Eliminar folio</Button>}
          <MenuBoton label="Más acciones" align="left" ancho={250} opciones={mas} />
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => ir('Información', 'prefactura')}>Prefactura</Button>
            <Button variant="secondary" disabled={!abierto} onClick={() => ir('Cargos', 'cargo')}>Agregar cargo</Button>
            <Button disabled={!abierto || folio.saldo <= 0.009} onClick={() => ir('Pagos', 'pago')}>Registrar pago</Button>
          </span>
        </footer>
      </aside>
      {dialogo === 'perfil' && <AsociarPerfil folio={folio} onClose={() => setDialogo(null)} onListo={t => { setDialogo(null); onToast(t); }} />}
      {dialogo === 'depositos' && <AsociarDepositos folio={folio} onClose={() => setDialogo(null)} onListo={t => { setDialogo(null); onToast(t); }} />}
      <Alerta open={dialogo === 'eliminar' && !eliminable} titulo="No se puede eliminar este folio" onClose={() => setDialogo(null)} onConfirm={() => setDialogo(null)} confirmar="Entendido" cancelar="Cerrar">
        El folio {folio.numero} tiene {folio.lineas.length} cargo(s), {folio.pagos.length} pago(s){folio.depGarantia > 0 ? ' y depósitos en garantía' : ''}{Math.abs(folio.saldo) >= 0.01 ? ` y un saldo de ${fmtMon(folio.saldo, folio.moneda)}` : ''}. Solo se pueden eliminar folios sin movimientos ni valor; si ya no se usa, liquídalo o ciérralo.
      </Alerta>
      <Alerta open={dialogo === 'eliminar' && eliminable} titulo={`¿Eliminar el folio ${folio.numero}?`} tono="danger" onClose={() => setDialogo(null)} confirmar="Eliminar folio" cancelar="Cancelar"
        onConfirm={() => { h.eliminarFolio(folio.id); setDialogo(null); onEliminado?.(); }}>
        El folio no tiene movimientos. Se eliminará de la lista y no se podrá recuperar.
      </Alerta>
      {dialogo === 'exo' && <Exoneracion folio={folio} onClose={() => setDialogo(null)} onListo={t => { setDialogo(null); onToast(t); }} />}
      {dialogo === 'ref' && <Referencia folio={folio} onClose={() => setDialogo(null)} onListo={t => { setDialogo(null); onToast(t); }} />}
    </div>,
    document.body,
  );
}
