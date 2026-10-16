'use client';
// Nueva reserva (pantalla completa, guiada): 1 Cliente y tarifa · 2 Estancia y
// habitaciones (disponibilidad y precio en línea) · 3 Modalidad (individual o
// grupal, obligatoria si hay más de una habitación) · 4 Huésped (por defecto el
// mismo para todas) · 5 Más información. A la derecha, el resumen fijo con los
// importes y las acciones de guardado.
import { useState, type CSSProperties, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Page, PageHeader, Select, StatusBadge } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { Campo, IcTrash, TextArea } from '@/components/configuracion/kit';
import { Alerta, BotonExportar, MenuBoton, usePrint } from '@/components/hotel/ui';
import { useHotel, nuevoId } from '@/components/hotel/store';
import { CONDICIONES, HOY, NACIONALIDADES, REGIMENES, TARIFAS_NOMBRES, TIPOS, USUARIOS, USUARIO_ACTUAL, contratoDeTarifa, sumarDias, type Reserva } from '@/components/hotel/datos';
import { AGENTES, ORIGENES, detallesVacios, habitacionLibre } from '@/components/hotel/reservas';
import { TC, fmtMon, r2 } from '@/components/hotel/finanzas';
import { ConfirmacionReserva, DisponibilidadCupos, PronosticoTipoModal, RevisionPrecios, SeleccionHabitacion, SeleccionarPerfil } from './comun';
import { libresEnRango } from './inventario';
import { conSaldo } from './reserva/Acciones';
import { CargosLinea, DepRequerido, LinkMini, MenuLinea, ModalHuesped, ModalTexto, OpcionRadio, Radio, ReservaGuardada, ResumenReserva, huespedVacio, nochesL, precioEn, totalCargos, type Form, type Huesped, type Linea } from './FormReservaPartes';

export interface Prefill { hab?: string; entrada?: string; salida?: string; tipo?: string; perfilId?: string }
export function FormReserva({ prefill, onCancelar, onGuardado }: { prefill: Prefill; onCancelar: () => void; onGuardado: (clave: string, t: string) => void }) {
  const h = useHotel();
  const pf0 = h.perfiles.find(p => p.id === prefill.perfilId) ?? null;
  const tipo0 = prefill.tipo || h.habitaciones.find(x => x.numero === prefill.hab)?.tipo || '';
  const ent0 = prefill.entrada || HOY;
  const linea0 = (): Linea => ({ key: nuevoId('l'), entrada: ent0, salida: prefill.salida && prefill.salida > ent0 ? prefill.salida : sumarDias(ent0, 1), tipo: tipo0, hab: prefill.hab ?? '', adultos: 2, ninos: 0, regimen: '1.BB', precio: tipo0 ? precioEn(tipo0, pf0?.tipo === 'empresa' ? 'CORP' : 'DIR', 'USD') : 0, manual: false, cargos: [], huesped: huespedVacio(), obs: '' });
  const [f, setF] = useState<Form>(() => ({
    perfil: pf0, nombreLibre: '', tarifa: pf0?.tipo === 'empresa' ? 'CORP' : '', moneda: 'USD', idExterno: '', modoHuespedes: 'mismo', modalidad: '', lineas: [linea0()], descuento: 0,
    principal: pf0?.tipo === 'cliente' ? { ...huespedVacio(), nombre: pf0.nombre, identificacion: pf0.numeroId, email: pf0.email, telefono: pf0.telefono, nacionalidad: Object.entries(NACIONALIDADES).find(([, v]) => v === pf0.nacionalidad)?.[0] ?? '' } : huespedVacio(),
    otras: { ...detallesVacios(), usuario: USUARIO_ACTUAL, vip: pf0?.extra.vip ?? false, tNombre: '', tNumero: '', tMes: '12', tAnio: String(Number(HOY.slice(0, 4)) + 1), cheque: '', envio: '' },
    obs: '', internas: '', condiciones: [], depRequerido: 0,
  }));
  const [hist, setHist] = useState<Form[]>([]);
  const [abiertas, setAbiertas] = useState({ otras: false, obs: false });
  const [dlg, setDlg] = useState<null | 'perfil' | 'cupos' | 'pronostico' | 'precios' | 'deposito' | 'anular' | { hab: string } | { cargos: string } | { huesped: string } | { obsL: string } | { espera: boolean } | { listo: { clave: string; numero: number; estado: string } }>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const { imprimir, portal } = usePrint();
  const numero = h.seqReserva;

  // Cambios con historial («Deshacer último cambio»)
  const cambiar = (g: (x: Form) => Form) => { setHist(v => [...v.slice(-30), f]); setF(g); };
  const setL = (key: string, p: Partial<Linea>) => cambiar(x => ({ ...x, lineas: x.lineas.map(l => (l.key === key ? { ...l, ...p } : l)) }));
  const setNHab = (n: number) => cambiar(x => {
    const ls = [...x.lineas];
    while (ls.length < n) { const u = ls[ls.length - 1]; ls.push({ ...u, key: nuevoId('l'), hab: '', cargos: [], huesped: huespedVacio(), obs: '' }); }
    return { ...x, lineas: ls.slice(0, Math.max(1, n)) };
  });
  const setTarifa = (t: string) => cambiar(x => ({ ...x, tarifa: t, lineas: x.lineas.map(l => (l.manual || !l.tipo ? l : { ...l, precio: precioEn(l.tipo, t, x.moneda) })) }));
  const setMoneda = (m: 'USD' | 'CRC') => cambiar(x => ({ ...x, moneda: m, lineas: x.lineas.map(l => ({ ...l, precio: l.manual ? (m === 'CRC' ? Math.round(l.precio * TC) : r2(l.precio / TC)) : l.tipo ? precioEn(l.tipo, x.tarifa, m) : 0 })) }));

  const impHab = r2(f.lineas.reduce((s, l) => s + l.precio * nochesL(l), 0));
  const servicios = r2(f.lineas.reduce((s, l) => s + totalCargos(l), 0));
  const aCobrar = r2(Math.max(0, impHab + servicios - f.descuento));
  const esEmpresa = f.perfil?.tipo === 'empresa';
  // Libres del tipo en esas fechas, descontando las otras líneas de esta misma reserva
  const libres = (l: Linea) => (l.tipo ? libresEnRango(h, l.entrada, l.salida)[l.tipo] - f.lineas.filter(x => x.key !== l.key && x.tipo === l.tipo && x.entrada < l.salida && x.salida > l.entrada).length : 0);

  // ── Construcción de las líneas de la reserva ──
  const construir = (estado: Reserva['estado']): Reserva[] => {
    const varias = f.lineas.length > 1;
    const ota = ['BOOKING', 'EXPEDIA', 'DESPEGAR', 'HOTELBEDS'].includes(f.tarifa);
    const cliente: Reserva['cliente'] = ota ? 'Agencia de Viajes' : esEmpresa || f.tarifa === 'CORP' ? 'Tarifa Corporativa' : 'Huésped Individual';
    const empresa = esEmpresa ? f.perfil!.nombre : contratoDeTarifa(f.tarifa) === 'Directo' ? '' : contratoDeTarifa(f.tarifa);
    const ahora = (() => { const d = new Date(); return `${HOY}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; })();
    return f.lineas.map((l, i) => {
      const hu = f.modoHuespedes === 'diferentes' && l.huesped.nombre.trim() ? l.huesped : f.principal;
      const nombre = (hu.nombre.trim() || (f.perfil?.tipo === 'cliente' ? f.perfil.nombre : '') || f.nombreLibre.trim() || f.perfil?.nombre || '').toUpperCase();
      const id = nuevoId('r');
      const { vip, tNombre, tNumero, tMes, tAnio, cheque, envio, ...detalles } = f.otras;
      void tMes; void tAnio; void cheque; void envio; void tNombre;
      return conSaldo({
        id, numero: varias ? `RD-${numero}_${i + 1}` : `RD-${numero}`, rooming: false, perfilId: f.perfil?.tipo === 'cliente' ? f.perfil.id : null, nombre, empresa, cliente,
        habitacion: l.hab, tipo: l.tipo, entrada: l.entrada, salida: l.salida, adultos: l.adultos, ninos: l.ninos, tarifa: f.tarifa, precio: l.precio, regimen: l.regimen, moneda: f.moneda, estado,
        pagado: 0, depGarantia: 0, credito: esEmpresa && !!f.perfil?.extra.credito && (!varias || f.modalidad === 'grupo'), condiciones: f.condiciones, observaciones: [f.obs, l.obs].filter(Boolean).join('\n'), observacionesInternas: f.internas,
        nacionalidad: hu.nacionalidad || 'CRI', identificacion: hu.identificacion, email: hu.email, telefono: hu.telefono, vip: i === 0 ? vip : false, tarjetaLista: !!tNumero.replace(/\D/g, ''), checkinEn: null, checkoutEn: null,
        cuentas: [{ id: id + 'c1', nombre: f.modalidad === 'grupo' && varias ? `Consumos ${l.hab ? `hab ${l.hab}` : i + 1}` : 'Cuenta 1', saldo: 0, consumos: 0 }], cargos: l.cargos, adicionales: hu.adicionales.filter(a => a.nombre.trim()),
        descuento: i === 0 ? f.descuento : 0, grupo: varias ? `g${numero}` : undefined, modalidad: varias ? f.modalidad || 'individual' : undefined, creada: ahora, idExterno: f.idExterno.trim(), depRequerido: f.depRequerido || undefined, detalles,
      });
    });
  };
  const validar = () => {
    const e: string[] = [];
    if (!f.perfil && !f.nombreLibre.trim()) e.push('Perfil o nombre completo');
    if (!f.tarifa) e.push('Tarifa de reserva');
    if (f.lineas.length > 1 && !f.modalidad) e.push('Modalidad: individual o grupal');
    f.lineas.forEach((l, i) => {
      if (!l.tipo) e.push(`Tipo de habitación (línea ${i + 1})`);
      if (l.salida <= l.entrada) e.push(`Salida posterior a la entrada (línea ${i + 1})`);
      if (l.hab && !habitacionLibre(h.reservas, l.hab, l.entrada, l.salida)) e.push(`Habitación ${l.hab} no disponible (línea ${i + 1})`);
      if (l.hab && f.lineas.some(x => x.key !== l.key && x.hab === l.hab && x.entrada < l.salida && x.salida > l.entrada)) e.push(`Habitación ${l.hab} repetida (línea ${i + 1})`);
    });
    if (f.modoHuespedes === 'mismo' && f.principal.email && !/^\S+@\S+\.\S+$/.test(f.principal.email)) e.push('E-mail válido del huésped');
    setErrores(e);
    return !e.length;
  };
  const guardar = (estado: 'Solicitada' | 'Confirmada', forzar = false) => {
    if (!validar()) return;
    if (!forzar && f.lineas.some(l => !l.hab && libres(l) <= 0)) return setDlg({ espera: estado === 'Confirmada' });
    const ls = construir(estado);
    h.crearReservaGrupo(ls);
    setDlg({ listo: { clave: ls[0].grupo ?? ls[0].id, numero, estado } });
  };
  const enEspera = () => { if (!validar()) return; const ls = construir('Lista de espera'); h.crearReservaGrupo(ls); setDlg({ listo: { clave: ls[0].grupo ?? ls[0].id, numero, estado: 'Lista de espera' } }); };

  const linea = typeof dlg === 'object' && dlg && ('hab' in dlg || 'cargos' in dlg || 'huesped' in dlg || 'obsL' in dlg) ? f.lineas.find(l => l.key === ('hab' in dlg ? dlg.hab : 'cargos' in dlg ? dlg.cargos : 'huesped' in dlg ? dlg.huesped : dlg.obsL)) : undefined;
  const th: CSSProperties = { textAlign: 'left', fontWeight: 400, color: C.n700, fontSize: 11.5, padding: '4px 4px', whiteSpace: 'nowrap' };
  const ctl: CSSProperties = { height: 30, border: `1px solid ${C.n500}`, borderRadius: radius.control, fontSize: 12, fontFamily: FONT, padding: '0 6px', background: C.n000, width: '100%', boxSizing: 'border-box' };
  const seccion = (n: number, t: string, sub: ReactNode, children: ReactNode, extra?: ReactNode) => (
    <section aria-label={t} style={{ background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.card, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span aria-hidden style={{ width: 24, height: 24, borderRadius: '50%', background: C.brandBg, color: C.brand, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.n900 }}>{t}</h2>
          {sub && <span style={{ fontSize: 12, color: C.n700 }}>{sub}</span>}
        </span>
        {extra && <span style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>{extra}</span>}
      </div>
      {children}
    </section>
  );
  const plegable = (k: keyof typeof abiertas, t: ReactNode, d: string, children: ReactNode) => (
    <div style={{ borderTop: `1px solid ${C.n500}` }}>
      <button type="button" onClick={() => setAbiertas(a => ({ ...a, [k]: !a[k] }))} aria-expanded={abiertas[k]} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none', padding: '14px 0', cursor: 'pointer', fontFamily: FONT, textAlign: 'left' }}>
        <span style={{ flex: 1 }}><span style={{ display: 'block', fontSize: 13, color: C.n900, fontWeight: 500 }}>{t}</span><span style={{ display: 'block', fontSize: 11.5, color: C.n700, marginTop: 2 }}>{d}</span></span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden style={{ color: C.n700, transform: abiertas[k] ? 'rotate(180deg)' : undefined }}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {abiertas[k] && <div style={{ paddingBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>}
    </div>
  );
  const nac = [{ value: '', label: 'Selecciona' }, ...Object.entries(NACIONALIDADES).map(([k, v]) => ({ value: k, label: v }))];
  const camposHuesped = (hu: Huesped, set: (h: Huesped) => void) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600 }}>Huésped 1</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
        <Campo label="Nombre" required><Input value={hu.nombre} onChange={v => set({ ...hu, nombre: v })} placeholder="Ingresa el nombre del huésped" /></Campo>
        <Campo label="Identificación"><Input value={hu.identificacion} onChange={v => set({ ...hu, identificacion: v })} placeholder="Ingresa la identificación" /></Campo>
        <Campo label="Nacionalidad"><Select value={hu.nacionalidad} onChange={v => set({ ...hu, nacionalidad: v })} options={nac} /></Campo>
        <Campo label="E-mail"><Input value={hu.email} onChange={v => set({ ...hu, email: v })} placeholder="Ingresa el correo electrónico" /></Campo>
        <Campo label="Teléfono"><Input value={hu.telefono} onChange={v => set({ ...hu, telefono: v })} placeholder="Ingresa el teléfono" /></Campo>
      </div>
      {hu.adicionales.map((a, j) => (
        <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1.2fr 30px', gap: 12, alignItems: 'end' }}>
          <Campo label={`Huésped ${j + 2}`}><Input value={a.nombre} onChange={v => set({ ...hu, adicionales: hu.adicionales.map(x => (x.id === a.id ? { ...x, nombre: v } : x)) })} placeholder="Nombre" /></Campo>
          <Campo label="Identificación"><Input value={a.identificacion} onChange={v => set({ ...hu, adicionales: hu.adicionales.map(x => (x.id === a.id ? { ...x, identificacion: v } : x)) })} /></Campo>
          <Campo label="Nacionalidad"><Select value={a.nacionalidad} onChange={v => set({ ...hu, adicionales: hu.adicionales.map(x => (x.id === a.id ? { ...x, nacionalidad: v } : x)) })} options={nac} /></Campo>
          <Campo label="E-mail"><Input value={a.email} onChange={v => set({ ...hu, adicionales: hu.adicionales.map(x => (x.id === a.id ? { ...x, email: v } : x)) })} /></Campo>
          <button type="button" aria-label={`Quitar huésped ${j + 2}`} onClick={() => set({ ...hu, adicionales: hu.adicionales.filter(x => x.id !== a.id) })} style={{ height: 32, border: 'none', background: 'none', color: C.error, cursor: 'pointer' }}><IcTrash /></button>
        </div>
      ))}
      <button type="button" onClick={() => set({ ...hu, adicionales: [...hu.adicionales, { id: nuevoId('ad'), nombre: '', identificacion: '', nacionalidad: '', email: '' }] })} style={{ alignSelf: 'flex-start', border: 'none', background: 'none', color: C.brand, textDecoration: 'underline', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: FONT }}>+ Agregar nuevo huésped</button>
    </div>
  );
  const vista = () => construir('Solicitada');

  const varias = f.lineas.length > 1;
  const entMin = f.lineas.reduce((m, l) => (l.entrada < m ? l.entrada : m), f.lineas[0].entrada);
  const salMax = f.lineas.reduce((m, l) => (l.salida > m ? l.salida : m), f.lineas[0].salida);
  const pax = f.lineas.reduce((s, l) => s + l.adultos, 0);
  const ninos = f.lineas.reduce((s, l) => s + l.ninos, 0);
  const cliente = f.perfil?.nombre || f.nombreLibre.trim();
  const linkBtn: CSSProperties = { border: 'none', background: 'none', padding: 0, color: C.brand, fontSize: 12, cursor: 'pointer', fontFamily: FONT };

  return (
    <Page>
      <PageHeader title="Nueva reserva" left={<button type="button" aria-label="Volver" onClick={() => setDlg('anular')} style={{ order: -1, border: `1px solid ${C.n500}`, background: C.n000, borderRadius: radius.control, width: 30, height: 30, cursor: 'pointer', fontSize: 16 }}>‹</button>}>
        <MenuBoton label="Opciones de reserva" opciones={[{ label: 'Revisión de precios y restricciones', onClick: () => setDlg('precios') }, { label: 'Disponibilidad de cupos', onClick: () => setDlg('cupos') }, { label: 'Pronóstico por tipo de habitación', onClick: () => setDlg('pronostico') }]} />
        <BotonExportar label="Exportar" onPDF={() => imprimir(<ConfirmacionReserva ls={vista()} perfil={f.perfil ?? undefined} />)} />
      </PageHeader>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', background: C.n200, fontFamily: FONT }}>
        {/* Columna principal */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {seccion(1, 'Cliente y tarifa', 'Busca un perfil existente o escribe el nombre de quien reserva.', (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.2fr) 140px', gap: 14, alignItems: 'end' }}>
              <Campo label="Perfil" required>
                <div style={{ display: 'flex', gap: 8 }}>
                  {f.perfil ? <span style={{ ...ctl, height: 32, display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>{f.perfil.nombre}<span style={{ marginLeft: 'auto' }}><StatusBadge label={f.perfil.tipo === 'empresa' ? 'Empresa' : 'Cliente'} color="brand" /></span>
                    <button type="button" aria-label="Quitar perfil" onClick={() => cambiar(x => ({ ...x, perfil: null }))} style={{ border: 'none', background: 'none', color: C.n700, cursor: 'pointer' }}>⊗</button></span>
                    : <Input value={f.nombreLibre} onChange={v => setF({ ...f, nombreLibre: v })} placeholder="Nombre completo" />}
                  <Button variant="secondary" style={{ color: C.brand, borderColor: C.brandBd }} onClick={() => setDlg('perfil')}>Buscar perfil</Button>
                </div>
              </Campo>
              <Campo label="Tarifa" required><Select value={f.tarifa} onChange={setTarifa} options={[{ value: '', label: 'Seleccionar tarifa' }, ...TARIFAS_NOMBRES.map(t => ({ value: t, label: contratoDeTarifa(t) === 'Directo' ? 'Directo (DIR)' : `${contratoDeTarifa(t)} (${t})` }))]} /></Campo>
              <Campo label="Moneda" required><Select value={f.moneda} onChange={v => setMoneda(v as 'USD' | 'CRC')} options={[{ value: 'USD', label: 'USD - $' }, { value: 'CRC', label: 'CRC - ₡' }]} /></Campo>
            </div>
          ))}

          {seccion(2, 'Estancia y habitaciones', 'La disponibilidad y el precio se calculan al elegir fechas y tipo.', <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                <thead><tr>{['#', 'Entrada', 'Salida', 'Tipo de habitación', 'Hab.', 'Adult.', 'Niños', 'Régimen', 'Precio / noche', ''].map((x, i) => <th key={i} style={th}>{x}</th>)}</tr></thead>
                <tbody>{f.lineas.map((l, i) => {
                  const disp = l.tipo ? libres(l) : null;
                  return (
                    <tr key={l.key} style={{ verticalAlign: 'top', borderTop: i ? `1px solid ${"#EDEDF0"}` : undefined }}>
                      <td style={{ padding: '10px 4px', fontSize: 12, color: C.n700 }}>{i + 1}</td>
                      <td style={{ padding: 4, width: 114 }}><input type="date" value={l.entrada} min={HOY} aria-label={`Entrada línea ${i + 1}`} onChange={e => e.target.value && setL(l.key, { entrada: e.target.value, salida: e.target.value >= l.salida ? sumarDias(e.target.value, 1) : l.salida, hab: '' })} className="suite-campo" style={ctl} /></td>
                      <td style={{ padding: 4, width: 114 }}><input type="date" value={l.salida} min={sumarDias(l.entrada, 1)} aria-label={`Salida línea ${i + 1}`} onChange={e => e.target.value && setL(l.key, { salida: e.target.value, hab: '' })} className="suite-campo" style={ctl} /></td>
                      <td style={{ padding: 4, minWidth: 150 }}>
                        <select value={l.tipo} aria-label={`Tipo de habitación línea ${i + 1}`} onChange={e => setL(l.key, { tipo: e.target.value, hab: '', ...(l.manual ? {} : { precio: precioEn(e.target.value, f.tarifa, f.moneda) }) })} className="suite-campo" style={ctl}>
                          <option value="">Seleccionar tipo</option>{TIPOS.map(t => <option key={t.id} value={t.id}>{t.nombre} ({t.codigo})</option>)}</select>
                        {disp !== null && <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginTop: 4, color: disp > 0 ? C.n700 : C.error }}>
                          <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: disp > 0 ? (disp <= 2 ? '#F59E0B' : '#12A877') : C.error }} />
                          {disp > 0 ? `${disp} libre${disp === 1 ? '' : 's'} · ${nochesL(l)} noche${nochesL(l) === 1 ? '' : 's'}` : 'Sin disponibilidad en esas fechas'}</span>}
                        {l.cargos.length > 0 && <span style={{ display: 'block', marginTop: 3 }}><LinkMini onClick={() => setDlg({ cargos: l.key })}>{`Cargos (${l.cargos.length}) · ${fmtMon(totalCargos(l), f.moneda)}`}</LinkMini></span>}
                        {f.modoHuespedes === 'diferentes' && varias && <span style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                          <LinkMini onClick={() => setDlg({ huesped: l.key })}>{l.huesped.nombre ? `Huésped: ${l.huesped.nombre}` : 'Agregar huéspedes'}</LinkMini><LinkMini onClick={() => setDlg({ obsL: l.key })}>{l.obs ? 'Observaciones ✓' : 'Observaciones'}</LinkMini></span>}
                      </td>
                      <td style={{ padding: 4, width: 56 }}><button type="button" aria-label={`Habitación línea ${i + 1}`} title={l.tipo ? 'Elegir habitación (opcional)' : 'Primero elige el tipo'} disabled={!l.tipo} onClick={() => setDlg({ hab: l.key })} style={{ ...ctl, background: C.n200, cursor: l.tipo ? 'pointer' : 'not-allowed', color: l.hab ? C.n900 : C.n700 }}>{l.hab || '—'}</button></td>
                      <td style={{ padding: 4, width: 44 }}><input value={l.adultos} aria-label={`Adultos línea ${i + 1}`} onChange={e => setL(l.key, { adultos: Math.max(1, Number(e.target.value) || 1) })} className="suite-campo" style={{ ...ctl, textAlign: 'center' }} /></td>
                      <td style={{ padding: 4, width: 44 }}><input value={l.ninos} aria-label={`Niños línea ${i + 1}`} onChange={e => setL(l.key, { ninos: Math.max(0, Number(e.target.value) || 0) })} className="suite-campo" style={{ ...ctl, textAlign: 'center' }} /></td>
                      <td style={{ padding: 4, width: 108 }}><select value={l.regimen} aria-label={`Régimen línea ${i + 1}`} onChange={e => setL(l.key, { regimen: e.target.value })} className="suite-campo" style={ctl}>{Object.entries(REGIMENES).map(([k, v]) => <option key={k} value={k}>{k} · {v}</option>)}</select></td>
                      <td style={{ padding: 4, width: 84 }}><input value={l.precio} aria-label={`Precio línea ${i + 1}`} onChange={e => setL(l.key, { precio: Math.max(0, Number(e.target.value.replace(/[^\d.]/g, '')) || 0), manual: true })} className="suite-campo" style={{ ...ctl, textAlign: 'right' }} />
                        {l.manual && <span style={{ display: 'block', fontSize: 10.5, color: C.n700, marginTop: 3, textAlign: 'right' }}>Precio manual</span>}</td>
                      <td style={{ padding: 4, width: 30 }}>
                        <MenuLinea n={i + 1} opciones={[
                          { l: l.cargos.length ? `Cargos a la habitación (${l.cargos.length})` : 'Cargos a la habitación', on: () => setDlg({ cargos: l.key }) },
                          { l: 'Duplicar línea', on: () => cambiar(x => ({ ...x, lineas: [...x.lineas.slice(0, i + 1), { ...l, key: nuevoId('l'), hab: '' }, ...x.lineas.slice(i + 1)] })) },
                          ...(varias ? [{ l: 'Eliminar línea', on: () => cambiar(x => ({ ...x, lineas: x.lineas.filter(y => y.key !== l.key) })), peligro: true }] : []),
                        ]} />
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <Button variant="secondary" icon={<IcPlus size={12} />} style={{ color: C.brand, borderColor: C.brandBd }} onClick={() => setNHab(f.lineas.length + 1)}>Agregar habitación</Button>
              <button type="button" onClick={() => setDlg('cupos')} style={linkBtn}>Ver disponibilidad de cupos</button>
              <button type="button" onClick={() => setDlg('pronostico')} style={linkBtn}>Pronóstico por tipo</button>
              <button type="button" disabled={!hist.length} onClick={() => { setF(hist[hist.length - 1]); setHist(hist.slice(0, -1)); }} style={{ ...linkBtn, marginLeft: 'auto', color: hist.length ? C.brand : C.n500, cursor: hist.length ? 'pointer' : 'default' }}>↶ Deshacer último cambio</button>
            </div>
          </>, (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.n700 }}>Habitaciones
              <span style={{ display: 'flex', border: `1px solid ${C.n500}`, borderRadius: radius.control, height: 30, background: C.n000 }}>
                <button type="button" aria-label="Quitar habitación" onClick={() => setNHab(f.lineas.length - 1)} disabled={!varias} style={{ width: 28, border: 'none', background: 'none', cursor: varias ? 'pointer' : 'default', color: varias ? C.n900 : C.n500 }}>−</button>
                <input value={f.lineas.length} onChange={e => setNHab(Math.min(20, Math.max(1, Number(e.target.value) || 1)))} aria-label="N° Habitaciones" style={{ width: 36, border: 'none', borderLeft: `1px solid ${C.n500}`, borderRight: `1px solid ${C.n500}`, textAlign: 'center', fontSize: 12, fontFamily: FONT }} />
                <button type="button" aria-label="Sumar habitación" onClick={() => setNHab(f.lineas.length + 1)} style={{ width: 28, border: 'none', background: 'none', cursor: 'pointer' }}>+</button>
              </span>
            </span>
          ))}

          {varias && seccion(3, '¿Cómo se maneja esta reserva?', 'Obligatorio cuando hay más de una habitación.', (
            <div role="radiogroup" aria-label="Modalidad de la reserva" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <OpcionRadio on={f.modalidad === 'individual'} onClick={() => cambiar(x => ({ ...x, modalidad: 'individual' }))} titulo="Individual (múltiple)"
                detalle={<>Cada habitación es una reserva con su propia cuenta. <b style={{ fontWeight: 500, color: C.n900 }}>En el check-in</b> se decide si se factura por separado o en una sola factura.</>} />
              <OpcionRadio on={f.modalidad === 'grupo'} onClick={() => cambiar(x => ({ ...x, modalidad: 'grupo' }))} titulo="Grupal"
                detalle={<>Todo va a <b style={{ fontWeight: 500, color: C.n900 }}>una sola factura</b>: primero un folio de agencia con el hospedaje y, después, una cuenta de consumo por habitación.</>} />
            </div>
          ))}

          {seccion(varias ? 4 : 3, 'Huésped', <>Solo el nombre es necesario ahora; el resto se completa en el check-in.</>, <>
            {varias && (
              <div role="radiogroup" aria-label="Configuración de huéspedes" style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                {([['mismo', 'Mismo huésped para todas las habitaciones'], ['diferentes', 'Un huésped por habitación']] as const).map(([v, t]) => (
                  <button key={v} type="button" role="radio" aria-checked={f.modoHuespedes === v} onClick={() => cambiar(x => ({ ...x, modoHuespedes: v }))}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT, fontSize: 12.5, color: C.n900 }}>
                    <Radio on={f.modoHuespedes === v} />{t}{v === 'mismo' && <span style={{ fontSize: 11, color: C.n700 }}>(recomendado)</span>}
                  </button>
                ))}
              </div>
            )}
            {f.modoHuespedes === 'mismo' || !varias ? camposHuesped(f.principal, p => setF({ ...f, principal: p }))
              : <span style={{ fontSize: 12, color: C.n700 }}>Agrega el huésped de cada habitación desde la tabla de arriba («Agregar huéspedes»).</span>}
            {varias && <span style={{ fontSize: 11.5, color: C.n700, background: C.n200, borderRadius: radius.md, padding: '8px 12px' }}>La información de cada habitación (huésped, acompañantes, observaciones) se puede completar después en la gestión de la reserva › Huésped.</span>}
          </>)}

          <section style={{ background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.card, padding: '4px 20px' }}>
            {plegable('otras', 'Otras informaciones', 'Agente, origen del negocio, tarjeta de garantía, vuelo…', (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
                <Campo label="Agente de ventas"><Select value={f.otras.agente} onChange={v => setF({ ...f, otras: { ...f.otras, agente: v } })} options={[{ value: '', label: 'Selecciona' }, ...AGENTES.map(a => ({ value: a, label: a }))]} /></Campo>
                <Campo label="Usuario"><Select value={f.otras.usuario} onChange={v => setF({ ...f, otras: { ...f.otras, usuario: v } })} options={USUARIOS.map(a => ({ value: a, label: a }))} /></Campo>
                <Campo label="Referencia"><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Input value={f.otras.referencia} onChange={v => setF({ ...f, otras: { ...f.otras, referencia: v } })} placeholder="Ingresa referencia" /><Checkbox checked={f.otras.vip} onChange={b => setF({ ...f, otras: { ...f.otras, vip: b } })} label="VIP" /></div></Campo>
                <Campo label="Referidor"><Input value={f.otras.referidor} onChange={v => setF({ ...f, otras: { ...f.otras, referidor: v } })} placeholder="Ingresa el referidor" /></Campo>
                <Campo label="Origen del Negocio"><Select value={f.otras.origen} onChange={v => setF({ ...f, otras: { ...f.otras, origen: v } })} options={[{ value: '', label: 'Selecciona' }, ...ORIGENES.map(a => ({ value: a, label: a }))]} /></Campo>
                <Campo label="Placa del vehículo"><Input value={f.otras.placa} onChange={v => setF({ ...f, otras: { ...f.otras, placa: v } })} placeholder="Ingrese placa del vehículo" /></Campo>
                <Campo label="Nombre en la tarjeta"><Input value={f.otras.tNombre} onChange={v => setF({ ...f, otras: { ...f.otras, tNombre: v } })} placeholder="Ingresa el nombre en la tarjeta" /></Campo>
                <Campo label="Número de tarjeta"><Input value={f.otras.tNumero} onChange={v => setF({ ...f, otras: { ...f.otras, tNumero: v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ') } })} placeholder="0000 0000 0000 0000" inputMode="numeric" /></Campo>
                <Campo label="Vencimiento"><div style={{ display: 'flex', gap: 8 }}><Select value={f.otras.tMes} onChange={v => setF({ ...f, otras: { ...f.otras, tMes: v } })} options={Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(x => ({ value: x, label: x }))} /><Select value={f.otras.tAnio} onChange={v => setF({ ...f, otras: { ...f.otras, tAnio: v } })} options={Array.from({ length: 8 }, (_, i) => String(Number(HOY.slice(0, 4)) + i)).map(x => ({ value: x, label: x }))} /></div></Campo>
                <Campo label="Cheque a nombre de"><Input value={f.otras.cheque} onChange={v => setF({ ...f, otras: { ...f.otras, cheque: v } })} placeholder="Ingrese el nombre" /></Campo>
                <Campo label="Dirección de envío"><Input value={f.otras.envio} onChange={v => setF({ ...f, otras: { ...f.otras, envio: v } })} placeholder="Ingrese la dirección" /></Campo>
                <Campo label="Vuelo salida"><Input value={f.otras.vuelo} onChange={v => setF({ ...f, otras: { ...f.otras, vuelo: v } })} placeholder="Ej: AA 1234" /></Campo>
              </div>
            ))}
            {plegable('obs', 'Observaciones y condiciones', 'Notas para el huésped, notas internas y condiciones especiales.', <>
              <Campo label="Observaciones"><TextArea value={f.obs} onChange={v => setF({ ...f, obs: v })} rows={3} placeholder="Escriba cualquier observación" /></Campo>
              <Campo label="Observaciones internas"><TextArea value={f.internas} onChange={v => setF({ ...f, internas: v })} rows={3} placeholder="Escriba cualquier observación interna" /></Campo>
              <Campo label="Condiciones especiales"><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{CONDICIONES.map(c => {
                const on = f.condiciones.includes(c);
                return <button key={c} type="button" aria-pressed={on} onClick={() => setF({ ...f, condiciones: on ? f.condiciones.filter(x => x !== c) : [...f.condiciones, c] })} style={{ padding: '5px 12px', borderRadius: radius.pill, border: `1px solid ${on ? C.brand : C.n500}`, background: on ? C.brandBg : C.n000, color: on ? C.brand : C.n900, fontSize: 12, fontFamily: FONT, cursor: 'pointer' }}>{c}</button>;
              })}</div></Campo>
            </>)}
          </section>
        </div>

        <ResumenReserva f={f} setF={setF} numero={numero} cliente={cliente} desde={entMin} hasta={salMax} adultos={pax} ninos={ninos}
          hospedaje={impHab} servicios={servicios} total={aCobrar} errores={errores}
          onDeposito={() => setDlg('deposito')} onGuardar={guardar} onDescartar={() => setDlg('anular')} />
      </div>

      {dlg === 'perfil' && <SeleccionarPerfil onClose={() => setDlg(null)} onElegir={p => {
        cambiar(x => ({ ...x, perfil: p, tarifa: x.tarifa || (p.tipo === 'empresa' ? 'CORP' : 'DIR'), otras: { ...x.otras, vip: p.extra.vip },
          principal: p.tipo === 'cliente' ? { ...x.principal, nombre: p.nombre, identificacion: p.numeroId, email: p.email, telefono: p.telefono, nacionalidad: Object.entries(NACIONALIDADES).find(([, v]) => v === p.nacionalidad)?.[0] ?? '' } : x.principal }));
        setDlg(null);
      }} />}
      {dlg === 'cupos' && <DisponibilidadCupos onClose={() => setDlg(null)} desde={f.lineas[0].entrada} />}
      {dlg === 'pronostico' && <PronosticoTipoModal onClose={() => setDlg(null)} desde={f.lineas[0].entrada} />}
      {dlg === 'precios' && <RevisionPrecios onClose={() => setDlg(null)} tarifa={f.tarifa} tipo={f.lineas[0].tipo} entrada={f.lineas[0].entrada} salida={f.lineas[0].salida} />}
      {dlg === 'deposito' && <DepRequerido valor={f.depRequerido} moneda={f.moneda} sugerido={r2(f.lineas.reduce((s, l) => s + l.precio, 0))} onClose={() => setDlg(null)} onGuardar={v => { setF({ ...f, depRequerido: v }); setDlg(null); }} />}
      {dlg === 'anular' && <Alerta open titulo="¿Descartar la nueva reserva?" tono="danger" onClose={() => setDlg(null)} confirmar="Sí, descartar" cancelar="Seguir editando" onConfirm={onCancelar}>Se perderán los datos ingresados.</Alerta>}
      {linea && dlg && typeof dlg === 'object' && 'hab' in dlg && <SeleccionHabitacion tipo={linea.tipo} entrada={linea.entrada} salida={linea.salida} actual={linea.hab} onClose={() => setDlg(null)}
        onElegir={(num, tipo) => { setL(linea.key, { hab: num, tipo, ...(tipo !== linea.tipo && !linea.manual ? { precio: precioEn(tipo, f.tarifa, f.moneda) } : {}) }); setDlg(null); }} />}
      {linea && dlg && typeof dlg === 'object' && 'cargos' in dlg && <CargosLinea l={linea} moneda={f.moneda} onClose={() => setDlg(null)} onGuardar={c => { setL(linea.key, { cargos: c }); setDlg(null); }} />}
      {linea && dlg && typeof dlg === 'object' && 'huesped' in dlg && <ModalHuesped hu={linea.huesped} titulo={`Información de huéspedes · Línea ${f.lineas.indexOf(linea) + 1}`} render={camposHuesped} onClose={() => setDlg(null)} onGuardar={hu => { setL(linea.key, { huesped: hu }); setDlg(null); }} />}
      {linea && dlg && typeof dlg === 'object' && 'obsL' in dlg && <ModalTexto titulo={`Observaciones · Línea ${f.lineas.indexOf(linea) + 1}`} valor={linea.obs} onClose={() => setDlg(null)} onGuardar={v => { setL(linea.key, { obs: v }); setDlg(null); }} />}
      {dlg && typeof dlg === 'object' && 'espera' in dlg && <Alerta open titulo="Hay líneas sin disponibilidad" onClose={() => setDlg(null)} confirmar="Guardar en lista de espera" cancelar="Revisar"
        onConfirm={enEspera}>No quedan habitaciones libres del tipo elegido en esas fechas. Puedes guardar la reserva en lista de espera o cambiar el tipo de habitación.
        <div style={{ marginTop: 10 }}><Button variant="ghost" onClick={() => guardar(dlg.espera ? 'Confirmada' : 'Solicitada', true)}>Guardar de todas formas (sobreventa)</Button></div></Alerta>}
      {dlg && typeof dlg === 'object' && 'listo' in dlg && <ReservaGuardada listo={dlg.listo} lineas={f.lineas.length} modalidad={varias && f.modalidad ? f.modalidad : undefined} desde={entMin} hasta={salMax}
        onVer={() => onGuardado(dlg.listo.clave, `Reserva ${dlg.listo.numero} guardada`)} />}
      {portal}
    </Page>
  );
}
