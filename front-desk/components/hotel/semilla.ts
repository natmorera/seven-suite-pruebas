// Datos de ejemplo de la operación (habitaciones, reservas, perfiles, tareas y alertas).
// La semilla es determinista (no usa Math.random) para que el render del servidor y el del navegador coincidan.
// Al conectar la API se reemplaza `crearSemilla()` por la carga inicial.
import { ACTIVIDADES, CONDICIONES, HOY, NACIONALIDADES, PAISES, TARIFAS, TIPOS, USUARIO_ACTUAL, dirVacia, fmtF, formatearId, noches, perfilVacio, prng, sumarDias, type Alerta, type BloqueoHab, type DatosOperacion, type EstadoReserva, type Habitacion, type Perfil, type Reserva, type Tarea } from './datos';

const NOMBRES = [
  ['Juan Adolfo Sosa', 'CRI'], ['Laura Hernández Solano', 'CRI'], ['Paola Hernández', 'CRI'], ['Mario Matamoros', 'CRI'], ['Juan Pérez Garro', 'CRI'],
  ['Isaac Overfield', 'USA'], ['Roberto Hernández', 'USA'], ['Allan Trejos', 'CRI'], ['Simone Nabholz', 'ALE'], ['David García', 'USA'],
  ['Andrea Zeiger', 'ALE'], ['Anton Zeiger', 'ALE'], ['April Nowicki', 'USA'], ['Atlas Ponte', 'USA'], ['Betty Sarria', 'USA'],
  ['Bonnie Wilcock', 'USA'], ['Christopher Davidson', 'USA'], ['Clemence Furstenfeld', 'FRA'], ['Clement Poret', 'FRA'], ['Consuelo Darío', 'CRI'],
  ['Liam Ferguson', 'CAN'], ['Pam Ferguson', 'CAN'], ['Alberto Gómez Castillo', 'CRI'], ['Esteban Chavarría Solano', 'CRI'], ['Valeria Madrigal Pinto', 'CRI'],
  ['Jean-Pierre Laurent', 'FRA'], ['Sophie Henderson', 'CAN'], ['Carlos Ruiz Pastor', 'ESP'], ['Thomas Müller', 'ALE'], ['Elena Rostova', 'ITA'],
  ['Francesco Vitti', 'ITA'], ['Isabella Martínez', 'MEX'], ['Jonathan Wright', 'USA'], ['Yuki Tanaka', 'JPN'], ['Derek Rojas', 'CRI'],
  ['Elizabeth Morales', 'MEX'], ['Patricia Vega', 'ARG'], ['Fabián Gómez Guillén', 'CRI'], ['Laura Ortiz Mora', 'CRI'], ['Marta Gómez Silveira', 'ESP'],
] as const;
export function crearSemilla(): DatosOperacion {
  const r = prng(20261006);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const habitaciones: Habitacion[] = [];
  const tiposPorPiso = [['STD', 'STD', 'STD', 'SUP', 'SUP', 'STD', 'SUP', 'STD'], ['SUP', 'SUP', 'DLX', 'DLX', 'STD', 'SUP', 'DLX', 'STD'], ['DLX', 'DLX', 'FAM', 'FAM', 'SUP', 'DLX', 'FAM', 'SUP'], ['JRS', 'JRS', 'FAM', 'DLX', 'JRS', 'FAM', 'DLX', 'JRS']];
  tiposPorPiso.forEach((fila, p) => fila.forEach((t, i) => habitaciones.push({
    numero: `${p + 1}0${i + 1}`, tipo: t, piso: p + 1, estado: 'libre', sucia: false, motivoBloqueo: '', observaciones: '', reservaId: null,
  })));

  const reservas: Reserva[] = [];
  const perfiles: Perfil[] = [];
  let nNombre = 0, nRes = 4180;
  const nuevaReserva = (hab: Habitacion, entrada: string, salida: string, estado: EstadoReserva, extra: Partial<Reserva> = {}): Reserva => {
    const [nombre, nac] = NOMBRES[nNombre++ % NOMBRES.length];
    const t = pick(TARIFAS);
    const tipo = TIPOS.find(x => x.id === hab.tipo)!;
    const precio = Math.round(tipo.tarifa * (t.nombre === 'DIR' ? 1 : t.nombre === 'CORP' ? 0.85 : 0.92));
    const total = precio * noches(entrada, salida);
    const pagado = estado === 'Completada' ? total : Math.round(total * pick([0, 0.5, 1]) * 100) / 100;
    const conPerfil = r() > 0.3;
    const id = `r${++nRes}`;
    const perfilId = conPerfil ? `p-${nombre.toLowerCase().replace(/[^a-z]/g, '')}` : null;
    if (perfilId && !perfiles.some(p => p.id === perfilId)) {
      const num = String(100000000 + Math.floor(r() * 899999999));
      perfiles.push({
        ...perfilVacio('cliente'), id: perfilId, tipoId: nac === 'CRI' ? 'Cédula Física' : 'Pasaporte', numeroId: nac === 'CRI' ? formatearId('Cédula Física', num) : `${nac}${num.slice(0, 7)}`,
        nombre, nacionalidad: NACIONALIDADES[nac], email: `${nombre.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@correo.com`, telefono: `+506 8${String(Math.floor(r() * 9999999)).padStart(7, '0')}`,
        genero: r() > 0.5 ? 'M' : 'F', dir: { ...dirVacia(), pais: NACIONALIDADES[nac] === 'Costa Rica' ? 'Costa Rica' : PAISES.includes(NACIONALIDADES[nac]) ? NACIONALIDADES[nac] : 'Estados Unidos' },
        extra: { ...perfilVacio().extra, vip: r() > 0.75 },
      });
    }
    const perfil = perfiles.find(p => p.id === perfilId);
    return {
      id, numero: `${extra.rooming || t.cliente === 'Agencia de Viajes' ? 'RL' : 'RE'}-${nRes}`, rooming: false, perfilId, nombre: nombre.toUpperCase(), empresa: t.empresa, cliente: t.cliente,
      habitacion: hab.numero, tipo: hab.tipo, entrada, salida, adultos: 1 + Math.floor(r() * 2), ninos: r() > 0.8 ? 1 : 0,
      tarifa: t.nombre, precio, regimen: pick(['SP', '1.BB', 'DESI', 'DESI', 'MP']), moneda: 'USD', estado, pagado, depGarantia: r() > 0.6 ? Math.round(precio * 0.5) : 0, credito: r() > 0.7,
      condiciones: r() > 0.75 ? [pick(CONDICIONES)] : [], observaciones: '', observacionesInternas: '',
      nacionalidad: nac, identificacion: perfil?.numeroId ?? '', email: perfil?.email ?? '', telefono: perfil?.telefono ?? '', vip: perfil?.extra.vip ?? false,
      tarjetaLista: estado !== 'Confirmada' || r() > 0.5, checkinEn: estado === 'In-House' || estado === 'Completada' ? entrada : null, checkoutEn: estado === 'Completada' ? salida : null,
      cuentas: [{ id: id + 'c1', nombre: 'Cuenta 1', saldo: Math.max(0, Math.round((total - pagado) * 100) / 100), consumos: estado === 'Confirmada' ? 0 : Math.floor(r() * 4) }],
      cargos: [], adicionales: [], descuento: 0, ...extra,
    };
  };

  // Situación actual por habitación
  habitaciones.forEach((h, i) => {
    const caso = [0, 1, 1, 2, 3, 1, 0, 4, 1, 5, 1, 0, 6, 1, 3, 1, 0, 1, 2, 1, 7, 0, 1, 4, 1, 0, 5, 1, 3, 0, 1, 1][i];
    if (caso === 1) { // ocupada
      const res = nuevaReserva(h, sumarDias(HOY, -1 - Math.floor(r() * 4)), sumarDias(HOY, 1 + Math.floor(r() * 4)), 'In-House');
      reservas.push(res); h.estado = 'ocupada'; h.reservaId = res.id; h.sucia = r() > 0.6;
    } else if (caso === 2) { // sale hoy
      const res = nuevaReserva(h, sumarDias(HOY, -3), HOY, 'In-House');
      if (i % 2) res.cuentas.push({ id: res.id + 'c2', nombre: 'Cuenta 2', saldo: 85, consumos: 2 });
      reservas.push(res); h.estado = 'checkout'; h.reservaId = res.id;
    } else if (caso === 3) { // llega hoy
      reservas.push(nuevaReserva(h, HOY, sumarDias(HOY, 2 + Math.floor(r() * 3)), 'Confirmada'));
      h.estado = 'checkin';
    } else if (caso === 4) { // rooming list
      for (let k = 0; k < 2; k++) reservas.push(nuevaReserva(h, HOY, sumarDias(HOY, 3), 'Confirmada', { rooming: true }));
      h.estado = 'checkinRL';
    } else if (caso === 5) { h.estado = 'bloqueada'; h.motivoBloqueo = i < 15 ? 'Mantenimiento preventivo' : 'Reparación de aire acondicionado'; }
    else if (caso === 6) { h.sucia = true; }
    else if (caso === 7) { // ya hizo check-in hoy (llegada lista)
      const res = nuevaReserva(h, HOY, sumarDias(HOY, 2), 'In-House');
      reservas.push(res); h.estado = 'ocupada'; h.reservaId = res.id;
    }
    if (h.estado === 'libre' && caso === 0) h.sucia = r() > 0.55;
  });
  // Salidas ya realizadas hoy (Salidas listas)
  for (const n of ['107', '303']) {
    const h = habitaciones.find(x => x.numero === n)!;
    const res = nuevaReserva(h, sumarDias(HOY, -2), HOY, 'Completada');
    res.checkoutEn = HOY; reservas.push(res); h.sucia = true;
  }
  // Historial: 60 días de estancias completadas por habitación (KPIs, gráficos e historial de perfiles)
  habitaciones.forEach(hab => {
    const actuales = reservas.filter(x => x.habitacion === hab.numero && x.estado !== 'Confirmada').map(x => x.entrada).sort();
    let cursor = actuales[0] ?? sumarDias(HOY, -1 - Math.floor(r() * 2));
    while (cursor > sumarDias(HOY, -65)) {
      const largo = 1 + Math.floor(r() * 4);
      const entrada = sumarDias(cursor, -largo);
      reservas.push(nuevaReserva(hab, entrada, cursor, 'Completada'));
      cursor = sumarDias(entrada, -Math.floor(r() * 3));
    }
  });
  // Reservas futuras (disponibilidad y forecast)
  for (let i = 0; i < 60; i++) {
    const h = habitaciones[Math.floor(r() * habitaciones.length)];
    const ini = sumarDias(HOY, 1 + Math.floor(r() * 20));
    reservas.push(nuevaReserva(h, ini, sumarDias(ini, 1 + Math.floor(r() * 4)), 'Confirmada'));
  }
  reservas.push({ ...nuevaReserva(habitaciones[5], sumarDias(HOY, 4), sumarDias(HOY, 6), 'Anulada'), anulacion: { fecha: `${sumarDias(HOY, -2)}T10:15`, usuario: USUARIO_ACTUAL, motivo: 'El cliente canceló por cambio de planes.' } });

  // Empresas
  [['3-101-123456', 'SHL Soluciones Hoteleras de Latinoamérica Limitada S.A.', 'Seven Suite'], ['3-101-654321', 'La Caracola Sonora Limitada', ''],
    ['3-102-765432', 'Ncaawahc S.R.L.', ''], ['3-101-889900', 'Horus Technology S.R.L.', 'Horus'], ['3-101-445566', 'Transportes Eben Ezer Heredianos', ''],
    ['3-101-778899', 'Dynatek Industries', ''], ['3-101-112233', 'Nexus Logistics Inc.', 'Nexus']].forEach(([id, razon, com], i) => {
    perfiles.push({
      ...perfilVacio('empresa'), id: `e${i}`, numeroId: id, nombre: razon, nombreComercial: com, nacionalidad: 'Costa Rica',
      email: i === 0 ? 'informacion@sevensuite.com' : `info@empresa${i}.cr`, telefono: `4000 01${String(i).padStart(2, '0')}`,
      dir: { ...dirVacia(), pais: 'Costa Rica', provincia: 'Alajuela', canton: 'San Ramón', distrito: 'San Juan' },
      fiscal: { ...perfilVacio().fiscal, emitir: i < 3, misma: true, tipoId: 'Cédula Jurídica', numeroId: id, razon, email: `fe@empresa${i}.cr`, telefono: `4000 01${String(i).padStart(2, '0')}`, actividad: ACTIVIDADES[1] },
      extra: { ...perfilVacio().extra, credito: i < 2, dias: i < 2 ? '30' : '' },
    });
  });
  // Las reservas corporativas apuntan a la primera empresa
  reservas.filter(x => x.tarifa === 'CORP').forEach(x => { x.empresa = 'SHL Soluciones Hoteleras de Latinoamérica Limitada S.A.'; });

  const tareas: Tarea[] = [
    { id: 't1', tipo: 'Transporte', tarea: 'Llevar al cliente al aeropuerto', inicio: sumarDias(HOY, -2), vencimiento: sumarDias(HOY, -1), estado: 'Pendiente', responsable: 'Carlos Rayo', creador: 'Juan Pérez', bloqueo: null, recordatorio: null },
    { id: 't2', tipo: 'Mantenimiento', tarea: 'Reparación de techo Hab 112', inicio: sumarDias(HOY, -3), vencimiento: HOY, estado: 'Pendiente', responsable: 'Ernesto Ríos', creador: 'Juan Pérez', bloqueo: null, recordatorio: null },
    { id: 't3', tipo: 'Mantenimiento', tarea: 'Reparación de aire acondicionado Hab 202', inicio: sumarDias(HOY, -1), vencimiento: sumarDias(HOY, 2), estado: 'En proceso', responsable: 'Daniel Viera', creador: 'Juan Pérez', bloqueo: { habitaciones: ['202'], inicio: sumarDias(HOY, -1), fin: sumarDias(HOY, 2), motivo: 'Mantenimiento preventivo' }, recordatorio: null },
    { id: 't4', tipo: 'Mantenimiento', tarea: 'Revisión de calentador Hab 123', inicio: sumarDias(HOY, -6), vencimiento: sumarDias(HOY, -4), estado: 'Completado', responsable: 'Daniel Viera', creador: 'Juan Pérez', bloqueo: null, recordatorio: null },
    { id: 't5', tipo: 'Ama de llaves', tarea: 'Preparar cuna en Hab 204', inicio: HOY, vencimiento: HOY, estado: 'Pendiente', responsable: 'María Laura Céspedes Morales', creador: 'Carlos Morales', bloqueo: null, recordatorio: null },
    { id: 't6', tipo: 'Servicio al cliente', tarea: 'Amenidad de aniversario Hab 402', inicio: HOY, vencimiento: sumarDias(HOY, 1), estado: 'Pendiente', responsable: 'Luis Duarte', creador: 'Juan Pérez', bloqueo: null, recordatorio: null },
    { id: 't7', tipo: 'Spa', tarea: 'Confirmar masaje en pareja 4:00 p.m.', inicio: HOY, vencimiento: sumarDias(HOY, 1), estado: 'En proceso', responsable: 'Fabián Araya', creador: 'Carlos Morales', bloqueo: null, recordatorio: null },
  ];

  // Las cajas del dashboard se derivan de los turnos de Caja (finanzas.ts + store.tsx).

  const alertas: Alerta[] = [
    { id: 'a1', modulo: 'MAN', texto: `Hay problemas con Seven Digital Invoices CR (Digital Invoice), por favor reiniciar el sincronizador. | Última ejecución: ${fmtF(sumarDias(HOY, -1))} 4:53 p. m.`, fecha: sumarDias(HOY, -1) },
    { id: 'a2', modulo: 'MAN', texto: `Hay problemas con Seven Integrations - Orbe (ORBE), por favor reiniciar el sincronizador. | Última ejecución: ${fmtF(sumarDias(HOY, -1))} 4:53 p. m.`, fecha: sumarDias(HOY, -1) },
    { id: 'a3', modulo: 'SYNC', texto: 'Seven SIO: Hay problemas con los servicios de sincronización.', fecha: HOY, accion: { label: 'Revisar', href: '/auditoria/problemas-de-sincronizacion' } },
    { id: 'a4', modulo: 'FDK', texto: 'Hay reservas con habitaciones sin asignar.', fecha: HOY, accion: { label: 'Revisar', href: '/reservaciones/asignacion-de-habitaciones' } },
    { id: 'a5', modulo: 'FDK', texto: 'Existen folios externos vencidos.', fecha: HOY, accion: { label: 'Revisar', href: '/facturacion/folios-externos' } },
  ];

  // Ama de llaves: camarera por piso, último cambio de sábanas, libres sin uso y discrepancias de ejemplo
  const camareraPiso = ['Ana Luisa Ramírez', 'Ana Luisa Ramírez', 'Graciela Pérez', 'Rosa Elena Mora'];
  habitaciones.forEach((h, i) => {
    h.camarera = camareraPiso[h.piso - 1];
    if (h.reservaId) h.sabanas = sumarDias(HOY, -(i % 4));
    if (h.estado === 'libre' && !h.sucia && i % 3 === 0) h.noRequiere = true;
  });
  // Limpiezas ya terminadas hoy (cronómetro de la camarera)
  habitaciones.filter(h => !h.sucia && h.estado === 'ocupada').slice(0, 4).forEach((h, i) => {
    h.limpieza = { estado: 'finalizada', camarera: camareraPiso[h.piso - 1], inicio: `${HOY}T0${8 + i}:10:00`, fin: `${HOY}T0${8 + i}:${32 + i * 3}:00`, segundos: (22 + i * 3) * 60, desde: null, pausas: i % 2 };
  });
  const disc = habitaciones.find(h => h.estado === 'ocupada' && h.piso === 3);
  if (disc) disc.discrepancia = 'Pax real: 3 (sistema 2)';
  // Bloqueos manuales (los de tareas viven en la tarea): uno activo, uno futuro y uno ya terminado (historial)
  const bloqueos: BloqueoHab[] = habitaciones.filter(h => h.estado === 'bloqueada' && h.numero !== '202').map((h, i) => ({
    id: `bq${i + 1}`, habitacion: h.numero, desde: sumarDias(HOY, -2), hasta: i % 2 ? '' : sumarDias(HOY, 3), motivo: h.motivoBloqueo, usuario: 'Carlos Morales', creado: `${sumarDias(HOY, -2)}T09:10`,
  }));
  bloqueos.push(
    { id: 'bq8', habitacion: '305', desde: sumarDias(HOY, 5), hasta: sumarDias(HOY, 8), motivo: 'Pintura de paredes', usuario: USUARIO_ACTUAL, creado: `${sumarDias(HOY, -1)}T15:40` },
    { id: 'bq9', habitacion: '108', desde: sumarDias(HOY, -20), hasta: sumarDias(HOY, -15), motivo: 'Cambio de alfombra', usuario: 'Carlos Morales', creado: `${sumarDias(HOY, -25)}T11:05` },
  );

  return { habitaciones, reservas, perfiles, tareas, alertas, bloqueos };
}
