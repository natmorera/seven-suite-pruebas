// Acciones de Facturación sobre el store de Front Desk. Cada una equivale a una
// operación del PMS (registrar canje, abrir/cerrar turno, cargo a folio, pago…)
// y deja todo sincronizado: caja del cajero, saldo de la reserva, vouchers,
// bitácora del folio y facturas.
import { HOY, type EstadoHotel, type Perfil, type Reserva } from './datos';
import {
  aUSD, conceptoDe, desglose, extraVacio, folioDeReserva, fmtN, formaPago, lineasReserva, r2, saldoFolio, totalConteoUSD,
  type Canje, type CierreCaja, type Comprobantes, type Conteo, type Deposito, type DocFiscal, type ExtraFolio, type Factura, type FolioCuenta,
  type Metodo, type Mon, type MovCaja, type MovFolio, type PagoFolio, type Redireccion, type Turno,
} from './finanzas';

type Mut = (f: (d: EstadoHotel) => EstadoHotel) => void;
let n = 0;
const uid = (p: string) => `${p}${Date.now().toString(36)}${(n++).toString(36)}`;

/** Folio de reserva: «R:<id de reserva>». */
export const idFolioReserva = (reservaId: string) => `R:${reservaId}`;
export const reservaDeFolio = (folioId: string) => (folioId.startsWith('R:') ? folioId.slice(2) : null);
export const turnoAbiertoDe = (x: Pick<EstadoHotel, 'turnos'>, cajero: string) => x.turnos.find(t => t.cajero === cajero && !t.fin) ?? null;

export interface MovCajaNuevo { hora: string; concepto: string; referencia: string; cliente: string; metodo: Metodo; terminal?: string; moneda: Mon; importe: number; tipo: 'Ingreso' | 'Egreso' }

/** Registra el movimiento en el turno abierto del usuario en sesión (y su voucher si es tarjeta). */
function conCaja(x: EstadoHotel, m: MovCajaNuevo, cajero = x.sesion): EstadoHotel {
  const t = turnoAbiertoDe(x, cajero);
  if (!t || !m.importe) return x;
  const mov: MovCaja = { id: uid('mc'), turnoId: t.id, fecha: HOY, usuario: cajero, terminal: m.terminal ?? '', usd: r2(aUSD(m.importe, m.moneda)), ...m, importe: r2(m.importe) };
  const tarjeta = m.metodo === 'Tarjeta' || m.metodo === 'Link de pago';
  return {
    ...x, movsCaja: [...x.movsCaja, mov],
    vouchers: tarjeta ? [...x.vouchers, { id: uid('v'), fecha: `${HOY}T${m.hora}`, terminal: m.terminal || 'POS Recepción 1 (BAC)', tarjeta: m.referencia.match(/\d{4}$/)?.[0] ?? '0000', marca: 'Visa',
      autorizacion: String(100000 + ((x.seq.voucher * 7919) % 899999)), referencia: `${HOY.replace(/-/g, '')}${String(x.seq.voucher).padStart(4, '0')}`, estado: 'Aprobado', moneda: m.moneda, monto: r2(m.importe), origen: m.concepto }] : x.vouchers,
    seq: { ...x.seq, voucher: x.seq.voucher + (tarjeta ? 1 : 0) },
  };
}

const ev = (fecha: string, usuario: string, accion: string) => ({ id: uid('e'), fecha, usuario, accion });
const ajustarSaldo = (r: Reserva, delta: number): Reserva => {
  if (delta >= 0) return { ...r, cuentas: r.cuentas.map((c, i) => (i === 0 ? { ...c, saldo: r2(c.saldo + delta), consumos: c.consumos + 1 } : c)) };
  let resto = -delta;
  const cuentas = r.cuentas.map(c => { const q = Math.min(Math.max(0, c.saldo), resto); resto = r2(resto - q); return { ...c, saldo: r2(c.saldo - q) }; });
  if (resto > 0) cuentas[0] = { ...cuentas[0], saldo: r2(cuentas[0].saldo - resto) };
  return { ...r, cuentas };
};

/** Aplica un cambio al «extra» de cualquier folio (reserva o cuenta) y ajusta el saldo de la reserva. */
function enFolio(x: EstadoHotel, folioId: string, f: (e: ExtraFolio) => ExtraFolio, deltaSaldo = 0, pagoUSD = 0): EstadoHotel {
  const rid = reservaDeFolio(folioId);
  if (rid) {
    const extra = f(x.foliosRes[rid] ?? extraVacio());
    const reservas = (deltaSaldo || pagoUSD) ? x.reservas.map(r => {
      if (r.id !== rid) return r;
      let nr = deltaSaldo ? ajustarSaldo(r, deltaSaldo) : r;
      if (pagoUSD) nr = { ...ajustarSaldo(nr, -pagoUSD), pagado: r2(nr.pagado + pagoUSD) };
      return nr;
    }) : x.reservas;
    return { ...x, reservas, foliosRes: { ...x.foliosRes, [rid]: extra } };
  }
  return { ...x, foliosCta: x.foliosCta.map(c => (c.id === folioId ? { ...c, ...f(c) } as FolioCuenta : c)) };
}
const numeroFolio = (x: EstadoHotel, folioId: string) => {
  const rid = reservaDeFolio(folioId);
  if (rid) { const r = x.reservas.find(y => y.id === rid); return r ? folioDeReserva(r) : folioId; }
  return x.foliosCta.find(c => c.id === folioId)?.numero ?? folioId;
};
const nombreFolio = (x: EstadoHotel, folioId: string) => {
  const rid = reservaDeFolio(folioId);
  if (rid) { const r = x.reservas.find(y => y.id === rid); return r ? `Hab ${r.habitacion} · ${x.perfiles.find(p => p.id === r.perfilId)?.nombre ?? r.nombre}` : folioId; }
  return x.foliosCta.find(c => c.id === folioId)?.nombre ?? folioId;
};

export interface LineaSel { id: string; concepto: string; descripcion: string; importe: number; conceptoOrig: string }

export function accionesFinanzas(mut: Mut) {
  return {
    setSesion: (u: string) => mut(x => ({ ...x, sesion: u })),

    // ── Canje de divisas ────────────────────────────────────────────────────
    registrarCanje: (c: Omit<Canje, 'numero'>, hora: string) => mut(x => {
      const canje: Canje = { ...c, numero: x.seq.canje };
      const ref = `CJ-${String(canje.numero).padStart(5, '0')}`;
      let y: EstadoHotel = { ...x, canjes: [...x.canjes, canje], seq: { ...x.seq, canje: x.seq.canje + 1 } };
      y = conCaja(y, { hora, concepto: 'Canje de divisas', referencia: ref, cliente: c.nombre || '-', metodo: 'Efectivo', moneda: c.monedaOrigen, importe: c.importeOrigen, tipo: 'Ingreso' });
      y = conCaja(y, { hora, concepto: 'Canje de divisas (entrega)', referencia: ref, cliente: c.nombre || '-', metodo: 'Efectivo', moneda: c.monedaDestino, importe: c.entregado, tipo: 'Egreso' });
      return y;
    }),

    // ── Caja y turnos ───────────────────────────────────────────────────────
    abrirCaja: (cajero: string, inicio: string) => mut(x => ({
      ...x, cajaDia: { ...x.cajaDia, estado: 'abierta', fecha: HOY, apertura: inicio, abiertaPor: cajero, ultimaApertura: inicio, folioCierre: '', observaciones: '', recibidoPor: '' },
    })),
    abrirTurno: (t: Pick<Turno, 'id' | 'cajero' | 'inicio' | 'saldoInicial' | 'conteoApertura' | 'obsApertura' | 'turnoAnterior'>) => mut(x => {
      if (turnoAbiertoDe(x, t.cajero)) return x;
      const declarado = totalConteoUSD(t.conteoApertura);
      const dif = r2(declarado - t.saldoInicial);
      const nuevo: Turno = { ...t, fecha: HOY, fin: null, difApertura: dif, precierre: false, diferencia: 0 };
      // La diferencia de apertura se registra en el turno anterior
      const turnos = x.turnos.map(y => (y.id === t.turnoAnterior && Math.abs(dif) >= 0.01
        ? { ...y, diferencia: r2(y.diferencia + dif), detalles: [y.detalles, `Diferencia de ${fmtN(dif)} detectada al abrir el turno siguiente (${t.cajero}).`].filter(Boolean).join(' ') } : y));
      return { ...x, turnos: [...turnos, nuevo] };
    }),
    precierre: (turnoId: string, v = true) => mut(x => ({ ...x, turnos: x.turnos.map(t => (t.id === turnoId ? { ...t, precierre: v } : t)) })),
    cerrarTurno: (turnoId: string, d: { fin: string; conteo: Conteo; comprobantes: Comprobantes; esperado: number; declarado: number; diferencia: number; motivo?: string; detalles?: string; observaciones?: string; firmadoPor: string }) => mut(x => {
      const ms = x.movsCaja.filter(m => m.turnoId === turnoId);
      return { ...x, turnos: x.turnos.map(t => (t.id === turnoId ? {
        ...t, fin: d.fin, precierre: false, conteoCierre: d.conteo, comprobantes: d.comprobantes, esperado: d.esperado, declarado: d.declarado, diferencia: r2(t.diferencia + d.diferencia),
        motivo: d.motivo, detalles: d.detalles, observaciones: d.observaciones, firmadoPor: d.firmadoPor, efectivoFinal: totalConteoUSD(d.conteo),
        ingresos: r2(ms.filter(m => m.tipo === 'Ingreso').reduce((s, m) => s + m.usd, 0)), egresos: r2(ms.filter(m => m.tipo === 'Egreso').reduce((s, m) => s + m.usd, 0)), nMovs: ms.length,
      } : t)) };
    }),
    /** Cierre forzado por el responsable: se toma lo esperado por el sistema como declarado (queda marcado en auditoría). */
    forzarCierre: (turnoId: string, fin: string, por: string, motivo: string, esperado: number, conteo: Conteo, comprobantes: Comprobantes) => mut(x => {
      const ms = x.movsCaja.filter(m => m.turnoId === turnoId);
      return { ...x, turnos: x.turnos.map(t => (t.id === turnoId ? {
        ...t, fin, precierre: false, forzado: true, forzadoPor: por, motivo: 'Cierre forzado', detalles: motivo, esperado, declarado: esperado, conteoCierre: conteo, comprobantes, efectivoFinal: totalConteoUSD(conteo), firmadoPor: por,
        ingresos: r2(ms.filter(m => m.tipo === 'Ingreso').reduce((s, m) => s + m.usd, 0)), egresos: r2(ms.filter(m => m.tipo === 'Egreso').reduce((s, m) => s + m.usd, 0)), nMovs: ms.length,
      } : t)) };
    }),
    cerrarCaja: (c: Omit<CierreCaja, 'folio'>) => mut(x => {
      const folio = `CC-${HOY.slice(0, 4)}-${HOY.slice(5, 7)}${HOY.slice(8, 10)}-${String(x.cierres.filter(k => k.fecha === HOY).length + 1).padStart(3, '0')}`;
      return { ...x, cierres: [...x.cierres, { ...c, folio }], cajaDia: { ...x.cajaDia, estado: 'cerrada', ultimoCierre: `${HOY}T${c.hora}`, cerradaPor: c.firmadoPor, folioCierre: folio, observaciones: c.observaciones, recibidoPor: c.recibidoPor } };
    }),

    // ── Folios ──────────────────────────────────────────────────────────────
    crearFolio: (f: FolioCuenta, perfilNuevo?: Perfil) => mut(x => ({
      ...x, foliosCta: [...x.foliosCta, f], perfiles: perfilNuevo && !x.perfiles.some(p => p.id === perfilNuevo.id) ? [...x.perfiles, perfilNuevo] : x.perfiles,
      seq: { ...x.seq, folio: Math.max(x.seq.folio, Number(f.numero) + 1) },
    })),
    /** Cargo a un folio. Si el folio tiene una redirección vigente para el concepto, el cargo cae en el destino. */
    agregarCargo: (folioId: string, m: Omit<MovFolio, 'id'>, cuando: string) => mut(x => {
      const extra = reservaDeFolio(folioId) ? x.foliosRes[reservaDeFolio(folioId)!] : x.foliosCta.find(c => c.id === folioId);
      const red = extra?.redirecciones.find(r => (!r.conceptos.length || r.conceptos.includes(m.concepto)) && r.desde <= HOY && (!r.hasta || r.hasta >= HOY));
      const destino = red?.destino ?? folioId;
      const nota = red ? ` (redirigido desde folio ${numeroFolio(x, folioId)})` : '';
      return enFolio(x, destino, e => ({ ...e, movs: [...e.movs, { ...m, id: uid('m'), motivo: m.motivo + nota }], bitacora: [...e.bitacora, ev(cuando, m.usuario, `Cargo registrado: ${m.descripcion || m.conceptoOrig} USD ${fmtN(m.importe)}${nota}`)] }), m.importe);
    }),
    corregir: (folioId: string, lineas: LineaSel[], motivo: string, usuario: string, cuando: string) => mut(x => {
      const total = r2(lineas.reduce((s, l) => s + l.importe, 0));
      return enFolio(x, folioId, e => ({
        ...e, bloqueados: [...e.bloqueados, ...lineas.map(l => l.id)],
        movs: [...e.movs, ...lineas.map(l => ({ id: uid('m'), fecha: HOY, hora: cuando.slice(11, 16), concepto: l.concepto, descripcion: l.descripcion, origen: 'FDK', conceptoOrig: l.conceptoOrig, importe: -l.importe, tipo: 'Corrección' as const, motivo, usuario, ref: l.id }))],
        bitacora: [...e.bitacora, ev(cuando, usuario, `Corrección de ${lineas.length} cargo(s): -USD ${fmtN(total)} · ${motivo}`)],
      }), -total);
    }),
    trasladar: (origenId: string, lineas: LineaSel[], destinoId: string, motivo: string, usuario: string, cuando: string) => mut(x => {
      const total = r2(lineas.reduce((s, l) => s + l.importe, 0));
      const nOrig = numeroFolio(x, origenId), nDest = numeroFolio(x, destinoId);
      const hora = cuando.slice(11, 16);
      let y = enFolio(x, origenId, e => ({
        ...e, bloqueados: [...e.bloqueados, ...lineas.map(l => l.id)],
        movs: [...e.movs, ...lineas.map(l => ({ id: uid('m'), fecha: HOY, hora, concepto: l.concepto, descripcion: `${l.descripcion} → folio ${nDest}`, origen: 'FDK', conceptoOrig: l.conceptoOrig, importe: -l.importe, tipo: 'Traslado' as const, motivo, usuario, ref: l.id }))],
        bitacora: [...e.bitacora, ev(cuando, usuario, `Traslado de ${lineas.length} cargo(s) al folio ${nDest} (${nombreFolio(x, destinoId)}): USD ${fmtN(total)} · ${motivo}`)],
      }), -total);
      y = enFolio(y, destinoId, e => ({
        ...e, movs: [...e.movs, ...lineas.map(l => ({ id: uid('m'), fecha: HOY, hora, concepto: l.concepto, descripcion: l.descripcion, origen: 'TO', conceptoOrig: l.conceptoOrig, importe: l.importe, tipo: 'Traslado' as const, motivo: `Desde folio ${nOrig}: ${motivo}`, usuario, ref: l.id }))],
        bitacora: [...e.bitacora, ev(cuando, usuario, `Recibe ${lineas.length} cargo(s) trasladados desde el folio ${nOrig}: USD ${fmtN(total)}`)],
      }), total);
      return y;
    }),
    redirigir: (folioId: string, r: Redireccion, usuario: string, cuando: string) => mut(x => enFolio(x, folioId, e => ({
      ...e, redirecciones: [...e.redirecciones, r], bitacora: [...e.bitacora, ev(cuando, usuario, `Redirección de ${r.conceptos.length ? r.conceptos.join(', ') : 'todos los cargos'} al folio ${numeroFolio(x, r.destino)}`)],
    }))),
    quitarRedireccion: (folioId: string, id: string, usuario: string, cuando: string) => mut(x => enFolio(x, folioId, e => ({
      ...e, redirecciones: e.redirecciones.filter(r => r.id !== id), bitacora: [...e.bitacora, ev(cuando, usuario, 'Redirección eliminada')],
    }))),
    /** Pago a un folio. `caja: null` = aplicación de depósito en garantía (no entra efectivo a la caja). */
    registrarPago: (folioId: string, p: PagoFolio, caja: { concepto: string; referencia: string; cliente: string } | null) => mut(x => {
      const f = formaPago(p.forma);
      const via = caja ? f.nombre : 'depósito en garantía';
      let y = enFolio(x, folioId, e => ({ ...e, pagos: [...e.pagos, p], bitacora: [...e.bitacora, ev(`${p.fecha}T${p.hora}`, p.usuario, `Pago registrado: ${p.moneda} ${fmtN(p.importe)} vía ${via}${p.tarjeta ? ` ****${p.tarjeta}` : ''}`)] }), 0, reservaDeFolio(folioId) ? p.montoFacturado : 0);
      if (!caja) return y;
      y = conCaja(y, { hora: p.hora, concepto: caja.concepto, referencia: p.tarjeta ? `${caja.referencia} ${p.tarjeta}` : caja.referencia, cliente: caja.cliente, metodo: f.metodo, terminal: f.terminal, moneda: p.moneda, importe: r2(p.importe - p.descuento), tipo: 'Ingreso' });
      return y;
    }),
    liquidar: (folioId: string, usuario: string, cuando: string) => mut(x => enFolio(x, folioId, e => {
      const total = saldoFolio(e);
      return { ...e, movs: e.movs.map(m => ({ ...m, historico: true })), pagos: e.pagos.map(p => ({ ...p, historico: true })), bitacora: [...e.bitacora, ev(cuando, usuario, `Liquidación de cargos: USD ${fmtN(total)}`)] };
    })),
    setExtraFolio: (folioId: string, p: Partial<Pick<ExtraFolio, 'exoneracion' | 'referencia'>>, usuario: string, cuando: string, accion: string) => mut(x => enFolio(x, folioId, e => ({ ...e, ...p, bitacora: [...e.bitacora, ev(cuando, usuario, accion)] }))),
    /** Cierra el folio (saldo cero) y emite la factura. */
    cerrarFolio: (folioId: string, usuario: string, cuando: string, formaPagoCuenta: string) => mut(x => {
      const documento = `FA-${x.seq.factura}`;
      const rid = reservaDeFolio(folioId);
      const r = rid ? x.reservas.find(y => y.id === rid) : undefined;
      const cta = x.foliosCta.find(c => c.id === folioId);
      const extra = rid ? x.foliosRes[rid] ?? extraVacio() : cta!;
      const lineas = [...(r ? lineasReserva(r) : []), ...extra.movs].filter(l => !l.historico);
      const total = r2(lineas.reduce((s, l) => s + l.importe, 0));
      const porGrupo: Record<string, number> = {};
      let hospedaje = 0, regimen = 0, otros = 0, impuestos = 0;
      lineas.forEach(l => {
        const d = desglose(l.importe, l.concepto); const g = conceptoDe(l.concepto).grupo;
        porGrupo[g] = r2((porGrupo[g] ?? 0) + d.produccion); impuestos += d.impuestos;
        if (l.concepto === 'HOSP' || l.concepto === 'DESC') hospedaje += d.produccion; else if (['BB', 'DESI'].includes(l.concepto)) regimen += d.produccion; else otros += d.produccion;
      });
      const nombre = r ? (x.perfiles.find(p => p.id === r.perfilId)?.nombre ?? r.nombre) : cta!.nombre;
      const fact: Factura = {
        id: uid('fa'), documento, folio: numeroFolio(x, folioId), clase: r ? 'reserva' : cta!.clase, origen: r ? (r.cliente === 'Agencia de Viajes' ? `A-${r.empresa.toUpperCase()}` : `H-${r.habitacion}`) : `E-${cta!.numero}`,
        cliente: nombre.toUpperCase(), reservaId: rid, folioId: rid ? null : folioId, tarifa: r?.tarifa ?? '', empresa: r ? r.empresa || 'Directo' : cta!.nombre, moneda: 'USD', impCobro: total, impFactura: total, impDepositado: r?.depGarantia ?? 0,
        fecha: `${cuando}:00`, entrada: r?.entrada ?? cta!.emision, salida: HOY, formaPago: formaPagoCuenta, usuario, hospedaje: r2(hospedaje), regimen: r2(regimen), otros: r2(otros), impuestos: r2(impuestos), servicios: 0, porGrupo, tipo: 'Factura',
      };
      const doc: DocFiscal = { id: uid('doc'), tipo: 'Factura', numero: documento, fecha: cuando, importe: total, motivo: '' };
      let y = enFolio(x, folioId, e => ({ ...e, estado: 'Cerrado', documentos: [...e.documentos, doc], bitacora: [...e.bitacora, ev(cuando, usuario, `Folio cerrado · factura ${documento} por USD ${fmtN(total)}`)] }));
      if (cta) y = { ...y, foliosCta: y.foliosCta.map(c => (c.id === folioId ? { ...c, estado: 'Cerrado', cierre: cuando } : c)) };
      return { ...y, facturas: [...y.facturas, fact], seq: { ...y.seq, factura: y.seq.factura + 1 } };
    }),
    /** Factura única de una reserva agrupada (grupo, o individual múltiple con «una sola factura»):
     *  cierra todos sus folios (folio de agencia/hospedaje y cuentas de consumo) con un mismo documento. */
    facturarAgrupado: (folioIds: string[], cliente: string, usuario: string, cuando: string, formaPagoCuenta: string) => mut(x => {
      const documento = `FA-${x.seq.factura}`;
      const porGrupo: Record<string, number> = {};
      let hospedaje = 0, regimen = 0, otros = 0, impuestos = 0, total = 0, deposito = 0;
      let y = x;
      let r0: Reserva | undefined;
      folioIds.forEach(folioId => {
        const rid = reservaDeFolio(folioId);
        const r = rid ? x.reservas.find(z => z.id === rid) : undefined;
        if (r && !r0) r0 = r;
        const cta = x.foliosCta.find(c => c.id === folioId);
        const extra = rid ? x.foliosRes[rid] ?? extraVacio() : cta;
        if (!extra) return;
        const lineas = [...(r ? lineasReserva(r) : []), ...extra.movs].filter(l => !l.historico);
        const sub = r2(lineas.reduce((s, l) => s + l.importe, 0));
        total += sub; deposito += r?.depGarantia ?? 0;
        lineas.forEach(l => {
          const d = desglose(l.importe, l.concepto); const g = conceptoDe(l.concepto).grupo;
          porGrupo[g] = r2((porGrupo[g] ?? 0) + d.produccion); impuestos += d.impuestos;
          if (l.concepto === 'HOSP' || l.concepto === 'DESC') hospedaje += d.produccion; else if (['BB', 'DESI'].includes(l.concepto)) regimen += d.produccion; else otros += d.produccion;
        });
        const doc: DocFiscal = { id: uid('doc'), tipo: 'Factura', numero: documento, fecha: cuando, importe: sub, motivo: 'Factura única de la reserva' };
        y = enFolio(y, folioId, e => ({ ...e, estado: 'Cerrado', documentos: [...e.documentos, doc], bitacora: [...e.bitacora, ev(cuando, usuario, `Folio cerrado · incluido en la factura única ${documento}`)] }));
        if (cta) y = { ...y, foliosCta: y.foliosCta.map(c => (c.id === folioId ? { ...c, estado: 'Cerrado', cierre: cuando } : c)) };
      });
      const p = r0;
      if (!p) return x;
      const fact: Factura = {
        id: uid('fa'), documento, folio: numeroFolio(x, folioIds[0]), clase: 'reserva', origen: p.empresa ? `A-${p.empresa.toUpperCase()}` : `H-${p.habitacion}`, cliente: cliente.toUpperCase(), reservaId: p.id, folioId: null,
        tarifa: p.tarifa, empresa: p.empresa || 'Directo', moneda: 'USD', impCobro: r2(total), impFactura: r2(total), impDepositado: deposito, fecha: `${cuando}:00`, entrada: p.entrada, salida: HOY, formaPago: formaPagoCuenta, usuario,
        hospedaje: r2(hospedaje), regimen: r2(regimen), otros: r2(otros), impuestos: r2(impuestos), servicios: 0, porGrupo, tipo: 'Factura',
      };
      return { ...y, facturas: [...y.facturas, fact], seq: { ...y.seq, factura: y.seq.factura + 1 } };
    }),
    reabrirFolio: (folioId: string, usuario: string, cuando: string) => mut(x => {
      let y = enFolio(x, folioId, e => ({ ...e, estado: 'Abierto', bitacora: [...e.bitacora, ev(cuando, usuario, 'Folio reabierto')] }));
      y = { ...y, foliosCta: y.foliosCta.map(c => (c.id === folioId ? { ...c, estado: 'Abierto', cierre: undefined } : c)) };
      return y;
    }),
    eliminarFolio: (folioId: string) => mut(x => ({ ...x, foliosCta: x.foliosCta.filter(c => c.id !== folioId) })),
    emitirNota: (folioId: string, tipo: 'Nota de crédito' | 'Nota de débito', importe: number, motivo: string, sobre: string, usuario: string, cuando: string) => mut(x => {
      const pref = tipo === 'Nota de crédito' ? 'NC' : 'ND';
      const numero = `${pref}-${x.seq.factura}`;
      const signo = tipo === 'Nota de crédito' ? -1 : 1;
      const base = x.facturas.find(f => f.documento === sobre);
      const doc: DocFiscal = { id: uid('doc'), tipo, numero, fecha: cuando, importe: signo * importe, motivo: `${motivo} (sobre ${sobre})` };
      const d = desglose(importe, 'HOSP');
      const fact: Factura | null = base ? { ...base, id: uid('fa'), documento: numero, tipo, origen: `${pref}-${base.origen}`, impCobro: signo * importe, impFactura: signo * importe, impDepositado: 0, fecha: `${cuando}:00`, usuario,
        hospedaje: signo * d.produccion, regimen: 0, otros: 0, impuestos: signo * d.impuestos, porGrupo: { HOSPEDAJE: signo * d.produccion } } : null;
      const y = enFolio(x, folioId, e => ({ ...e, documentos: [...e.documentos, doc], bitacora: [...e.bitacora, ev(cuando, usuario, `${tipo} ${numero} por USD ${fmtN(importe)} sobre ${sobre}: ${motivo}`)] }));
      return { ...y, facturas: fact ? [...y.facturas, fact] : y.facturas, seq: { ...y.seq, factura: y.seq.factura + 1 } };
    }),

    // ── Depósitos en garantía ───────────────────────────────────────────────
    crearDeposito: (d: Omit<Deposito, 'numero'>) => mut(x => {
      const dep: Deposito = { ...d, numero: x.seq.deposito };
      const usd = r2(aUSD(d.importe, d.moneda));
      let y: EstadoHotel = { ...x, depositos: [...x.depositos, dep], seq: { ...x.seq, deposito: x.seq.deposito + 1 },
        reservas: d.reservaId ? x.reservas.map(r => (r.id === d.reservaId ? { ...r, depGarantia: r2(r.depGarantia + usd) } : r)) : x.reservas };
      if (d.folioId) y = { ...y, foliosCta: y.foliosCta.map(c => (c.id === d.folioId ? { ...c, depGarantia: r2(c.depGarantia + usd) } : c)) };
      const metodo: Metodo = d.tipo.startsWith('Efectivo') || d.tipo === 'Cheque' ? 'Efectivo' : d.tipo === 'Tarjeta de crédito' ? 'Tarjeta' : 'Transferencia';
      const r = d.reservaId ? x.reservas.find(z => z.id === d.reservaId) : undefined;
      return conCaja(y, { hora: d.recibido.slice(11, 16), concepto: 'Depósito en garantía', referencia: `DG-${dep.numero}${metodo === 'Tarjeta' ? ' ' + d.tarjeta.numero.slice(-4) : ''}`, cliente: `${d.nombre}${r?.habitacion ? ' - ' + r.habitacion : ''}`, metodo, terminal: metodo === 'Tarjeta' ? 'POS Recepción 1 (BAC)' : '', moneda: d.moneda, importe: d.importe, tipo: 'Ingreso' });
    }),
    editarDeposito: (id: string, p: Partial<Deposito>) => mut(x => ({ ...x, depositos: x.depositos.map(d => (d.id === id ? { ...d, ...p } : d)) })),
    anularDeposito: (id: string, motivo: string, usuario: string, cuando: string) => mut(x => {
      const d = x.depositos.find(y => y.id === id);
      if (!d || d.estado === 'Anulado') return x;
      const usd = r2(aUSD(d.importe, d.moneda));
      const y: EstadoHotel = {
        ...x, depositos: x.depositos.map(z => (z.id === id ? { ...z, estado: 'Anulado', anulado: { fecha: cuando, usuario, motivo } } : z)),
        reservas: d.reservaId ? x.reservas.map(r => (r.id === d.reservaId ? { ...r, depGarantia: r2(Math.max(0, r.depGarantia - usd)) } : r)) : x.reservas,
        foliosCta: d.folioId ? x.foliosCta.map(c => (c.id === d.folioId ? { ...c, depGarantia: r2(Math.max(0, c.depGarantia - usd)) } : c)) : x.foliosCta,
      };
      const metodo: Metodo = d.tipo.startsWith('Efectivo') || d.tipo === 'Cheque' ? 'Efectivo' : d.tipo === 'Tarjeta de crédito' ? 'Tarjeta' : 'Transferencia';
      return metodo === 'Efectivo' ? conCaja(y, { hora: cuando.slice(11, 16), concepto: 'Devolución depósito en garantía', referencia: `DG-${d.numero}`, cliente: d.nombre, metodo, moneda: d.moneda, importe: d.importe, tipo: 'Egreso' }, usuario) : y;
    }),
  };
}
