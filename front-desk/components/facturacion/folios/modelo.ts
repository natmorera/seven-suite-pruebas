// Vista unificada de folios: cuentas casa, folios externos y folios de reservas
// (estos últimos se calculan de la reserva: hospedaje y régimen por noche,
// cargos de la reserva, más los movimientos manuales del folio).
import { useMemo } from 'react';
import { useHotel, saldoReserva } from '@/components/hotel/store';
import type { Perfil, Reserva } from '@/components/hotel/datos';
import {
  CUENTAS_CONTABLES, extraVacio, folioDeReserva, lineasReserva, r2, saldoFolio,
  type ClaseFolio, type DatosFiscales, type DocFiscal, type EventoFolio, type ExoneracionFolio, type FolioCuenta, type MovFolio, type PagoFolio, type Redireccion, type ReferenciaFolio,
} from '@/components/hotel/finanzas';
import { idFolioReserva } from '@/components/hotel/accionesFinanzas';

export interface LineaFolio extends MovFolio { derivado?: boolean; bloqueado: boolean }
export interface FolioVista {
  id: string; clase: ClaseFolio; numero: string; nombre: string; perfilId: string | null; perfil?: Perfil; reserva?: Reserva; cta?: FolioCuenta;
  habitacion: string; reservaNumero: string; emision: string; vencimiento: string; titular: string; tipo: string; cuenta: string; moneda: 'USD' | 'CRC';
  limite: number; depGarantia: number; folioCredito: string; formaPago: string; fiscal: DatosFiscales; direccionEnvio: string;
  estado: 'Abierto' | 'Cerrado'; lineas: LineaFolio[]; pagos: PagoFolio[]; bitacora: EventoFolio[]; documentos: DocFiscal[]; redirecciones: Redireccion[];
  exoneracion?: ExoneracionFolio; referencia?: ReferenciaFolio; totalCargos: number; totalPagado: number; saldo: number; factura?: string;
}

const fiscalDePerfil = (p?: Perfil): DatosFiscales => p ? ({
  activa: p.fiscal.emitir, tipoId: p.fiscal.tipoId || p.tipoId, numeroId: p.fiscal.numeroId || p.numeroId, razon: p.fiscal.razon || p.nombre, email: p.fiscal.email || p.email,
  actividad: p.fiscal.actividad, direccion: [p.dir.canton, p.dir.provincia, p.dir.pais].filter(Boolean).join(', '),
}) : { activa: false, tipoId: '', numeroId: '', razon: '', email: '', actividad: '', direccion: '' };

export function folioDeCuenta(c: FolioCuenta, perfiles: Perfil[]): FolioVista {
  const perfil = perfiles.find(p => p.id === c.perfilId);
  const lineas = c.movs.map(m => ({ ...m, bloqueado: c.bloqueados.includes(m.id) || m.tipo !== 'Cargo' }));
  const vig = lineas.filter(l => !l.historico);
  return {
    id: c.id, clase: c.clase, numero: c.numero, nombre: c.nombre, perfilId: c.perfilId, perfil, cta: c, habitacion: '', reservaNumero: '',
    emision: c.emision, vencimiento: c.vencimiento, titular: c.titular, tipo: c.tipo, cuenta: c.cuenta, moneda: c.moneda, limite: c.limite, depGarantia: c.depGarantia,
    folioCredito: c.folioCredito, formaPago: c.formaPago, fiscal: c.fiscal.razon ? c.fiscal : fiscalDePerfil(perfil), direccionEnvio: c.direccionEnvio || c.fiscal.direccion,
    estado: c.estado, lineas, pagos: c.pagos, bitacora: c.bitacora, documentos: c.documentos, redirecciones: c.redirecciones, exoneracion: c.exoneracion, referencia: c.referencia,
    totalCargos: r2(vig.reduce((s, l) => s + l.importe, 0)), totalPagado: r2(c.pagos.filter(p => !p.historico).reduce((s, p) => s + p.montoFacturado, 0)), saldo: saldoFolio(c),
    factura: [...c.documentos].reverse().find(d => d.tipo === 'Factura')?.numero,
  };
}

export function folioDeReservaVista(r: Reserva, perfiles: Perfil[], extras: Record<string, ReturnType<typeof extraVacio>>, facturas?: Map<string, string>): FolioVista {
  const e = extras[r.id] ?? extraVacio();
  const perfil = perfiles.find(p => p.id === r.perfilId);
  const lineas: LineaFolio[] = [
    ...lineasReserva(r).map(l => ({ ...l, derivado: true, bloqueado: e.bloqueados.includes(l.id) })),
    ...e.movs.map(m => ({ ...m, bloqueado: e.bloqueados.includes(m.id) || m.tipo !== 'Cargo' })),
  ].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const pagosManual = r2(e.pagos.reduce((s, p) => s + p.montoFacturado, 0));
  const anticipo = r2(r.pagado - pagosManual);
  const pagos: PagoFolio[] = [
    ...(anticipo > 0.005 ? [{ id: `${r.id}-ant`, fecha: r.checkinEn ?? r.entrada, hora: '00:00', moneda: 'USD' as const, forma: 'ANT', tasa: 1, importe: anticipo, comision: 0, descuento: 0, referencia: 'Anticipos de la reserva',
      tarjeta: '', venceTarjeta: '', montoFacturado: anticipo, pendiente: 0, incluirDeposito: false, usuario: 'seven' }] : []),
    ...e.pagos,
  ];
  const saldo = r2(saldoReserva(r));
  const limite = Number(perfil?.extra.maximo) || (r.credito ? 1000 : 0);
  const estado = e.estado ?? (r.estado === 'In-House' || saldo > 0.005 ? 'Abierto' : 'Cerrado');
  return {
    id: idFolioReserva(r.id), clase: 'reserva', numero: folioDeReserva(r), nombre: perfil?.nombre ?? r.nombre, perfilId: r.perfilId, perfil, reserva: r,
    habitacion: r.habitacion, reservaNumero: r.numero, emision: r.entrada, vencimiento: r.salida, titular: r.empresa || 'Directo', tipo: r.rooming ? 'Rooming list' : r.cliente,
    cuenta: r.cliente === 'Agencia de Viajes' ? CUENTAS_CONTABLES[3] : CUENTAS_CONTABLES[0], moneda: r.moneda, limite, depGarantia: r.depGarantia, folioCredito: r.credito ? folioDeReserva(r) : '',
    formaPago: r.credito ? 'Crédito' : '', fiscal: fiscalDePerfil(perfil), direccionEnvio: fiscalDePerfil(perfil).direccion,
    estado, lineas, pagos, bitacora: e.bitacora, documentos: e.documentos, redirecciones: e.redirecciones, exoneracion: e.exoneracion, referencia: e.referencia,
    totalCargos: r2(lineas.reduce((s, l) => s + l.importe, 0)), totalPagado: r2(r.pagado), saldo, factura: [...e.documentos].reverse().find(d => d.tipo === 'Factura')?.numero ?? facturas?.get(r.id),
  };
}

/** Todos los folios. Los de reservas incluyen in-house y completadas. */
export function useFolios() {
  const h = useHotel();
  const cuentas = useMemo(() => h.foliosCta.map(c => folioDeCuenta(c, h.perfiles)), [h.foliosCta, h.perfiles]);
  const facturas = useMemo(() => new Map(h.facturas.filter(f => f.reservaId && f.tipo === 'Factura').map(f => [f.reservaId!, f.documento])), [h.facturas]);
  const reservas = useMemo(() => h.reservas.filter(r => (r.estado === 'In-House' || r.estado === 'Completada') && r.habitacion)
    .map(r => folioDeReservaVista(r, h.perfiles, h.foliosRes, facturas)), [h.reservas, h.perfiles, h.foliosRes, facturas]);
  const porId = useMemo(() => new Map([...cuentas, ...reservas].map(f => [f.id, f])), [cuentas, reservas]);
  const todos = useMemo(() => [...cuentas, ...reservas], [cuentas, reservas]);
  return { cuentas, reservas, porId, todos };
}

/** Folios que pueden recibir cargos trasladados o redirigidos. */
export function destinosPosibles(f: { cuentas: FolioVista[]; reservas: FolioVista[] }, excepto: string) {
  return [
    ...f.reservas.filter(x => x.reserva?.estado === 'In-House' && x.id !== excepto).sort((a, b) => a.habitacion.localeCompare(b.habitacion))
      .map(x => ({ value: x.id, label: `Habitación ${x.habitacion} · ${x.nombre} (folio ${x.numero})`, grupo: 'Habitaciones' })),
    ...f.cuentas.filter(x => x.clase === 'externo' && x.estado === 'Abierto' && x.id !== excepto).map(x => ({ value: x.id, label: `Folio externo ${x.numero} · ${x.nombre}`, grupo: 'Folios externos' })),
    ...f.cuentas.filter(x => x.clase === 'casa' && x.id !== excepto).map(x => ({ value: x.id, label: `Cuenta casa ${x.numero} · ${x.nombre}`, grupo: 'Cuentas casa' })),
  ];
}
