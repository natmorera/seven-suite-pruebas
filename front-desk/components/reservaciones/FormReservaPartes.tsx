'use client';
// Nueva reserva: tipos del formulario, resumen fijo, confirmación y modales de línea (cargos, huéspedes, observaciones, depósito).
import { useState, type CSSProperties, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Input, Modal, StatusBadge } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { Campo, IcTrash, Popover, TextArea } from '@/components/configuracion/kit';
import { nuevoId } from '@/components/hotel/store';
import { CONCEPTOS_CARGO, contratoDeTarifa, fmtF, fmtRango, noches, type Cargo, type DetallesReserva, type HuespedAdicional, type Perfil } from '@/components/hotel/datos';
import { precioTarifa } from '@/components/hotel/reservas';
import { TC, fmtMon } from '@/components/hotel/finanzas';
import { MontoCelda } from '@/components/suite/Monto';

export interface Huesped { nombre: string; identificacion: string; nacionalidad: string; email: string; telefono: string; adicionales: HuespedAdicional[] }
export interface Linea { key: string; entrada: string; salida: string; tipo: string; hab: string; adultos: number; ninos: number; regimen: string; precio: number; manual: boolean; cargos: Cargo[]; huesped: Huesped; obs: string }
export interface Form {
  perfil: Perfil | null; nombreLibre: string; tarifa: string; moneda: 'USD' | 'CRC'; idExterno: string; modoHuespedes: 'mismo' | 'diferentes'; modalidad: '' | 'individual' | 'grupo';
  lineas: Linea[]; descuento: number; principal: Huesped; otras: DetallesReserva & { vip: boolean; tNombre: string; tNumero: string; tMes: string; tAnio: string; cheque: string; envio: string };
  obs: string; internas: string; condiciones: string[]; depRequerido: number;
}
export const huespedVacio = (): Huesped => ({ nombre: '', identificacion: '', nacionalidad: '', email: '', telefono: '', adicionales: [] });
export const precioEn = (tipo: string, tarifa: string, moneda: 'USD' | 'CRC') => (moneda === 'CRC' ? Math.round(precioTarifa(tipo, tarifa || 'DIR') * TC) : precioTarifa(tipo, tarifa || 'DIR'));
export const nochesL = (l: Linea) => Math.max(1, noches(l.entrada, l.salida));
export const totalCargos = (l: Linea) => l.cargos.reduce((s, c) => s + c.cantidad * c.precio * Math.max(1, noches(c.desde, c.hasta) || 1), 0);

// ── Resumen fijo (columna derecha) y confirmación ──────────────────────────
const MODALIDAD = { individual: 'Individual (múltiple)', grupo: 'Grupal' } as const;
const SIN_DEFINIR = '#9A9AA3';
const filaRes = (l: string, v: ReactNode) => <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5 }}><span style={{ color: C.n700 }}>{l}</span><span style={{ color: C.n900, textAlign: 'right', minWidth: 0 }}>{v}</span></div>;

export function ResumenReserva({ f, setF, numero, cliente, desde, hasta, adultos, ninos, hospedaje, servicios, total, errores, onDeposito, onGuardar, onDescartar }: {
  f: Form; setF: (f: Form) => void; numero: number; cliente: string; desde: string; hasta: string; adultos: number; ninos: number;
  hospedaje: number; servicios: number; total: number; errores: string[];
  onDeposito: () => void; onGuardar: (estado: 'Solicitada' | 'Confirmada') => void; onDescartar: () => void;
}) {
  const varias = f.lineas.length > 1;
  const ctl: CSSProperties = { height: 30, border: `1px solid ${C.n500}`, borderRadius: radius.control, fontSize: 12, fontFamily: FONT, padding: '0 6px', background: C.n000, width: '100%', boxSizing: 'border-box' };
  const linkBtn: CSSProperties = { border: 'none', background: 'none', padding: 0, color: C.brand, fontSize: 12, cursor: 'pointer', fontFamily: FONT };
  return (
    <aside aria-label="Resumen de la reserva" className="no-print" style={{ width: 300, flexShrink: 0, background: C.n000, borderLeft: `1px solid ${C.n500}`, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 20px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Resumen</h2>
              <span style={{ fontSize: 12, color: C.n700 }}>Nro. <b style={{ color: C.n900, fontWeight: 600 }}>{numero}</b></span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.n700 }}>ID externo
              <input value={f.idExterno} onChange={e => setF({ ...f, idExterno: e.target.value })} placeholder="Ej: 0001" aria-label="ID Reserva" className="suite-campo" style={{ ...ctl, flex: 1 }} /></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 12, borderTop: `1px solid ${C.n500}` }}>
              {filaRes('Cliente', cliente ? <b style={{ fontWeight: 500 }}>{cliente}</b> : <span style={{ color: SIN_DEFINIR }}>Sin definir</span>)}
              {filaRes('Tarifa', f.tarifa ? contratoDeTarifa(f.tarifa) : <span style={{ color: SIN_DEFINIR }}>Sin definir</span>)}
              {filaRes('Estancia', `${fmtRango(desde, hasta)}`)}
              {filaRes('Noches', Math.max(1, noches(desde, hasta)))}
              {filaRes('Huéspedes', `${adultos} adulto${adultos === 1 ? '' : 's'}${ninos ? ` · ${ninos} niño${ninos === 1 ? '' : 's'}` : ''}`)}
              {filaRes('Habitaciones', <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{f.lineas.length}{varias && (f.modalidad ? <StatusBadge label={MODALIDAD[f.modalidad]} color="brand" /> : <span style={{ color: SIN_DEFINIR, fontSize: 11.5 }}>Modalidad por definir</span>)}</span>)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 12, borderTop: `1px solid ${C.n500}` }}>
              {filaRes('Hospedaje i.i.', fmtMon(hospedaje, f.moneda))}
              {filaRes('Servicios i.i.', fmtMon(servicios, f.moneda))}
              {filaRes('Descuento i.i.', <span style={{ display: 'inline-flex', width: 110 }}><Input value={f.descuento} onChange={v => setF({ ...f, descuento: Math.max(0, Number(v.replace(/[^\d.]/g, '')) || 0) })} style={{ textAlign: 'right' }} aria-label="Descuento" /></span>)}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 10, borderTop: `1px solid ${C.n500}` }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Total a cobrar</span><span data-testid="total-reserva" style={{ fontSize: 18, fontWeight: 600 }}>{fmtMon(total, f.moneda)}</span>
              </div>
              {filaRes('Depósito requerido', <button type="button" onClick={onDeposito} style={{ ...linkBtn, textDecoration: 'underline' }}>{f.depRequerido ? fmtMon(f.depRequerido, f.moneda) : 'Definir'}</button>)}
            </div>
            {varias && f.modalidad && (
              <div style={{ fontSize: 11.5, color: C.n700, background: C.brandBg, borderRadius: radius.md, padding: '10px 12px', lineHeight: 1.5 }}>
                {f.modalidad === 'grupo' ? <>Facturación: <b style={{ color: C.n900, fontWeight: 500 }}>una sola factura</b>. Cuenta 1 = folio de agencia (hospedaje); luego una cuenta de consumo por habitación.</>
                  : <>Facturación: <b style={{ color: C.n900, fontWeight: 500 }}>se define en el check-in</b> (separada por habitación o una sola factura).</>}
              </div>
            )}
            {errores.length > 0 && <div role="alert" style={{ background: 'rgba(244,67,54,.06)', color: C.error, borderRadius: radius.md, padding: '10px 12px', fontSize: 12 }}>Falta: {errores.join(' · ')}.</div>}
          </div>
          <div style={{ padding: '12px 20px 16px', borderTop: `1px solid ${C.n500}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button onClick={() => onGuardar('Confirmada')} style={{ width: '100%', justifyContent: 'center' }}>Confirmar reserva</Button>
            <Button variant="secondary" onClick={() => onGuardar('Solicitada')} style={{ width: '100%', justifyContent: 'center' }}>Guardar como solicitada</Button>
            <button type="button" onClick={onDescartar} style={{ ...linkBtn, color: C.error, alignSelf: 'center', marginTop: 2 }}>Descartar</button>
          </div>
    </aside>
  );
}

export function ReservaGuardada({ listo, lineas, modalidad, desde, hasta, onVer }: {
  listo: { numero: number; estado: string }; lineas: number; modalidad?: keyof typeof MODALIDAD; desde: string; hasta: string; onVer: () => void;
}) {
  return (
        <Modal open title="Reserva guardada" onClose={onVer} width={420}
          footer={<Button onClick={onVer}>Ver reserva</Button>}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '8px 0' }}>
            <span style={{ width: 54, height: 54, borderRadius: '50%', border: '3px solid #4CAF50', color: '#4CAF50', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>✓</span>
            <b style={{ fontSize: 16, fontWeight: 600 }}>Reserva {listo.estado === 'Confirmada' ? 'confirmada' : listo.estado === 'Lista de espera' ? 'en lista de espera' : 'solicitada'}</b>
            <span style={{ fontSize: 12.5, color: C.n700 }}>Se creó la reserva N° <b style={{ color: C.n900 }}>{listo.numero}</b> con {lineas} habitación(es){modalidad ? ` (${MODALIDAD[modalidad].toLowerCase()})` : ''} del {fmtF(desde)} al {fmtF(hasta)}.</span>
          </div>
        </Modal>
  );
}

export function Radio({ on }: { on: boolean }) {
  return <span aria-hidden style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${on ? C.brand : '#B8B8BF'}`, background: C.n000, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{on && <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.brand }} />}</span>;
}
export function OpcionRadio({ on, onClick, titulo, detalle }: { on: boolean; onClick: () => void; titulo: string; detalle: ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick}
      style={{ textAlign: 'left', display: 'flex', gap: 12, padding: '14px 16px', border: `1px solid ${on ? C.brand : C.n500}`, background: on ? C.brandBg : C.n000, borderRadius: radius.md, cursor: 'pointer', fontFamily: FONT, boxShadow: on ? `0 0 0 1px ${C.brand}` : undefined }}>
      <span style={{ marginTop: 1 }}><Radio on={on} /></span>
      <span><span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: C.n900 }}>{titulo}</span><span style={{ display: 'block', fontSize: 12, color: C.n700, marginTop: 4, lineHeight: 1.5 }}>{detalle}</span></span>
    </button>
  );
}

export function MenuLinea({ n, opciones }: { n: number; opciones: { l: string; on: () => void; peligro?: boolean }[] }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" aria-label={`Acciones línea ${n}`} aria-haspopup="menu" aria-expanded={abierto} onClick={() => setAbierto(v => !v)}
        style={{ width: 30, height: 30, border: `1px solid ${C.n500}`, background: C.n000, borderRadius: radius.control, color: C.n700, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>⋯</button>
      <Popover open={abierto} onClose={() => setAbierto(false)} width={230} align="right">
        <div role="menu" style={{ padding: 6 }}>
          {opciones.map(o => <button key={o.l} role="menuitem" type="button" onClick={() => { setAbierto(false); o.on(); }} className="suite-fila"
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'none', fontSize: 12, fontFamily: FONT, color: o.peligro ? C.error : C.n900, cursor: 'pointer', borderRadius: radius.control }}>{o.l}</button>)}
        </div>
      </Popover>
    </span>
  );
}
export function LinkMini({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} style={{ border: 'none', background: 'none', padding: 0, color: C.brand, fontSize: 11, textDecoration: 'underline', cursor: 'pointer', fontFamily: FONT, fontStyle: 'italic' }}>{children}</button>;
}

export function CargosLinea({ l, moneda, onClose, onGuardar }: { l: Linea; moneda: 'USD' | 'CRC'; onClose: () => void; onGuardar: (c: Cargo[]) => void }) {
  const [cs, setCs] = useState<Cargo[]>(l.cargos.length ? l.cargos : [{ id: nuevoId('cg'), desde: l.entrada, hasta: l.salida, cantidad: 1, concepto: '', precio: 0 }]);
  const PRECIOS: Record<string, number> = { 'Desayuno buffet': 20, Parqueo: 10, Minibar: 15, Lavandería: 12, Spa: 80, 'Tour volcán': 95, 'Transporte aeropuerto': 45 };
  const ctl: CSSProperties = { height: 32, border: `1px solid ${C.n500}`, borderRadius: radius.control, fontSize: 12, fontFamily: FONT, padding: '0 8px', width: '100%', boxSizing: 'border-box' };
  const set = (id: string, p: Partial<Cargo>) => setCs(v => v.map(c => (c.id === id ? { ...c, ...p } : c)));
  const validos = cs.filter(c => c.concepto && c.cantidad > 0);
  return (
    <Modal open title="Cargos a la habitación" onClose={onClose} width={860} footer={<><Button variant="secondary" onClick={() => onGuardar(l.cargos)}>Agregar después</Button><Button onClick={() => onGuardar(validos)}>Guardar</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ alignSelf: 'flex-start', border: `1px solid ${C.brand}`, color: C.brand, background: C.brandBg, borderRadius: radius.md, padding: '6px 14px', fontSize: 12 }}>Cuenta 1</span>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Servicio', 'Desde', 'Hasta', 'Cantidad', 'Precio i.i', 'Total i.i', ''].map(x => <th key={x} style={{ textAlign: 'left', fontWeight: 400, color: C.n700, fontSize: 12, padding: 4 }}>{x}</th>)}</tr></thead>
          <tbody>{cs.map(c => (
            <tr key={c.id}>
              <td style={{ padding: 4 }}><select value={c.concepto} aria-label="Servicio" onChange={e => set(c.id, { concepto: e.target.value, precio: c.precio || (moneda === 'CRC' ? (PRECIOS[e.target.value] ?? 0) * TC : PRECIOS[e.target.value] ?? 0) })} className="suite-campo" style={ctl}><option value="">Selecciona un concepto</option>{CONCEPTOS_CARGO.map(x => <option key={x}>{x}</option>)}</select></td>
              <td style={{ padding: 4, width: 130 }}><input type="date" value={c.desde} min={l.entrada} max={l.salida} aria-label="Desde" onChange={e => set(c.id, { desde: e.target.value })} className="suite-campo" style={ctl} /></td>
              <td style={{ padding: 4, width: 130 }}><input type="date" value={c.hasta} min={c.desde} max={l.salida} aria-label="Hasta" onChange={e => set(c.id, { hasta: e.target.value })} className="suite-campo" style={ctl} /></td>
              <td style={{ padding: 4, width: 80 }}><input value={c.cantidad} aria-label="Cantidad" onChange={e => set(c.id, { cantidad: Math.max(0, Number(e.target.value) || 0) })} className="suite-campo" style={{ ...ctl, textAlign: 'right' }} /></td>
              <td style={{ padding: 4, width: 110 }}><input value={c.precio} aria-label="Precio" onChange={e => set(c.id, { precio: Math.max(0, Number(e.target.value.replace(/[^\d.]/g, '')) || 0) })} className="suite-campo" style={{ ...ctl, textAlign: 'right' }} /></td>
              <td style={{ padding: 4, width: 120, fontSize: 12, textAlign: 'right' }}><MontoCelda texto={fmtMon(c.cantidad * c.precio * Math.max(1, noches(c.desde, c.hasta) || 1), moneda)} /></td>
              <td style={{ padding: 4 }}><button type="button" aria-label="Quitar cargo" onClick={() => setCs(cs.filter(x => x.id !== c.id))} style={{ border: 'none', background: 'none', color: C.error, cursor: 'pointer' }}><IcTrash /></button></td>
            </tr>
          ))}</tbody>
        </table>
        <span><Button variant="secondary" icon={<IcPlus size={12} />} style={{ color: C.brand, borderColor: C.brandBd }} onClick={() => setCs([...cs, { id: nuevoId('cg'), desde: l.entrada, hasta: l.salida, cantidad: 1, concepto: '', precio: 0 }])}>Agregar nuevo cargo</Button></span>
      </div>
    </Modal>
  );
}
export function ModalHuesped({ hu, titulo, render, onClose, onGuardar }: { hu: Huesped; titulo: string; render: (h: Huesped, set: (h: Huesped) => void) => ReactNode; onClose: () => void; onGuardar: (h: Huesped) => void }) {
  const [v, setV] = useState(hu);
  return <Modal open title={titulo} onClose={onClose} width={820} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => onGuardar(v)}>Guardar</Button></>}>{render(v, setV)}</Modal>;
}
export function ModalTexto({ titulo, valor, onClose, onGuardar }: { titulo: string; valor: string; onClose: () => void; onGuardar: (v: string) => void }) {
  const [v, setV] = useState(valor);
  return <Modal open title={titulo} onClose={onClose} width={520} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => onGuardar(v)}>Guardar</Button></>}><TextArea value={v} onChange={setV} rows={5} placeholder="Escriba cualquier observación" /></Modal>;
}
export function DepRequerido({ valor, moneda, sugerido, onClose, onGuardar }: { valor: number; moneda: string; sugerido: number; onClose: () => void; onGuardar: (v: number) => void }) {
  const [v, setV] = useState(String(valor || sugerido));
  return (
    <Modal open title="Depósito en garantía" onClose={onClose} width={440} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => onGuardar(Math.max(0, Number(v) || 0))}>Guardar</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Campo label={`Monto requerido (${moneda})`} hint={`Sugerido: primera noche de todas las habitaciones (${fmtMon(sugerido, moneda)})`}><Input value={v} onChange={x => setV(x.replace(/[^\d.]/g, ''))} style={{ textAlign: 'right' }} /></Campo>
        <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>El depósito se registra (y entra a la caja) desde la pestaña Depósitos una vez guardada la reserva.</p>
      </div>
    </Modal>
  );
}
