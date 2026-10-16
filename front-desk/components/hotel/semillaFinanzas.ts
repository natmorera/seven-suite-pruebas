// Datos de ejemplo de Facturación (turnos, movimientos de caja, canjes, folios, depósitos, facturas y vouchers).
// La semilla es determinista para que el render del servidor y el del navegador coincidan.
// Al conectar la API se reemplaza `crearFinanzas()` por la carga inicial.
import { HOY, perfilVacio, prng, sumarDias, type Perfil, type Reserva } from './datos';
import { COMISIONES_CANJE, CUENTAS_CONTABLES, RESPONSABLE, TC, TERMINALES, TIPOS_DEPOSITO, TIPOS_FOLIO_EXT, aUSD, conceptoDe, conteoDe, deUSD, desglose, extraVacio, fmtN, folioDeReserva, formaPago, lineasReserva, metodoDeposito, pad, r2, tasaCruce, totalConteoUSD, type CajaDia, type Canje, type CierreCaja, type DatosFiscales, type Deposito, type EventoFolio, type ExtraFolio, type Factura, type Finanzas, type FolioCuenta, type Metodo, type Mon, type MovCaja, type MovFolio, type TipoMov, type Turno, type Voucher } from './finanzas';

// ── Semilla ──────────────────────────────────────────────────────────────────

export function crearFinanzas(reservas: Reserva[], perfiles: Perfil[]): Finanzas {
  const rnd = prng(70806);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
  const entre = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  let nId = 0;
  const id = (p: string) => `${p}${(++nId).toString(36)}`;
  const seq = { canje: 1, deposito: 41480, folio: 300040, factura: 8000, cierre: 1, voucher: 1 };
  const movsCaja: MovCaja[] = [];
  const vouchers: Voucher[] = [];
  const turnos: Turno[] = [];
  const ayer = sumarDias(HOY, -1);

  const voucher = (fecha: string, terminal: string, moneda: Mon, monto: number, origen: string, estado: Voucher['estado']) => {
    vouchers.push({ id: id('v'), fecha, terminal, tarjeta: String(entre(1000, 9999)), marca: pick(['Visa', 'Mastercard', 'Amex']), autorizacion: String(entre(100000, 999999)),
      referencia: String(entre(100000, 999999)) + String(entre(100000, 999999)), estado, moneda, monto: r2(monto), origen });
    seq.voucher++;
  };

  // ── Historial de turnos (30 días): madrugada, mañana y tarde ──────────────
  let efectivo = 1985;
  const faltantes: Record<string, number> = { [sumarDias(HOY, -27)]: -12, [sumarDias(HOY, -18)]: -25, [sumarDias(HOY, -9)]: -40 };
  for (let k = 30; k >= 1; k--) {
    const fecha = sumarDias(HOY, -k);
    const turnosDia: [string, string, string][] = [['Carlos Mora', '00:05', '06:00'], ['José Gregorio Gil', '06:00', '14:00'], [k % 2 ? 'Ana López' : 'María Rodríguez', '14:00', '23:55']];
    turnosDia.forEach(([cajero, ini, fin], j) => {
      const ingresos = r2(j === 0 ? entre(400, 1800) + rnd() : entre(2500, 9000) + rnd());
      const efectivoIng = r2(ingresos * 0.35);
      let egresos = r2(entre(0, 3) * 40);
      if (efectivo + efectivoIng - egresos > 3200) egresos = r2(egresos + (efectivo + efectivoIng - egresos - 1985));
      const dif = cajero === 'Carlos Mora' ? faltantes[fecha] ?? 0 : 0;
      const esperado = r2(efectivo + ingresos - egresos);
      const final = r2(efectivo + efectivoIng - egresos + dif);
      turnos.push({ id: id('t'), cajero, fecha, inicio: `${fecha}T${ini}`, fin: `${fecha}T${fin}`, saldoInicial: efectivo, difApertura: 0, obsApertura: '', turnoAnterior: turnos.at(-1)?.id ?? null,
        precierre: false, ingresos, egresos, nMovs: entre(6, 28), esperado, declarado: r2(esperado + dif), diferencia: dif, efectivoFinal: final,
        conteoCierre: conteoDe(final * 0.65, final * 0.35 * TC), comprobantes: { pos1: r2((ingresos - efectivoIng) * 0.8), pos2: 0, link: r2((ingresos - efectivoIng) * 0.2), transf: 0 },
        motivo: dif ? 'Error en vuelto dado al huésped' : undefined, detalles: dif ? 'Diferencia detectada en el arqueo. Revisar con cámaras.' : undefined, firmadoPor: cajero });
      efectivo = final;
      // Vouchers del día (liquidados por el cierre de lote)
      const nv = entre(2, 4);
      const pesos = Array.from({ length: nv }, () => 0.4 + rnd());
      const sumaP = pesos.reduce((a, b) => a + b, 0);
      pesos.forEach((w, v) => voucher(`${fecha}T${pad(Number(ini.slice(0, 2)) + 1 + v)}:${pad(entre(0, 59))}`, v % 3 === 2 ? TERMINALES[2] : TERMINALES[0], 'USD', (ingresos - efectivoIng) * w / sumaP, 'Pago de folio', 'Liquidado'));
    });
  }

  // ── Perfiles de los folios externos ───────────────────────────────────────
  const nuevoPerfil = (pid: string, tipo: 'cliente' | 'empresa', nombre: string, numeroId: string, email: string): Perfil => {
    const p = { ...perfilVacio(tipo), id: pid, numeroId, nombre, email, nacionalidad: 'Costa Rica', telefono: '+506 2222 0000',
      fiscal: { ...perfilVacio(tipo).fiscal, emitir: tipo === 'empresa', tipoId: tipo === 'empresa' ? 'Cédula Jurídica' as const : 'Cédula Física' as const, numeroId, razon: nombre, email } };
    if (!perfiles.some(x => x.id === pid)) perfiles.push(p);
    return p;
  };
  const odt = nuevoPerfil('p-odt', 'empresa', 'ODT Aventura S.A.', '3-101-123457', 'admin@otdad.com');
  const rayo = nuevoPerfil('p-crayo', 'cliente', 'Carlos Rayo', '1-1111-2222', 'carlos.rayo@correo.com');
  const viera = nuevoPerfil('p-dviera', 'cliente', 'Daniel Viera', '1-2345-6789', 'daniel.viera@correo.com');
  const volcano = nuevoPerfil('p-volcano', 'empresa', 'Volcano Lodge & Thermal Experience S.A.', '3-101-998877', 'reservas@volcanolodge.cr');
  const trails = nuevoPerfil('p-crtrails', 'empresa', 'Costa Rica Trails S.A.', '3-101-445577', 'cxc@crtrails.com');
  const horus = perfiles.find(p => p.nombre.startsWith('Horus'));

  const ev = (fecha: string, usuario: string, accion: string): EventoFolio => ({ id: id('e'), fecha, usuario, accion });
  const mov = (fecha: string, concepto: string, descripcion: string, importe: number, usuario: string, motivo = '', tipo: TipoMov = 'Cargo', origen = 'POS', hora = '10:00'): MovFolio =>
    ({ id: id('m'), fecha, hora, concepto: conceptoDe(concepto).codigo, descripcion, origen, conceptoOrig: conceptoDe(concepto).descripcion, importe, tipo, motivo, usuario });
  const fiscalDe = (p: Perfil, dir = 'San José, Costa Rica'): DatosFiscales => ({ activa: p.tipo === 'empresa', tipoId: p.tipo === 'empresa' ? 'Cédula Jurídica' : 'Cédula Física', numeroId: p.numeroId, razon: p.nombre, email: p.email, actividad: '7601.1 · Agencias de viajes', direccion: dir });
  const baseCta = (o: Partial<FolioCuenta> & Pick<FolioCuenta, 'id' | 'clase' | 'numero' | 'nombre'>): FolioCuenta => ({
    ...extraVacio(), perfilId: null, titular: '', tipo: TIPOS_FOLIO_EXT[0], cuenta: CUENTAS_CONTABLES[0], emision: sumarDias(HOY, -40), vencimiento: sumarDias(HOY, 60),
    moneda: 'USD', limite: 0, tipoDeposito: 'Sin depósito', depGarantia: 0, folioCredito: '', formaPago: '', tarjeta: { tipo: 'Sin tarjeta', numero: '', vence: '', nombre: '' },
    cheque: '', direccionEnvio: '', credito: false, fiscal: { activa: false, tipoId: '', numeroId: '', razon: '', email: '', actividad: '', direccion: '' }, cargosAuto: [], estado: 'Abierto', ...o,
  });

  // ── Cuentas casa ──────────────────────────────────────────────────────────
  const foliosCta: FolioCuenta[] = [
    baseCta({ id: 'fc-20000005', clase: 'casa', numero: '20000005', nombre: 'Consumo interno insumos', titular: 'Gerencia', tipo: 'Cuentas Casa', emision: '2018-10-30', vencimiento: '2028-10-30', cuenta: '5101005 - [001] - Consumo interno',
      movs: [
        mov(sumarDias(HOY, -3), 'ABX', 'Desayuno Staff', -15, 'Carlos Rayo', 'Error de cobro', 'Corrección', 'FDK', '07:40'),
        mov(sumarDias(HOY, -2), 'LAV', 'Ropa', 12, 'Ernesto Ríos', 'Mantenimiento', 'Cargo', 'POS', '09:15'),
        mov(sumarDias(HOY, -1), 'MINI', 'Reposición minibar', 67.02, 'Daniel Viera', 'Consumo interno', 'Cargo', 'POS', '16:20'),
        mov(HOY, 'ABX', 'Almuerzo Staff', 45.02, 'Daniel Viera', 'Consumo interno', 'Cargo', 'POS', '06:30'),
      ],
      bitacora: [ev('2018-10-30T08:00', 'seven', 'Cuenta casa creada')] }),
    baseCta({ id: 'fc-20000006', clase: 'casa', numero: '20000006', nombre: 'Cortesías gerencia', titular: 'Gerencia General', tipo: 'Cuentas Casa', emision: '2019-01-15', vencimiento: '2029-01-15', cuenta: '5101006 - [001] - Cortesías',
      movs: [mov(sumarDias(HOY, -5), 'TOUR', 'Cortesía agencia', 85, 'Juan Pérez', 'Cortesía'), mov(sumarDias(HOY, -1), 'SPA', 'Masaje VIP hab 402', 60, 'Juan Pérez', 'Aniversario huésped')],
      bitacora: [ev('2019-01-15T08:00', 'seven', 'Cuenta casa creada')] }),
    baseCta({ id: 'fc-20000007', clase: 'casa', numero: '20000007', nombre: 'Atenciones a huéspedes', titular: 'Recepción', tipo: 'Cuentas Casa', emision: '2020-06-01', vencimiento: '2030-06-01', cuenta: '5101007 - [001] - Atenciones',
      movs: [mov(sumarDias(HOY, -4), 'BB', 'Desayuno queja hab 203', 18, 'Ernesto Ríos', 'Compensación')], bitacora: [ev('2020-06-01T08:00', 'seven', 'Cuenta casa creada')] }),
  ];

  // ── Folios externos ───────────────────────────────────────────────────────
  const ext = (numero: string, p: Perfil, o: Partial<FolioCuenta>) => baseCta({ id: `fx-${numero}`, clase: 'externo', numero, nombre: p.nombre, perfilId: p.id, fiscal: fiscalDe(p), ...o,
    bitacora: [ev(`${o.emision ?? sumarDias(HOY, -40)}T09:00`, 'Jose Perez', `Folio creado con límite de crédito USD ${fmtN(o.limite ?? 0)}`), ...(o.bitacora ?? [])] });
  foliosCta.push(
    ext('100061', rayo, { tipo: TIPOS_FOLIO_EXT[3], cuenta: CUENTAS_CONTABLES[0], emision: sumarDias(HOY, -20), vencimiento: sumarDias(HOY, 12), movs: [mov(sumarDias(HOY, -6), 'ALM', 'Almuerzo reunión', 38.5, 'Ernesto Ríos')] }),
    ext('100062', odt, { tipo: TIPOS_FOLIO_EXT[3], cuenta: CUENTAS_CONTABLES[0], limite: 1000, emision: sumarDias(HOY, -60), vencimiento: sumarDias(HOY, -2), estado: 'Cerrado', cierre: `${sumarDias(HOY, -3)}T15:20`,
      movs: [mov(sumarDias(HOY, -10), 'TOUR', 'Tour grupo ODT', 450, 'Jose Perez')],
      pagos: [{ id: id('pg'), fecha: sumarDias(HOY, -3), hora: '15:10', moneda: 'USD', forma: 'TRF', tasa: 1, importe: 450, comision: 0, descuento: 0, referencia: 'TRF-88231', tarjeta: '', venceTarjeta: '', montoFacturado: 450, pendiente: 0, incluirDeposito: false, usuario: 'Jose Perez' }] }),
    ext('300032', odt, { tipo: TIPOS_FOLIO_EXT[2], cuenta: CUENTAS_CONTABLES[1], limite: 1000, folioCredito: '74555', emision: sumarDias(HOY, -15), vencimiento: sumarDias(HOY, 20), direccionEnvio: 'San José, Costa Rica',
      fiscal: { ...fiscalDe(odt), numeroId: '3-101-123456', email: 'admin@otdad.com' },
      movs: [
        mov(sumarDias(HOY, -4), 'ABX', 'ABX - Restaurante exonerado', -15, 'Jose Perez', 'Error de cobro', 'Corrección', 'TO'),
        mov(sumarDias(HOY, -3), 'LAV', 'Lavandería hotel', 12, 'Jose Perez'),
        mov(sumarDias(HOY, -2), 'MINI', 'Minibar', 67.02, 'Jose Perez'),
        mov(sumarDias(HOY, -1), 'ABX', 'ABX - Restaurante exonerado', 45.02, 'Jose Perez'),
      ],
      bitacora: [ev(`${sumarDias(HOY, -3)}T10:12`, 'Jose Perez', 'Cargo registrado: Lavandería USD 12.00')] }),
    ext('300034', viera, { tipo: TIPOS_FOLIO_EXT[2], cuenta: CUENTAS_CONTABLES[1], limite: 1000, emision: sumarDias(HOY, -8), vencimiento: sumarDias(HOY, 25),
      movs: [mov(sumarDias(HOY, -7), 'TRA', 'Transporte aeropuerto', 85, 'Jose Perez'), mov(sumarDias(HOY, -5), 'ALM', 'Almuerzo', 24.04, 'Jose Perez')] }),
    ext('300035', volcano, { tipo: TIPOS_FOLIO_EXT[0], cuenta: CUENTAS_CONTABLES[2], limite: 1000, credito: true, emision: sumarDias(HOY, -25), vencimiento: sumarDias(HOY, 5),
      movs: [mov(sumarDias(HOY, -20), 'HOSP', 'Hospedaje grupo prensa', 860, 'Jose Perez', '', 'Cargo', 'FDK'), mov(sumarDias(HOY, -19), 'TOUR', 'Tour volcán x 4', 340, 'Jose Perez'), mov(sumarDias(HOY, -19), 'ALM', 'Almuerzo grupo', 96, 'Jose Perez')] }),
    ext('300036', trails, { tipo: TIPOS_FOLIO_EXT[2], cuenta: CUENTAS_CONTABLES[3], limite: 5000, credito: true, emision: sumarDias(HOY, -30), vencimiento: sumarDias(HOY, 45),
      movs: [mov(sumarDias(HOY, -12), 'TRA', 'Traslados grupo', 240, 'Jose Perez'), mov(sumarDias(HOY, -2), 'BOX', 'Box lunch x 12', 156, 'Jose Perez')] }),
    ...(horus ? [ext('300037', horus, { tipo: TIPOS_FOLIO_EXT[1], cuenta: CUENTAS_CONTABLES[0], emision: sumarDias(HOY, -3), vencimiento: sumarDias(HOY, 90), movs: [mov(sumarDias(HOY, -1), 'ALQ', 'Alquiler sala de reuniones', 180, 'Jose Perez')] })] : []),
  );

  // ── Reservas: agencias finalizadas con saldo (crédito) y consumos in-house ─
  const foliosRes: Record<string, ExtraFolio> = {};
  const extraRes = (rid: string) => (foliosRes[rid] ??= extraVacio());
  const completadas = reservas.filter(r => r.estado === 'Completada' && r.cliente === 'Agencia de Viajes' && r.salida >= sumarDias(HOY, -6) && r.salida <= HOY).slice(0, 6);
  completadas.forEach(r => {
    const total = r2(lineasReserva(r).reduce((s, l) => s + l.importe, 0));
    r.pagado = 0; r.credito = true; r.cuentas = [{ ...r.cuentas[0], saldo: total }];
    extraRes(r.id).bitacora.push(ev(`${r.salida}T11:00`, 'seven', `Check-out con saldo a crédito de agencia (${r.empresa})`));
  });
  const CONSUMOS: [string, string, number][] = [['MINI', 'Minibar', 18.5], ['LAV', 'Lavandería', 22], ['ALM', 'Almuerzo', 31.6], ['BCNBY', 'Bar canopy bebidas', 14], ['SPA', 'Spa', 65], ['PARQ', 'Parqueo', 10]];
  reservas.filter(r => r.estado === 'In-House').forEach(r => {
    const e = extraRes(r.id);
    // Lo que ya estaba en las cuentas y no corresponde a líneas de hospedaje (p. ej. «Cuenta 2») se refleja como consumos POS
    const base = r2(lineasReserva(r).reduce((s, l) => s + l.importe, 0) - r.pagado);
    let falta = r2(r.cuentas.reduce((s, c) => s + c.saldo, 0) - base);
    while (falta > 0.009) {
      const [cod, desc, monto] = pick(CONSUMOS);
      const imp = r2(Math.min(falta, monto));
      e.movs.push(mov(sumarDias(HOY, -entre(0, 1)), cod, desc, imp, 'seven', '', 'Cargo', 'POS', `${pad(entre(7, 21))}:${pad(entre(0, 59))}`));
      falta = r2(falta - imp);
    }
    // Consumos POS del día (ajustan el saldo de la cuenta 1)
    if (rnd() > 0.55) {
      const [cod, desc, monto] = pick(CONSUMOS);
      e.movs.push(mov(HOY, cod, desc, monto, pick(['seven', 'xandat']), rnd() > 0.7 ? 'Prueba' : '', 'Cargo', 'POS', `0${entre(6, 7)}:${pad(entre(0, 59))}`));
      r.cuentas = r.cuentas.map((c, i) => (i === 0 ? { ...c, saldo: r2(c.saldo + monto), consumos: c.consumos + 1 } : c));
    }
    e.bitacora.push(ev(`${r.entrada}T14:00`, 'seven', `Check-in · folio ${folioDeReserva(r)} abierto`));
  });

  // ── Caja del día: turno de madrugada cerrado y dos turnos abiertos ────────
  const tCarlos: Turno = { id: 'tur-carlos-hoy', cajero: 'Carlos Mora', fecha: HOY, inicio: `${HOY}T00:05`, fin: `${HOY}T06:00`, saldoInicial: efectivo, difApertura: 0, obsApertura: '', turnoAnterior: turnos.at(-1)!.id, precierre: false, diferencia: -35,
    motivo: 'Error en vuelto dado al huésped', detalles: 'Posible error en vuelto del cobro a Juan Campos (05:03). Revisar con cámaras.', firmadoPor: 'Carlos Mora' };
  const tJose: Turno = { id: 'tur-jose-hoy', cajero: 'José Gregorio Gil', fecha: HOY, inicio: `${HOY}T06:02`, fin: null, saldoInicial: 0, conteoApertura: undefined, difApertura: 0, obsApertura: '', turnoAnterior: tCarlos.id, precierre: false, diferencia: 0 };
  const tMaria: Turno = { id: 'tur-maria-hoy', cajero: 'María Rodríguez', fecha: HOY, inicio: `${HOY}T06:10`, fin: null, saldoInicial: 0, difApertura: 0, obsApertura: '', turnoAnterior: tCarlos.id, precierre: false, diferencia: 0 };
  const caja = (t: Turno, hora: string, concepto: string, referencia: string, cliente: string, metodo: Metodo, moneda: Mon, importe: number, tipo: 'Ingreso' | 'Egreso' = 'Ingreso', terminal = '') => {
    movsCaja.push({ id: id('mc'), turnoId: t.id, fecha: HOY, hora, concepto, referencia, cliente, metodo, terminal, moneda, importe: r2(importe), usd: r2(aUSD(importe, moneda)), tipo, usuario: t.cajero });
    if (metodo === 'Tarjeta' || metodo === 'Link de pago') voucher(`${HOY}T${hora}`, terminal || TERMINALES[0], moneda, importe, concepto, 'Aprobado');
  };

  // Canjes de los últimos días (los de hoy entran a la caja)
  const canjes: Canje[] = [];
  const conPerfil = reservas.filter(r => r.estado === 'In-House' && r.perfilId);
  const canje = (fecha: string, t: Turno | null, o: { origen: Mon; destino: Mon; importe: number; com: string; r?: Reserva; nombre?: string; obs?: string }) => {
    const tasa = tasaCruce(o.origen, o.destino);
    const bruto = r2(o.importe * tasa);
    const c = COMISIONES_CANJE.find(x => x.id === o.com)!;
    const comision = r2(bruto * c.pct / 100);
    const k: Canje = { id: id('cj'), numero: seq.canje++, fecha, perfilId: o.r?.perfilId ?? null, nombre: o.r ? perfiles.find(p => p.id === o.r!.perfilId)?.nombre ?? o.r.nombre : o.nombre ?? '', habitacion: o.r?.habitacion ?? '',
      pasaporte: o.r?.identificacion ?? '', reservaId: o.r?.id ?? null, monedaOrigen: o.origen, importeOrigen: o.importe, monedaDestino: o.destino, tasa, importeDestino: bruto, comisionId: c.id, comisionPct: c.pct, comision, entregado: r2(bruto - comision), observaciones: o.obs ?? '', usuario: t?.cajero ?? pick(['José Gregorio Gil', 'María Rodríguez', 'Ana López']) };
    canjes.push(k);
    if (t) {
      caja(t, fecha.slice(11, 16), 'Canje de divisas', `CJ-${String(k.numero).padStart(5, '0')}`, k.nombre || '-', 'Efectivo', k.monedaOrigen, k.importeOrigen);
      caja(t, fecha.slice(11, 16), 'Canje de divisas (entrega)', `CJ-${String(k.numero).padStart(5, '0')}`, k.nombre || '-', 'Efectivo', k.monedaDestino, k.entregado, 'Egreso');
    }
    return k;
  };
  for (let k = 9; k >= 1; k--) {
    const r = rnd() > 0.4 ? pick(conPerfil) : undefined;
    canje(`${sumarDias(HOY, -k)}T${pad(entre(8, 20))}:${pad(entre(0, 59))}`, null, { origen: pick(['USD', 'USD', 'EUR'] as Mon[]), destino: 'CRC', importe: pick([50, 100, 200, 300]), com: pick(['sin', 'sin', 'c1', 'c2']), r, nombre: r ? undefined : '' });
  }
  canje(`${HOY}T06:20`, tMaria, { origen: 'USD', destino: 'CRC', importe: 100, com: 'sin', r: conPerfil[0] });
  canje(`${HOY}T06:48`, tJose, { origen: 'USD', destino: 'CRC', importe: 200, com: 'c1', r: conPerfil[1] });
  canje(`${HOY}T07:05`, tJose, { origen: 'CRC', destino: 'USD', importe: 25300, com: 'sin', nombre: '' });

  // ── Depósitos en garantía ─────────────────────────────────────────────────
  const depositos: Deposito[] = [];
  const futuras = reservas.filter(r => r.estado === 'Confirmada' && r.entrada >= HOY).slice(0, 14);
  futuras.forEach((r, i) => {
    const tipo = TIPOS_DEPOSITO[i % 4 === 3 ? 2 : i % 5 === 4 ? 3 : 0];
    const moneda: Mon = tipo === 'Efectivo Colones' ? 'CRC' : 'USD';
    const importe = r2(Math.max(50, Math.round(r.precio * pick([0.5, 1, 1, 2]) / 10) * 10));
    const hoy = i >= futuras.length - 2;
    const fecha = hoy ? `${HOY}T0${6 + (i % 2)}:${pad(entre(15, 55))}` : `${sumarDias(HOY, -entre(2, 20))}T${pad(entre(8, 19))}:${pad(entre(0, 59))}`;
    const d: Deposito = { id: id('dg'), numero: seq.deposito++, reservaId: r.id, folioId: null, nombre: r.nombre, tarifa: r.tarifa, asignado: r.habitacion ? `Hab-${r.habitacion}` : '', moneda, tasa: 1, importe,
      entregado: importe, comisionPct: 0, comision: 0, vuelto: 0, tipo, referencia: '', tarjeta: tipo === 'Tarjeta de crédito' ? { nombre: r.nombre, numero: `•••• ${entre(1000, 9999)}`, mes: '12', anio: '2028' } : { nombre: '', numero: '', mes: '', anio: '' },
      vence: sumarDias(r.entrada, -1), recibido: fecha, observaciones: '', estado: 'Activo', usuario: hoy ? 'José Gregorio Gil' : pick(['José Gregorio Gil', 'María Rodríguez', 'Ana López']) };
    if (i === 3) { d.estado = 'Anulado'; d.anulado = { fecha: `${sumarDias(HOY, -1)}T10:30`, usuario: 'José Gregorio Gil', motivo: 'Cancelación de la reserva por el cliente' }; }
    depositos.push(d);
    if (d.estado === 'Activo') r.depGarantia = r2(r.depGarantia + importe);
    if (hoy) caja(tJose, fecha.slice(11, 16), 'Depósito en garantía', `DG-${d.numero}`, `${r.empresa || r.nombre}${r.habitacion ? ' - ' + r.habitacion : ''}`, metodoDeposito(tipo), moneda, importe, 'Ingreso', metodoDeposito(tipo) === 'Tarjeta' ? TERMINALES[0] : '');
  });

  // ── Pagos de folios del día ───────────────────────────────────────────────
  const pagoReserva = (t: Turno, r: Reserva, hora: string, forma: string, monto: number) => {
    const f = formaPago(forma);
    const saldo = r.cuentas.reduce((s, c) => s + c.saldo, 0);
    const usd = r2(Math.min(monto, saldo));
    if (usd <= 0) return;
    let resto = usd;
    r.cuentas = r.cuentas.map(c => { const q = Math.min(c.saldo, resto); resto = r2(resto - q); return { ...c, saldo: r2(c.saldo - q) }; });
    r.pagado = r2(r.pagado + usd);
    const importe = r2(deUSD(usd, f.moneda));
    extraRes(r.id).pagos.push({ id: id('pg'), fecha: HOY, hora, moneda: f.moneda, forma, tasa: tasaCruce('USD', f.moneda), importe, comision: 0, descuento: 0, referencia: '', tarjeta: f.metodo === 'Tarjeta' ? String(entre(1000, 9999)) : '',
      venceTarjeta: f.metodo === 'Tarjeta' ? '08/2028' : '', montoFacturado: usd, pendiente: r2(saldo - usd), incluirDeposito: false, usuario: t.cajero });
    extraRes(r.id).bitacora.push(ev(`${HOY}T${hora}`, t.cajero, `Pago registrado: ${f.moneda} ${fmtN(importe)} vía ${f.nombre}`));
    caja(t, hora, r.rooming ? `Reserva agencia / Hab ${r.habitacion}` : `Reserva directa / Habitación ${r.habitacion}`, r.numero, `${perfiles.find(p => p.id === r.perfilId)?.nombre ?? r.nombre} - ${r.habitacion}`, f.metodo, f.moneda, importe, 'Ingreso', f.terminal);
  };
  const conSaldo = reservas.filter(r => r.estado === 'In-House' && r.cuentas.reduce((s, c) => s + c.saldo, 0) > 50);
  if (conSaldo[0]) pagoReserva(tJose, conSaldo[0], '06:15', 'BACD', 320);
  if (conSaldo[1]) pagoReserva(tJose, conSaldo[1], '06:35', 'EFD', 210);
  if (conSaldo[2]) pagoReserva(tJose, conSaldo[2], '07:12', 'EFC', 150);
  if (conSaldo[3]) pagoReserva(tMaria, conSaldo[3], '06:25', 'BACD', 180);
  if (conSaldo[4]) pagoReserva(tJose, conSaldo[4], '07:20', 'LINK', 140);
  // Folio externo 300034: pago con tarjeta
  const f34 = foliosCta.find(f => f.numero === '300034')!;
  f34.pagos.push({ id: id('pg'), fecha: HOY, hora: '06:55', moneda: 'USD', forma: 'BACD', tasa: 1, importe: 100, comision: 0, descuento: 0, referencia: '', tarjeta: '4417', venceTarjeta: '09/2027', montoFacturado: 100, pendiente: 9.04, incluirDeposito: false, usuario: 'José Gregorio Gil' });
  f34.bitacora.push(ev(`${HOY}T06:55`, 'José Gregorio Gil', 'Pago registrado: USD 100.00 vía Mastercard'));
  caja(tJose, '06:55', 'Folio externo', `FE-${f34.numero}`, viera.nombre, 'Tarjeta', 'USD', 100, 'Ingreso', TERMINALES[0]);
  caja(tJose, '07:15', 'Compra caja chica (suministros)', 'CC-0012', '-', 'Efectivo', 'USD', 40, 'Egreso');

  // Saldos de apertura de los turnos de hoy (fondo variable: hereda el efectivo del anterior)
  const carlosMovs: [string, string, string, string, Metodo, Mon, number, 'Ingreso' | 'Egreso'][] = [
    ['01:20', 'Reserva directa / Habitación 104', 'RD-4190', 'Juan Campos - 104', 'Efectivo', 'CRC', 185000, 'Ingreso'],
    ['03:40', 'Bar canopy bebidas', 'POS-2210', 'Hab 301', 'Tarjeta', 'USD', 64, 'Ingreso'],
    ['05:03', 'Reserva directa / Habitación 104', 'RD-4190', 'Juan Campos - 104', 'Efectivo', 'USD', 120, 'Ingreso'],
    ['05:30', 'Devolución depósito', 'DG-41470', 'Laura Ortiz - 207', 'Efectivo', 'USD', 80, 'Egreso'],
  ];
  carlosMovs.forEach(([hora, c, ref, cli, met, mon, imp, tipo]) => caja(tCarlos, hora, c, ref, cli, met, mon, imp, tipo, met === 'Tarjeta' ? TERMINALES[0] : ''));
  {
    const ms = movsCaja.filter(m => m.turnoId === tCarlos.id);
    const ing = r2(ms.filter(m => m.tipo === 'Ingreso').reduce((s, m) => s + m.usd, 0));
    const egr = r2(ms.filter(m => m.tipo === 'Egreso').reduce((s, m) => s + m.usd, 0));
    const efe = (tipo: 'Ingreso' | 'Egreso', mon: Mon) => ms.filter(m => m.tipo === tipo && m.metodo === 'Efectivo' && m.moneda === mon).reduce((s, m) => s + m.importe, 0);
    tCarlos.ingresos = ing; tCarlos.egresos = egr; tCarlos.nMovs = ms.length;
    tCarlos.esperado = r2(tCarlos.saldoInicial + ing - egr);
    tCarlos.declarado = r2(tCarlos.esperado - 35);
    const usdCash = efectivo * 0.65 + efe('Ingreso', 'USD') - efe('Egreso', 'USD');
    const crcCash = efectivo * 0.35 * TC + efe('Ingreso', 'CRC') - efe('Egreso', 'CRC');
    tCarlos.conteoCierre = conteoDe(usdCash - 35, crcCash);
    tCarlos.comprobantes = { pos1: 64, pos2: 0, link: 0, transf: 0 };
    tCarlos.efectivoFinal = totalConteoUSD(tCarlos.conteoCierre);
    tJose.saldoInicial = tCarlos.efectivoFinal; tMaria.saldoInicial = tCarlos.efectivoFinal;
    tJose.conteoApertura = tCarlos.conteoCierre;
  }
  turnos.push(tCarlos, tJose, tMaria);

  // ── Facturas: folios cerrados de reservas completadas y externos ──────────
  const facturas: Factura[] = [];
  const pagadas = reservas.filter(r => r.estado === 'Completada' && r.salida <= HOY && !completadas.includes(r)).sort((a, b) => a.salida.localeCompare(b.salida));
  const agrupar = (lineas: MovFolio[]) => {
    const porGrupo: Record<string, number> = {};
    let hospedaje = 0, regimen = 0, otros = 0, impuestos = 0;
    lineas.forEach(l => {
      const { produccion, impuestos: imp } = desglose(l.importe, l.concepto);
      const g = conceptoDe(l.concepto).grupo;
      porGrupo[g] = r2((porGrupo[g] ?? 0) + produccion);
      impuestos += imp;
      if (l.concepto === 'HOSP' || l.concepto === 'DESC') hospedaje += produccion; else if (['BB', 'DESI'].includes(l.concepto)) regimen += produccion; else otros += produccion;
    });
    return { porGrupo, hospedaje: r2(hospedaje), regimen: r2(regimen), otros: r2(otros), impuestos: r2(impuestos) };
  };
  pagadas.forEach(r => {
    const lineas = lineasReserva(r);
    const total = r2(lineas.reduce((s, l) => s + l.importe, 0));
    const agencia = r.cliente === 'Agencia de Viajes';
    const forma = agencia ? 'Cuenta por cobrar Costa Rica Trails - 1402002' : pick(['Caja de cambio - 1001004', 'Caja de cambio - 1001004', 'BN Tarjetas Dolares - 1201002', 'BAC Colones 93591667 - 1102003']);
    const crc = forma.startsWith('BAC Colones');
    facturas.push({ id: id('fa'), documento: `FA-${seq.factura++}`, folio: folioDeReserva(r), clase: 'reserva', origen: agencia ? `A-${r.empresa.toUpperCase()}` : `H-${r.habitacion}`, cliente: (perfiles.find(p => p.id === r.perfilId)?.nombre ?? r.nombre).toUpperCase(),
      reservaId: r.id, folioId: null, tarifa: r.tarifa, empresa: r.empresa || 'Directo', moneda: crc ? 'CRC' : 'USD', impCobro: crc ? r2(deUSD(total, 'CRC')) : total, impFactura: total, impDepositado: r.depGarantia,
      fecha: `${r.salida}T${pad(entre(9, 17))}:${pad(entre(0, 59))}:${pad(entre(0, 59))}`, entrada: r.entrada, salida: r.salida, formaPago: forma, usuario: pick(['seven', 'severo', 'xandat']), servicios: 0, tipo: 'Factura', ...agrupar(lineas) });
  });
  foliosCta.filter(f => f.estado === 'Cerrado').forEach(f => {
    const total = r2(f.movs.reduce((s, m) => s + m.importe, 0));
    const doc = `FA-${seq.factura++}`;
    f.documentos.push({ id: id('doc'), tipo: 'Factura', numero: doc, fecha: f.cierre ?? HOY, importe: total, motivo: '' });
    facturas.push({ id: id('fa'), documento: doc, folio: f.numero, clase: f.clase, origen: `E-${f.numero}`, cliente: f.nombre.toUpperCase(), reservaId: null, folioId: f.id, tarifa: '', empresa: f.nombre, moneda: 'USD', impCobro: total, impFactura: total, impDepositado: 0,
      fecha: `${f.cierre ?? HOY}:00`, entrada: f.emision, salida: (f.cierre ?? HOY).slice(0, 10), formaPago: 'BAC Dólares 93591675 - 1102004', usuario: 'Jose Perez', servicios: 0, tipo: 'Factura', ...agrupar(f.movs) });
  });
  // Nota de crédito de ejemplo sobre una factura de agencia
  const fAg = [...facturas].reverse().find(f => f.origen.startsWith('A-'));
  if (fAg) facturas.push({ ...fAg, id: id('fa'), documento: 'NC-136', tipo: 'Nota de crédito', origen: `NC-${fAg.origen}`, impCobro: -r2(fAg.impFactura * 0.5), impFactura: -r2(fAg.impFactura * 0.5), impDepositado: 0, fecha: `${HOY}T05:30:12`, formaPago: 'Cuentas por Cobrar Clientes - 1401001',
    hospedaje: -r2(fAg.hospedaje * 0.5), regimen: -r2(fAg.regimen * 0.5), otros: -r2(fAg.otros * 0.5), impuestos: -r2(fAg.impuestos * 0.5), porGrupo: Object.fromEntries(Object.entries(fAg.porGrupo).map(([k, v]) => [k, -r2(v * 0.5)])) });

  const cajaDia: CajaDia = { fecha: HOY, estado: 'abierta', apertura: `${HOY}T00:05`, abiertaPor: RESPONSABLE, ultimaApertura: `${ayer}T00:05`, ultimoCierre: `${ayer}T23:58`, cerradaPor: RESPONSABLE, folioCierre: '', observaciones: '', recibidoPor: '' };
  const cierres: CierreCaja[] = Array.from({ length: 30 }, (_, i) => {
    const fecha = sumarDias(HOY, -30 + i);
    const ts = turnos.filter(t => t.fecha === fecha);
    return { folio: `CC-${fecha.slice(0, 4)}-${fecha.slice(5, 7)}${fecha.slice(8, 10)}-001`, fecha, hora: '23:58', firmadoPor: RESPONSABLE, recibidoPor: 'Laura Contabilidad', observaciones: '', turnos: ts.map(t => t.id),
      ingresos: r2(ts.reduce((s, t) => s + (t.ingresos ?? 0), 0)), egresos: r2(ts.reduce((s, t) => s + (t.egresos ?? 0), 0)), saldoFinal: ts.at(-1)?.efectivoFinal ?? 0, diferencia: r2(ts.reduce((s, t) => s + t.diferencia, 0)), nMovs: ts.reduce((s, t) => s + (t.nMovs ?? 0), 0) };
  });

  return { sesion: RESPONSABLE, cajaDia, cierres, turnos, movsCaja, canjes, foliosCta, foliosRes, depositos, facturas, vouchers, seq };
}
