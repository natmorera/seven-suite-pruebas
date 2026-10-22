'use client';
// Store operativo de Front Desk. Vive en el Shell, así que lo comparten todas
// las pantallas. Cada acción representa una operación del PMS (check-in,
// check-out, mover, bloquear…); al conectar el backend cada una pasa a ser
// una llamada a la API seguida de la actualización local.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { HOY, USUARIO_ACTUAL, segundosLimpieza, sumarDias, tareaAbierta, type Adjunto, type Bloqueo, type BloqueoHab, type Caja, type EstadoLimpieza, type DatosHotel, type EstadoHotel, type Habitacion, type Perfil, type Reserva, type Tarea } from './datos';
import { crearSemilla } from './semilla';
import { crearFinanzas } from './semillaFinanzas';
import { totalConteoUSD } from './finanzas';
import { accionesFinanzas } from './accionesFinanzas';
import { accionesReservas, ajustarSemilla } from './reservas';
import { accionesAuditoria, crearAuditoria } from './auditoria';

let contador = 0;
const ahoraIso = () => { const a = new Date(); return `${HOY}T${String(a.getHours()).padStart(2, '0')}:${String(a.getMinutes()).padStart(2, '0')}`; };
export const nuevoId = (p: string) => `${p}${Date.now().toString(36)}${(contador++).toString(36)}`;

/** Estado de la tarea considerando el vencimiento (Atrasado lo pone la auditoría nocturna). */
export const estadoTarea = (t: Tarea): Tarea['estado'] => (tareaAbierta(t) && t.vencimiento < HOY ? 'Atrasado' : t.estado);
const bloqueoActivo = (b: Bloqueo | null, t: Tarea) => !!b && tareaAbierta(t) && b.inicio <= HOY && b.fin >= HOY;
const cubreHoy = (b: BloqueoHab) => b.desde <= HOY && (!b.hasta || b.hasta >= HOY);

/** El estado «bloqueada» del mapa se deriva de los bloqueos vigentes hoy (Ama de llaves + tareas):
 *  una habitación libre con bloqueo pasa a Bloqueada y, al terminar o eliminar el bloqueo, vuelve a Libre.
 *  Una habitación ocupada o con llegada hoy no se bloquea hoy (Bloqueo de habitaciones no lo permite). */
function sincronizarBloqueos(habs: Habitacion[], tareas: Tarea[], bloqueos: BloqueoHab[], reservas: Reserva[]): Habitacion[] {
  const activos = new Map<string, string>();
  tareas.forEach(t => { if (bloqueoActivo(t.bloqueo, t)) t.bloqueo!.habitaciones.forEach(h => activos.set(h, t.bloqueo!.motivo || t.tarea)); });
  bloqueos.forEach(b => { if (cubreHoy(b)) activos.set(b.habitacion, b.motivo || 'Bloqueo de habitación'); });
  return habs.map(h => {
    const m = activos.get(h.numero);
    if (m !== undefined && h.estado === 'libre') return { ...h, estado: 'bloqueada', motivoBloqueo: m };
    if (m !== undefined && h.estado === 'bloqueada') return h.motivoBloqueo === m ? h : { ...h, motivoBloqueo: m };
    if (m === undefined && h.estado === 'bloqueada') return { ...h, estado: estadoLibreDe(h.numero, reservas), motivoBloqueo: '' };
    return h;
  });
}

function estadoLibreDe(numero: string, reservas: Reserva[]): Habitacion['estado'] {
  const llegadas = reservas.filter(r => r.habitacion === numero && r.estado === 'Confirmada' && r.entrada === HOY);
  if (!llegadas.length) return 'libre';
  return llegadas.some(r => r.rooming) ? 'checkinRL' : 'checkin';
}

function useHotelState() {
  const [d, setD] = useState<EstadoHotel>(() => {
    const s0 = crearSemilla();
    const { reservas, habitaciones, datos } = ajustarSemilla(s0);
    const s = { ...s0, reservas, habitaciones };
    return { ...s, ...datos, ...crearAuditoria(s.reservas), ...crearFinanzas(s.reservas, s.perfiles) };
  });
  // Después de cada operación se re-deriva el estado «bloqueada» del mapa (bloqueos de Ama de llaves + tareas),
  // así un check-out, un cambio de habitación o una anulación nunca dejan una habitación bloqueada como libre o al revés.
  const mut = useCallback((f: (d: EstadoHotel) => EstadoHotel) => setD(x => {
    const y = f(x);
    if (y === x || (y.habitaciones === x.habitaciones && y.bloqueos === x.bloqueos && y.tareas === x.tareas)) return y;
    const habitaciones = sincronizarBloqueos(y.habitaciones, y.tareas, y.bloqueos, y.reservas);
    return habitaciones.every((h, i) => h === y.habitaciones[i]) ? y : { ...y, habitaciones };
  }), []);

  const acciones = useMemo(() => {
    const patchRes = (x: EstadoHotel, id: string, p: Partial<Reserva>) => x.reservas.map(r => (r.id === id ? { ...r, ...p } : r));
    const patchHab = (habs: Habitacion[], num: string, p: Partial<Habitacion>) => habs.map(h => (h.numero === num ? { ...h, ...p } : h));
    return {
      setHab: (num: string, p: Partial<Habitacion>) => mut(x => ({ ...x, habitaciones: patchHab(x.habitaciones, num, p) })),
      toggleSucia: (num: string) => mut(x => ({ ...x, habitaciones: x.habitaciones.map(h => (h.numero === num ? { ...h, sucia: !h.sucia, noRequiere: false } : h)) })),
      /** Ama de llaves: Sucia / Limpia / No requiere (excluyentes). */
      setLimpieza: (nums: string[], e: EstadoLimpieza) => mut(x => ({ ...x, habitaciones: x.habitaciones.map(h => (nums.includes(h.numero) ? { ...h, sucia: e === 'sucia', noRequiere: e === 'noRequiere', limpieza: e === 'sucia' ? undefined : h.limpieza } : h)) })),
      /** Cronómetro de limpieza (vista de camarera): iniciar → pausar / reanudar → finalizar (queda Limpia). */
      iniciarLimpieza: (num: string, camarera: string) => mut(x => ({ ...x, habitaciones: patchHab(x.habitaciones, num, { limpieza: { estado: 'enCurso', camarera, inicio: new Date().toISOString(), segundos: 0, desde: Date.now(), pausas: 0 } }) })),
      pausarLimpieza: (num: string) => mut(x => ({ ...x, habitaciones: x.habitaciones.map(h => (h.numero !== num || h.limpieza?.estado !== 'enCurso' ? h
        : { ...h, limpieza: { ...h.limpieza, estado: 'pausada', segundos: segundosLimpieza(h.limpieza), desde: null, pausas: h.limpieza.pausas + 1 } })) })),
      reanudarLimpieza: (num: string) => mut(x => ({ ...x, habitaciones: x.habitaciones.map(h => (h.numero !== num || h.limpieza?.estado !== 'pausada' ? h : { ...h, limpieza: { ...h.limpieza, estado: 'enCurso', desde: Date.now() } })) })),
      finalizarLimpieza: (num: string) => mut(x => ({ ...x, habitaciones: x.habitaciones.map(h => (h.numero !== num || !h.limpieza ? h
        : { ...h, sucia: false, noRequiere: false, limpieza: { ...h.limpieza, estado: 'finalizada', segundos: segundosLimpieza(h.limpieza), desde: null, fin: new Date().toISOString() } })) })),
      agregarAdjuntos: (num: string, a: Adjunto[]) => mut(x => ({ ...x, habitaciones: x.habitaciones.map(h => (h.numero === num ? { ...h, adjuntos: [...(h.adjuntos ?? []), ...a] } : h)) })),
      quitarAdjunto: (num: string, id: string) => mut(x => ({ ...x, habitaciones: x.habitaciones.map(h => (h.numero === num ? { ...h, adjuntos: (h.adjuntos ?? []).filter(y => y.id !== id) } : h)) })),
      asignarCamarera: (nums: string[], camarera: string) => mut(x => ({ ...x, habitaciones: x.habitaciones.map(h => (nums.includes(h.numero) ? { ...h, camarera } : h)) })),
      cambiarSabanas: (nums: string[], fecha = HOY) => mut(x => ({ ...x, habitaciones: x.habitaciones.map(h => (nums.includes(h.numero) ? { ...h, sabanas: fecha } : h)) })),
      /** Bloqueo rápido (Mapa): crea un bloqueo desde hoy; `hasta` vacío = indefinido. */
      bloquear: (num: string, motivo: string, hasta = '') => mut(x => {
        const bloqueos = [...x.bloqueos, { id: nuevoId('bq'), habitacion: num, desde: HOY, hasta, motivo, usuario: x.sesion ?? USUARIO_ACTUAL, creado: ahoraIso() }];
        return { ...x, bloqueos, habitaciones: sincronizarBloqueos(x.habitaciones, x.tareas, bloqueos, x.reservas) };
      }),
      /** Cambia motivo y fecha final del bloqueo manual vigente de la habitación. */
      editarBloqueo: (num: string, motivo: string, hasta = '') => mut(x => {
        const bloqueos = x.bloqueos.map(b => (b.habitacion === num && !b.tareaId && cubreHoy(b) ? { ...b, motivo, hasta } : b));
        return { ...x, bloqueos, habitaciones: sincronizarBloqueos(x.habitaciones, x.tareas, bloqueos, x.reservas) };
      }),
      desbloquear: (num: string) => mut(x => {
        // los bloqueos manuales que empezaron antes de hoy terminan ayer (quedan en el historial); los de hoy se eliminan
        const bloqueos = x.bloqueos.flatMap(b => (b.habitacion !== num || !cubreHoy(b) ? [b] : b.desde < HOY ? [{ ...b, hasta: sumarDias(HOY, -1) }] : []));
        // si el bloqueo venía de una tarea, se quita la habitación de ese bloqueo
        const tareas = x.tareas.map(t => (t.bloqueo?.habitaciones.includes(num) && bloqueoActivo(t.bloqueo, t) ? { ...t, bloqueo: t.bloqueo.habitaciones.length > 1 ? { ...t.bloqueo, habitaciones: t.bloqueo.habitaciones.filter(h => h !== num) } : null } : t));
        return { ...x, bloqueos, tareas, habitaciones: sincronizarBloqueos(x.habitaciones, tareas, bloqueos, x.reservas) };
      }),
      /** Crea o actualiza un bloqueo (Ama de llaves → Bloqueo de habitaciones). */
      guardarBloqueo: (b: BloqueoHab) => mut(x => {
        const bloqueos = x.bloqueos.some(y => y.id === b.id) ? x.bloqueos.map(y => (y.id === b.id ? b : y)) : [...x.bloqueos, b];
        return { ...x, bloqueos, habitaciones: sincronizarBloqueos(x.habitaciones, x.tareas, bloqueos, x.reservas) };
      }),
      eliminarBloqueo: (id: string) => mut(x => {
        const bloqueos = x.bloqueos.flatMap(b => (b.id !== id ? [b] : b.desde < HOY && cubreHoy(b) ? [{ ...b, hasta: sumarDias(HOY, -1) }] : []));
        return { ...x, bloqueos, habitaciones: sincronizarBloqueos(x.habitaciones, x.tareas, bloqueos, x.reservas) };
      }),
      setReserva: (id: string, p: Partial<Reserva>) => mut(x => ({ ...x, reservas: patchRes(x, id, p) })),
      checkIn: (id: string, p: Partial<Reserva> = {}) => mut(x => {
        const r = x.reservas.find(y => y.id === id)!;
        const hab = p.habitacion ?? r.habitacion;
        let habitaciones = x.habitaciones;
        if (r.habitacion && r.habitacion !== hab) habitaciones = patchHab(habitaciones, r.habitacion, { estado: estadoLibreDe(r.habitacion, x.reservas.filter(y => y.id !== id)) });
        habitaciones = patchHab(habitaciones, hab, { estado: 'ocupada', reservaId: id });
        return { ...x, habitaciones, reservas: patchRes(x, id, { ...p, habitacion: hab, estado: 'In-House', checkinEn: HOY, tarjetaLista: true }) };
      }),
      revertirCheckIn: (id: string) => mut(x => {
        const r = x.reservas.find(y => y.id === id)!;
        const reservas = patchRes(x, id, { estado: 'Confirmada', checkinEn: null });
        return { ...x, reservas, habitaciones: patchHab(x.habitaciones, r.habitacion, { estado: estadoLibreDe(r.habitacion, reservas), reservaId: null }) };
      }),
      cancelarCheckIn: (num: string) => mut(x => ({
        ...x, habitaciones: patchHab(x.habitaciones, num, { estado: 'libre' }),
        reservas: x.reservas.map(r => (r.habitacion === num && r.estado === 'Confirmada' && r.entrada === HOY ? { ...r, habitacion: '' } : r)),
      })),
      checkOut: (id: string) => mut(x => {
        const r = x.reservas.find(y => y.id === id)!;
        const reservas = patchRes(x, id, { estado: 'Completada', checkoutEn: HOY, salida: HOY });
        return { ...x, reservas, habitaciones: patchHab(x.habitaciones, r.habitacion, { estado: estadoLibreDe(r.habitacion, reservas), sucia: true, noRequiere: false, limpieza: undefined, reservaId: null }) };
      }),
      pagarCuenta: (id: string, cuentaId: string) => mut(x => {
        const r = x.reservas.find(y => y.id === id)!;
        const c = r.cuentas.find(y => y.id === cuentaId)!;
        return { ...x, reservas: patchRes(x, id, { pagado: r.pagado + c.saldo, cuentas: r.cuentas.map(y => (y.id === cuentaId ? { ...y, saldo: 0, consumos: 0 } : y)) }) };
      }),
      prepago: (id: string, monto: number) => mut(x => {
        const r = x.reservas.find(y => y.id === id)!;
        return { ...x, reservas: patchRes(x, id, { pagado: r.pagado + monto, cuentas: r.cuentas.map((c, i) => (i === 0 ? { ...c, saldo: Math.max(0, c.saldo - monto) } : c)) }) };
      }),
      anular: (id: string) => mut(x => {
        const r = x.reservas.find(y => y.id === id)!;
        const reservas = patchRes(x, id, { estado: 'Anulada' });
        const h = x.habitaciones.find(y => y.numero === r.habitacion);
        const habitaciones = h && (h.reservaId === id || ['checkin', 'checkinRL'].includes(h.estado))
          ? patchHab(x.habitaciones, h.numero, { estado: estadoLibreDe(h.numero, reservas), reservaId: h.reservaId === id ? null : h.reservaId }) : x.habitaciones;
        return { ...x, reservas, habitaciones };
      }),
      mover: (id: string, destino: string, precio: number, motivo: string) => mut(x => {
        const r = x.reservas.find(y => y.id === id)!;
        const dest = x.habitaciones.find(h => h.numero === destino)!;
        const reservas = patchRes(x, id, { habitacion: destino, tipo: dest.tipo, precio, observacionesInternas: [r.observacionesInternas, motivo && `Cambio ${r.habitacion}→${destino}: ${motivo}`].filter(Boolean).join('\n') });
        let habitaciones = x.habitaciones;
        if (r.estado === 'In-House') {
          habitaciones = patchHab(habitaciones, r.habitacion, { estado: estadoLibreDe(r.habitacion, reservas), sucia: true, reservaId: null });
          habitaciones = patchHab(habitaciones, destino, { estado: r.salida === HOY ? 'checkout' : 'ocupada', reservaId: id });
        } else {
          habitaciones = patchHab(habitaciones, r.habitacion, { estado: estadoLibreDe(r.habitacion, reservas) });
          habitaciones = patchHab(habitaciones, destino, { estado: estadoLibreDe(destino, reservas) });
        }
        return { ...x, reservas, habitaciones };
      }),
      crearReserva: (r: Reserva) => mut(x => {
        const reservas = [...x.reservas, r];
        const h = x.habitaciones.find(y => y.numero === r.habitacion);
        const habitaciones = h && h.estado === 'libre' && r.entrada === HOY ? patchHab(x.habitaciones, h.numero, { estado: estadoLibreDe(h.numero, reservas) }) : x.habitaciones;
        return { ...x, reservas, habitaciones };
      }),
      guardarPerfil: (p: Perfil) => mut(x => ({ ...x, perfiles: x.perfiles.some(y => y.id === p.id) ? x.perfiles.map(y => (y.id === p.id ? p : y)) : [...x.perfiles, p] })),
      vincularPerfil: (reservaId: string, perfilId: string) => mut(x => ({ ...x, reservas: patchRes(x, reservaId, { perfilId }) })),
      setTareas: (f: (t: Tarea[]) => Tarea[]) => mut(x => {
        const tareas = f(x.tareas);
        return { ...x, tareas, habitaciones: sincronizarBloqueos(x.habitaciones, tareas, x.bloqueos, x.reservas) };
      }),
      /** Las cajas del dashboard son los turnos abiertos: «Precierre» marca el turno y «Cerrada» lo cierra (cierre forzado). */
      setCaja: (id: string, p: Partial<Caja>) => mut(x => {
        const t = x.turnos.find(y => y.id === id);
        if (!t) return x;
        if (p.estado === 'Precierre') return { ...x, turnos: x.turnos.map(y => (y.id === id ? { ...y, precierre: true } : y)) };
        if (p.estado !== 'Cerrada') return x;
        const ms = x.movsCaja.filter(m => m.turnoId === id);
        const ing = ms.filter(m => m.tipo === 'Ingreso').reduce((s, m) => s + m.usd, 0), egr = ms.filter(m => m.tipo === 'Egreso').reduce((s, m) => s + m.usd, 0);
        const esperado = Math.round((t.saldoInicial + ing - egr) * 100) / 100;
        const ahora = new Date();
        return { ...x, turnos: x.turnos.map(y => (y.id === id ? { ...y, fin: `${HOY}T${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`, precierre: false, forzado: true, forzadoPor: x.sesion,
          motivo: 'Cierre forzado', detalles: 'Cerrado desde el Dashboard', esperado, declarado: esperado, ingresos: ing, egresos: egr, nMovs: ms.length, efectivoFinal: totalConteoUSD(y.conteoApertura) } : y)) };
      }),
      ...accionesFinanzas(mut),
      ...accionesReservas(mut),
      ...accionesAuditoria(mut),
      quitarAlerta: (id: string) => mut(x => ({ ...x, alertas: x.alertas.filter(a => a.id !== id) })),
    };
  }, [mut]);

  // «Cajas abiertas» del dashboard = turnos abiertos de la caja (una por hotel, un turno por cajero)
  const cajas = useMemo<Caja[]>(() => d.turnos.filter(t => !t.fin).map(t => ({
    id: t.id, nombre: `Caja · ${t.cajero}`, estado: t.precierre ? 'Precierre' : 'Abierta', apertura: t.inicio, cajero: t.cajero, fondo: t.saldoInicial,
    movimientos: d.movsCaja.filter(m => m.turnoId === t.id).map(m => ({ hora: m.hora, concepto: m.concepto, monto: m.tipo === 'Egreso' ? -m.usd : m.usd })),
  })), [d.turnos, d.movsCaja]);

  return { ...d, cajas, ...acciones } as DatosHotel & typeof acciones;
}

type Hotel = ReturnType<typeof useHotelState>;
const Ctx = createContext<Hotel | null>(null);

export function HotelProvider({ children }: { children: ReactNode }) {
  const v = useHotelState();
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
export function useHotel() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useHotel debe usarse dentro de <HotelProvider>');
  return c;
}

// ── Derivados reutilizables ─────────────────────────────────────────────────
export const totalReserva = (r: Reserva) => {
  const n = Math.max(1, Math.round((new Date(r.salida + 'T12:00:00').getTime() - new Date(r.entrada + 'T12:00:00').getTime()) / 86400000));
  const cargos = r.cargos.reduce((s, c) => s + c.cantidad * c.precio * Math.max(1, Math.round((new Date(c.hasta + 'T12:00:00').getTime() - new Date(c.desde + 'T12:00:00').getTime()) / 86400000) || 1), 0);
  return Math.max(0, r.precio * n + cargos - r.descuento);
};
export const saldoReserva = (r: Reserva) => r.cuentas.reduce((s, c) => s + c.saldo, 0);
