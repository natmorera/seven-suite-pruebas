'use client';
// Folios: registrar pago, exoneración, referencia, notas de crédito / débito y documento del folio.
import { useMemo, useState } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Modal, Select } from '@/components/suite/ui';
import { Campo, Grid, InputAfijo, TextArea } from '@/components/configuracion/kit';
import { useHotel, nuevoId } from '@/components/hotel/store';
import { HOY, fmtF } from '@/components/hotel/datos';
import { DESCUENTOS_PAGO, FORMAS_PAGO, MONEDAS, TIPOS_EXONERACION, TIPOS_REFERENCIA, aUSD, conceptoDe, deUSD, desglose, fmtMon, fmtN, formaPago, r2, simbolo, tasaCruce, type Mon, type PagoFolio } from '@/components/hotel/finanzas';
import { turnoAbiertoDe } from '@/components/hotel/accionesFinanzas';
import { useEmpresa } from '@/components/layout/Shell';
import { datosHotel } from '../ReciboCanje';
import { type FolioVista } from './modelo';
import { Par, cuando } from './Operaciones';

// ── Registrar pago ──────────────────────────────────────────────────────────
const COMISIONES_PAGO = [{ id: '', nombre: 'Seleccionar', pct: 0 }, { id: 'c35', nombre: 'Comisión tarjeta (3.5%)', pct: 3.5 }, { id: 'c5', nombre: 'Comisión Amex (5%)', pct: 5 }];
export function RegistrarPago({ folio, onClose, onListo }: { folio: FolioVista; onClose: () => void; onListo: (t: string, saldoCero: boolean) => void }) {
  const h = useHotel();
  const [moneda, setMoneda] = useState<Mon>('USD');
  const [forma, setForma] = useState('BACD');
  const [importe, setImporte] = useState('');
  const [comision, setComision] = useState('');
  const [descuento, setDescuento] = useState('');
  const [referencia, setReferencia] = useState('');
  const [tarjeta, setTarjeta] = useState('');
  const [incluirDep, setIncluirDep] = useState(false);
  const [error, setError] = useState('');
  const f = formaPago(forma);
  const formas = FORMAS_PAGO.filter(x => x.moneda === moneda || x.metodo === 'Transferencia');
  const tasa = tasaCruce('USD', moneda);
  const depUsado = folio.pagos.filter(p => p.forma === 'DEP').reduce((s, p) => s + p.montoFacturado, 0);
  const depAplicable = r2(Math.max(0, Math.min(folio.depGarantia - depUsado, folio.saldo)));
  const pendienteUSD = r2(folio.saldo - (incluirDep ? depAplicable : 0));
  const monto = Number(importe) || 0;
  const usd = r2(aUSD(monto, moneda));
  const pctDesc = DESCUENTOS_PAGO.find(d => d.id === descuento)?.pct ?? 0;
  const pctCom = COMISIONES_PAGO.find(c => c.id === comision)?.pct ?? 0;
  const turno = turnoAbiertoDe(h, h.sesion);
  const registrar = () => {
    if (!turno && monto > 0) return setError(`${h.sesion} no tiene un turno de caja abierto: los pagos entran a la caja del cajero.`);
    if (monto <= 0 && !incluirDep) return setError('Ingresa el importe.');
    if (usd > pendienteUSD + 0.009) return setError(`El importe supera el pendiente (${fmtMon(pendienteUSD)}).`);
    if (f.metodo === 'Tarjeta' && monto > 0 && !/^\d{4}$/.test(tarjeta)) return setError('Indica los últimos 4 dígitos de la tarjeta.');
    const t = cuando();
    const base = { fecha: HOY, hora: t.slice(11, 16), comision: 0, descuento: 0, referencia: '', tarjeta: '', venceTarjeta: '', incluirDeposito: incluirDep, usuario: h.sesion };
    const cliente = folio.clase === 'reserva' ? `${folio.nombre} - ${folio.habitacion}` : folio.nombre;
    if (incluirDep && depAplicable > 0) {
      const p: PagoFolio = { ...base, id: nuevoId('pg'), moneda: 'USD', forma: 'DEP', tasa: 1, importe: depAplicable, referencia: 'Depósito en garantía aplicado', montoFacturado: depAplicable, pendiente: r2(folio.saldo - depAplicable) };
      h.registrarPago(folio.id, p, null);
    }
    if (monto > 0) {
      const p: PagoFolio = { ...base, id: nuevoId('pg'), moneda, forma, tasa, importe: r2(monto), comision: r2(monto * pctCom / 100), descuento: r2(monto * pctDesc / 100), referencia: referencia.trim(),
        tarjeta: f.metodo === 'Tarjeta' ? tarjeta : '', venceTarjeta: '', montoFacturado: usd, pendiente: r2(pendienteUSD - usd) };
      h.registrarPago(folio.id, p, { concepto: folio.clase === 'reserva' ? `${folio.reserva?.cliente === 'Agencia de Viajes' ? 'Reserva agencia' : 'Reserva directa'} / Habitación ${folio.habitacion}` : folio.clase === 'casa' ? 'Cuenta casa' : 'Folio externo',
        referencia: folio.clase === 'reserva' ? folio.reservaNumero : `FE-${folio.numero}`, cliente });
    }
    const restante = r2(pendienteUSD - usd);
    onListo(`Pago registrado${monto > 0 ? ` por ${fmtMon(monto, moneda)}` : ''}`, restante <= 0.009);
  };
  return (
    <Modal open title={`Registrar pago · Folio ${folio.numero}`} onClose={onClose} width={640}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={registrar}>Registrar pago</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Grid cols={2}>
          <Campo label="Moneda" required><Select value={moneda} onChange={v => { setMoneda(v as Mon); setForma(FORMAS_PAGO.find(x => x.moneda === v)?.id ?? 'TRF'); }} options={MONEDAS.filter(m => m.codigo !== 'EUR').map(m => ({ value: m.codigo, label: `${m.codigo} ${m.simbolo}` }))} /></Campo>
          <Campo label="Forma de pago" required><Select value={forma} onChange={setForma} options={formas.map(x => ({ value: x.id, label: x.nombre }))} /></Campo>
          <Campo label="Tasa de cambio"><Input value={fmtN(tasa)} disabled style={{ textAlign: 'right' }} /></Campo>
          <Campo label="Importe" required hint={moneda !== 'USD' && monto ? `≈ ${fmtMon(usd)}` : undefined}><InputAfijo value={importe} onChange={v => setImporte(v.replace(/[^\d.]/g, ''))} prefijo={simbolo(moneda)} alinear="right" placeholder="0.00" /></Campo>
        </Grid>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Campo label="Comisión (opcional)"><Select value={comision} onChange={setComision} options={COMISIONES_PAGO.map(c => ({ value: c.id, label: c.nombre }))} /></Campo>
          <Campo label="Descuento (opcional)"><Select value={descuento} onChange={setDescuento} options={[{ value: '', label: 'Seleccionar' }, ...DESCUENTOS_PAGO.map(d => ({ value: d.id, label: d.nombre }))]} /></Campo>
          <Campo label="Referencia (opcional)"><Input value={referencia} onChange={setReferencia} placeholder="Número de referencia" /></Campo>
        </div>
        {f.metodo === 'Tarjeta' && <Campo label="Número de tarjeta" hint="Solo los últimos 4 dígitos (no se guarda el número completo)."><Input value={tarjeta} onChange={v => setTarjeta(v.replace(/\D/g, '').slice(-4))} placeholder="****" inputMode="numeric" /></Campo>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: radius.md, border: `1px solid ${C.n500}`, background: C.n200, fontSize: 13 }}>
          <span style={{ color: C.n700 }}>Importe pendiente</span>
          <span style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>{moneda !== 'USD' && <span style={{ fontSize: 12, color: C.n700 }}>{fmtMon(deUSD(pendienteUSD, moneda), moneda)}</span>}<b style={{ color: C.brand }} data-testid="pendiente">{fmtMon(pendienteUSD)}</b></span>
        </div>
        {(pctDesc > 0 || pctCom > 0) && monto > 0 && <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>{pctDesc > 0 && `Descuento ${fmtMon(monto * pctDesc / 100, moneda)} · cobrar ${fmtMon(monto * (1 - pctDesc / 100), moneda)}. `}{pctCom > 0 && `Comisión bancaria estimada ${fmtMon(monto * pctCom / 100, moneda)}.`}</p>}
        <Checkbox label={`Incluir depósito en el cierre de esta factura${depAplicable > 0 ? ` (${fmtMon(depAplicable)})` : ' (sin depósitos)'}`} checked={incluirDep} onChange={v => depAplicable > 0 && setIncluirDep(v)} />
        {!turno && <p style={{ margin: 0, fontSize: 12, color: '#7A5C00' }}>{h.sesion} no tiene un turno abierto en Caja.</p>}
        {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>{error}</p>}
      </div>
    </Modal>
  );
}

// ── Exoneración y referencia ────────────────────────────────────────────────
export function Exoneracion({ folio, onClose, onListo }: { folio: FolioVista; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const e = folio.exoneracion;
  const [f, setF] = useState({ tipo: e?.tipo ?? '', fecha: e?.fecha ?? '', documento: e?.documento ?? '', institucion: e?.institucion ?? '', monto: String(e?.monto ?? '0.00'), tarifa: String(e?.tarifa ?? 100) });
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const imp = r2(folio.lineas.filter(l => !l.historico).reduce((s, l) => s + desglose(l.importe, l.concepto).impuestos, 0));
  const guardar = () => {
    if (!f.tipo) return setError('Selecciona el tipo de exoneración.');
    if (!(Number(f.monto) >= 0) || !(Number(f.tarifa) > 0 && Number(f.tarifa) <= 100)) return setError('Monto y tarifa exonerada (1–100 %) son obligatorios.');
    h.setExtraFolio(folio.id, { exoneracion: { tipo: f.tipo, fecha: f.fecha, documento: f.documento, institucion: f.institucion, monto: r2(Number(f.monto)), tarifa: Number(f.tarifa) } }, h.sesion, cuando(), `Exoneración registrada: ${f.tipo} (${f.tarifa}%)`);
    onListo('Exoneración de impuestos guardada');
  };
  return (
    <Modal open title={`Información de la exoneración de impuestos · Folio ${folio.numero}`} onClose={onClose} width={700}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={guardar}>Guardar</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Grid cols={2} gap={16}>
          <Campo label="Tipo de exoneración" required><Select value={f.tipo} onChange={set('tipo')} options={[{ value: '', label: 'Seleccionar' }, ...TIPOS_EXONERACION.map(t => ({ value: t, label: t }))]} /></Campo>
          <Campo label="Fecha de emisión"><Input type="date" value={f.fecha} onChange={set('fecha')} /></Campo>
          <Campo label="Número del documento"><Input value={f.documento} onChange={set('documento')} placeholder="Ingresa el documento" /></Campo>
          <Campo label="Nombre de la institución"><Input value={f.institucion} onChange={set('institucion')} placeholder="Ingresa la institución" /></Campo>
          <Campo label="Monto del impuesto exonerado" required hint={`Impuestos del folio: ${fmtMon(imp)}`}><InputAfijo value={f.monto} onChange={set('monto')} prefijo="$" alinear="right" /></Campo>
          <Campo label="Tarifa exonerada (%)" required><InputAfijo value={f.tarifa} onChange={set('tarifa')} sufijo="%" /></Campo>
        </Grid>
        {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>{error}</p>}
      </div>
    </Modal>
  );
}
export function Referencia({ folio, onClose, onListo }: { folio: FolioVista; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const r = folio.referencia;
  const [f, setF] = useState({ tipo: r?.tipo ?? '', folio: r?.folio ?? '', contingencia: r?.contingencia ?? false, documento: r?.documento ?? '', fecha: r?.fecha ?? '', razon: r?.razon ?? '' });
  const [error, setError] = useState('');
  return (
    <Modal open title={`Información de referencia · Folio ${folio.numero}`} onClose={onClose} width={700}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => {
        if (!f.tipo) return setError('Selecciona el tipo de referencia.');
        h.setExtraFolio(folio.id, { referencia: f }, h.sesion, cuando(), `Referencia registrada: ${f.tipo}${f.documento ? ` ${f.documento}` : ''}`);
        onListo('Referencia guardada');
      }}>Guardar</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 16, alignItems: 'end' }}>
          <Campo label="Tipo de referencia"><Select value={f.tipo} onChange={v => setF({ ...f, tipo: v })} options={[{ value: '', label: 'Seleccionar' }, ...TIPOS_REFERENCIA.map(t => ({ value: t, label: t }))]} /></Campo>
          <Campo label="Número de Folio"><Input value={f.folio} onChange={v => setF({ ...f, folio: v })} placeholder="Ingresa el número de folio" /></Campo>
          <div style={{ paddingBottom: 7 }}><Checkbox label="Contingencia" checked={f.contingencia} onChange={v => setF({ ...f, contingencia: v })} /></div>
        </div>
        <Grid cols={2} gap={16}>
          <Campo label="Número del documento"><Input value={f.documento} onChange={v => setF({ ...f, documento: v })} placeholder="Ingresa el documento" /></Campo>
          <Campo label="Fecha de emisión"><Input type="date" value={f.fecha} onChange={v => setF({ ...f, fecha: v })} /></Campo>
        </Grid>
        <Campo label="Razón"><TextArea value={f.razon} onChange={v => setF({ ...f, razon: v })} rows={3} placeholder="Ingresa la razón de la referencia" /></Campo>
        {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>{error}</p>}
      </div>
    </Modal>
  );
}

// ── Nota de crédito / débito ────────────────────────────────────────────────
export function NotaFiscal({ folio, onClose, onListo }: { folio: FolioVista; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const docs = folio.documentos.filter(d => d.tipo === 'Factura');
  const facturas = docs.length ? docs : folio.factura ? [{ numero: folio.factura, importe: folio.totalCargos }] : [];
  const [tipo, setTipo] = useState<'Nota de crédito' | 'Nota de débito'>('Nota de crédito');
  const [sobre, setSobre] = useState(facturas.at(-1)?.numero ?? '');
  const [importe, setImporte] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  return (
    <Modal open title={`Nota de crédito / débito · Folio ${folio.numero}`} onClose={onClose} width={560}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => {
        const m = Number(importe) || 0;
        if (!sobre) return setError('El folio no tiene una factura emitida.');
        if (m <= 0) return setError('Ingresa el importe.');
        if (!motivo.trim()) return setError('Indica el motivo.');
        h.emitirNota(folio.id, tipo, r2(m), motivo.trim(), sobre, h.sesion, cuando());
        onListo(`${tipo} emitida sobre ${sobre}`);
      }}>Emitir</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Grid cols={2}>
          <Campo label="Tipo"><Select value={tipo} onChange={v => setTipo(v as typeof tipo)} options={[{ value: 'Nota de crédito', label: 'Nota de crédito' }, { value: 'Nota de débito', label: 'Nota de débito' }]} /></Campo>
          <Campo label="Sobre la factura"><Select value={sobre} onChange={setSobre} options={facturas.length ? facturas.map(f => ({ value: f.numero, label: `${f.numero} · ${fmtMon(f.importe)}` })) : [{ value: '', label: 'Sin facturas' }]} /></Campo>
        </Grid>
        <Campo label="Importe" required><InputAfijo value={importe} onChange={v => setImporte(v.replace(/[^\d.]/g, ''))} prefijo="$" alinear="right" placeholder="0.00" /></Campo>
        <Campo label="Motivo" required><TextArea value={motivo} onChange={setMotivo} rows={3} placeholder="Ej.: ajuste de tarifa acordado con la agencia" /></Campo>
        {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>{error}</p>}
      </div>
    </Modal>
  );
}

// ── Prefactura / factura (documento) ────────────────────────────────────────
export function DocumentoFolio({ folio, titulo = 'PREFACTURA', nota = 'Documento sin valor fiscal' }: { folio: FolioVista; titulo?: string; nota?: string }) {
  const empresa = useEmpresa();
  const d = datosHotel(empresa);
  const lineas = useMemo(() => folio.lineas.filter(l => !l.historico), [folio.lineas]);
  const tot = useMemo(() => lineas.reduce((a, l) => { const x = desglose(l.importe, l.concepto); return { prod: a.prod + x.produccion, imp: a.imp + x.impuestos }; }, { prod: 0, imp: 0 }), [lineas]);
  const exo = folio.exoneracion ? r2(Math.min(tot.imp, folio.exoneracion.monto || tot.imp * folio.exoneracion.tarifa / 100)) : 0;
  const total = r2(tot.prod + tot.imp - exo);
  const pagado = r2(folio.pagos.filter(p => !p.historico).reduce((s, p) => s + p.montoFacturado, 0));
  const th = { textAlign: 'left' as const, padding: '8px', fontWeight: 400, color: C.n700, borderBottom: `1px solid ${C.n500}`, fontSize: 11 };
  const td = { padding: '7px 8px', borderBottom: `1px solid ${C.n500}`, fontSize: 11.5 };
  return (
    <div style={{ fontFamily: FONT, color: C.n900, padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div><div style={{ fontSize: 17, fontWeight: 600 }}>{empresa}</div><div style={{ fontSize: 11.5, color: C.n700, lineHeight: 1.6 }}>{d.razon} · {d.direccion}<br />Tel: {d.tel} · {d.email}</div></div>
        <div style={{ textAlign: 'right' }}><div style={{ fontSize: 18, fontWeight: 700, color: C.brand }}>{titulo}</div><div style={{ fontSize: 12 }}>Folio {folio.numero}</div><div style={{ fontSize: 11, color: C.error, marginTop: 4 }}>{nota}</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: C.n200, borderRadius: radius.md, padding: '12px 16px', margin: '18px 0', fontSize: 12 }}>
        <div><b>Cliente:</b> {folio.fiscal.razon || folio.nombre}<br /><b>Identificación:</b> {folio.fiscal.numeroId || '—'}<br /><b>Correo:</b> {folio.fiscal.email || '—'}</div>
        <div><b>Fecha:</b> {fmtF(HOY)}<br />{folio.habitacion && <><b>Habitación:</b> {folio.habitacion} · {folio.reservaNumero}<br /></>}<b>Período:</b> {fmtF(folio.emision)} – {fmtF(folio.vencimiento)}</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th style={th}>Fecha</th><th style={th}>Código</th><th style={th}>Descripción</th><th style={{ ...th, textAlign: 'right' }}>Producción</th><th style={{ ...th, textAlign: 'right' }}>Impuesto</th><th style={{ ...th, textAlign: 'right' }}>Importe</th></tr></thead>
        <tbody>{lineas.map(l => { const x = desglose(l.importe, l.concepto); return (
          <tr key={l.id}><td style={td}>{fmtF(l.fecha)}</td><td style={td}>{l.concepto}</td><td style={td}>{l.descripcion || conceptoDe(l.concepto).descripcion}</td><td style={{ ...td, textAlign: 'right' }}>{fmtN(x.produccion)}</td><td style={{ ...td, textAlign: 'right' }}>{fmtN(x.impuestos)}</td><td style={{ ...td, textAlign: 'right' }}>{fmtN(l.importe)}</td></tr>
        ); })}</tbody>
      </table>
      <div style={{ marginLeft: 'auto', width: 300, marginTop: 14, fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Par l="Subtotal (producción)" v={fmtMon(tot.prod)} /><Par l="Impuestos" v={fmtMon(tot.imp)} />
        {exo > 0 && <Par l={`Exoneración (${folio.exoneracion?.tipo})`} v={`- ${fmtMon(exo)}`} />}
        <Par l={<b>Total</b>} v={<b>{fmtMon(total)}</b>} /><Par l="Pagos y depósitos aplicados" v={`- ${fmtMon(pagado)}`} />
        <div style={{ borderTop: `1px solid ${C.n500}`, paddingTop: 6 }}><Par l={<b>Saldo</b>} v={<b style={{ color: C.brand }}>{fmtMon(r2(total - pagado))}</b>} /></div>
      </div>
      {folio.referencia && <p style={{ fontSize: 11, color: C.n700, marginTop: 16 }}>Referencia: {folio.referencia.tipo} {folio.referencia.documento} {folio.referencia.contingencia ? '(contingencia)' : ''} · {folio.referencia.razon}</p>}
    </div>
  );
}
