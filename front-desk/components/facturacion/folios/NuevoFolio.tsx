'use client';
// Crear folio externo o cuenta casa en una hoja a pantalla completa: todas las secciones a la vista
// (las opcionales se pueden dejar vacías), índice a la izquierda y resumen fijo con «Crear» a la derecha.
import { useState, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Radio, Select, Switch } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { Campo, Grid, IcTrash, IconButton } from '@/components/configuracion/kit';
import { HojaCreacion, FilaResumen, type SeccionHoja } from '@/components/layout/HojaCreacion';
import { useHotel, nuevoId } from '@/components/hotel/store';
import { ACTIVIDADES, HOY, REGLAS_ID, fmtF, formatearId, perfilVacio, sumarDias, type Perfil, type TipoId } from '@/components/hotel/datos';
import {
  CONCEPTOS, CUENTAS_CONTABLES, TIPOS_DEPOSITO_GAR, TIPOS_FOLIO_EXT, TIPOS_TARJETA, ahoraHotel, conceptoDe, extraVacio, fmtMon, r2,
  type CargoAuto, type FolioCuenta, type MovFolio,
} from '@/components/hotel/finanzas';

const TIPOS_ID: TipoId[] = ['Cédula Física', 'Cédula Jurídica', 'DIMEX', 'NITE', 'Pasaporte'];
type Clase = 'externo' | 'casa';

export function NuevoFolio({ clase, onClose, onListo }: { clase: Clase; onClose: () => void; onListo: (id: string, t: string) => void }) {
  const h = useHotel();
  const casa = clase === 'casa';
  const [intento, setIntento] = useState(false);
  const [error, setError] = useState('');
  const cuentasCasa = [...new Set([...h.foliosCta.filter(c => c.clase === 'casa').map(c => c.cuenta), ...CUENTAS_CONTABLES])];
  const [id, setId] = useState({
    tipoPerfil: 'empresa' as 'cliente' | 'empresa', tipoId: 'Cédula Jurídica' as TipoId, numero: '', nombre: '', perfilId: null as string | null, buscado: '',
    tipoFolio: casa ? 'Cuentas Casa' : TIPOS_FOLIO_EXT[2] ?? TIPOS_FOLIO_EXT[0], cuenta: casa ? cuentasCasa[0] : CUENTAS_CONTABLES[0],
    vence: sumarDias(HOY, casa ? 365 : 30), email: '', titular: '', moneda: 'USD' as 'USD' | 'CRC',
  });
  const [cr, setCr] = useState({ limite: '', tipoDeposito: TIPOS_DEPOSITO_GAR[0], deposito: '', tipoTarjeta: TIPOS_TARJETA[0], numeroTarjeta: '', venceTarjeta: '', nombreTarjeta: '', cheque: '', direccion: '', credito: false });
  const [fe, setFe] = useState({ activa: false, tipoId: '', numeroId: '', razon: '', email: '', actividad: '' });
  const [cargos, setCargos] = useState<CargoAuto[]>([]);
  const sucio = !!(id.numero || id.nombre || cr.limite || cr.deposito || cargos.length);
  const numero = casa ? String(Math.max(20000000, ...h.foliosCta.filter(c => c.clase === 'casa').map(c => Number(c.numero) || 0)) + 1) : String(h.seq.folio);
  const tarjeta = cr.tipoTarjeta !== 'Sin tarjeta';

  const buscar = () => {
    const n = id.numero.replace(/[^A-Za-z0-9]/g, '');
    const p = h.perfiles.find(x => x.numeroId.replace(/[^A-Za-z0-9]/g, '') === n);
    if (p) {
      setId({ ...id, nombre: p.nombre, perfilId: p.id, tipoPerfil: p.tipo, tipoId: (p.tipoId || id.tipoId) as TipoId, email: p.email, buscado: `Perfil encontrado: ${p.nombre}` });
      setFe({ activa: p.fiscal.emitir, tipoId: p.fiscal.tipoId || p.tipoId, numeroId: p.fiscal.numeroId || p.numeroId, razon: p.fiscal.razon || p.nombre, email: p.fiscal.email || p.email, actividad: p.fiscal.actividad });
    } else setId({ ...id, perfilId: null, buscado: 'No está en perfiles: escribe la razón social o el nombre y se creará el perfil.' });
  };

  // Validación por sección (se muestra en el índice y en cada sección después del primer intento)
  const errId = casa
    ? (!id.nombre.trim() ? 'Escribe el nombre de la cuenta.' : !id.titular.trim() ? 'Indica el responsable de la cuenta.' : '')
    : (!id.numero.trim() || !id.nombre.trim() ? 'Completa la identificación y la razón social o nombre.' : !REGLAS_ID[id.tipoId].validar(id.numero.trim()) ? `Identificación inválida: ${REGLAS_ID[id.tipoId].msg}` : '');
  const errCr = tarjeta && (!/^\d{4}$/.test(cr.numeroTarjeta.replace(/\D/g, '').slice(-4)) || !/^\d{2}\/\d{4}$/.test(cr.venceTarjeta)) ? 'Indica el número de tarjeta y el vencimiento (MM/AAAA).' : '';
  const errFe = fe.activa && (!fe.tipoId || !fe.numeroId || !fe.razon || !/^\S+@\S+\.\S+$/.test(fe.email) || !fe.actividad) ? 'Con factura electrónica, completa tipo y número de identificación, razón social, correo y actividad.' : '';
  const errCargos = cargos.some(c => !c.servicio || !c.desde || !c.hasta || c.hasta < c.desde || c.cantidad <= 0 || c.precio <= 0) ? 'Revisa los cargos automáticos: servicio, fechas, cantidad y precio.' : '';
  const errores = [errId, errCr, errFe, errCargos].filter(Boolean);
  const est = (e: string, lleno: boolean) => (intento && e ? 'error' as const : lleno && !e ? 'completa' as const : undefined);

  const crear = () => {
    setIntento(true);
    if (errores.length) return setError(errores[0]);
    const folioId = `${casa ? 'fc' : 'fx'}-${numero}`;
    const t = ahoraHotel();
    let perfilNuevo: Perfil | undefined;
    let perfilId = id.perfilId;
    if (!casa && !perfilId) {
      perfilId = nuevoId('p');
      const base = perfilVacio(id.tipoPerfil);
      perfilNuevo = { ...base, id: perfilId, tipoId: id.tipoId, numeroId: formatearId(id.tipoId, id.numero.trim()), nombre: id.nombre.trim(), email: id.email.trim(), nacionalidad: 'Costa Rica',
        fiscal: { ...base.fiscal, emitir: fe.activa, tipoId: (fe.tipoId || '') as TipoId | '', numeroId: fe.numeroId, razon: fe.razon, email: fe.email, actividad: fe.actividad } };
    }
    // Cargos automáticos ya vencidos (desde ≤ hoy) se cargan al crear; el resto los carga la auditoría nocturna.
    const movs: MovFolio[] = [];
    cargos.forEach(c => {
      const tope = c.hasta < HOY ? c.hasta : HOY;
      for (let d = c.desde; d <= tope; d = sumarDias(d, 1)) {
        movs.push({ id: nuevoId('m'), fecha: d, hora: '00:00', concepto: c.servicio, descripcion: `${conceptoDe(c.servicio).descripcion} × ${c.cantidad}`, origen: 'AUD', conceptoOrig: conceptoDe(c.servicio).descripcion,
          importe: r2(c.cantidad * c.precio), tipo: 'Cargo', motivo: 'Cargo automático', usuario: h.sesion });
      }
    });
    const folio: FolioCuenta = {
      ...extraVacio(), id: folioId, clase, numero, nombre: id.nombre.trim(), perfilId: casa ? null : perfilId, titular: casa ? id.titular.trim() : id.nombre.trim(), tipo: id.tipoFolio, cuenta: id.cuenta, emision: HOY, vencimiento: id.vence,
      moneda: id.moneda, limite: Number(cr.limite) || 0, tipoDeposito: cr.tipoDeposito, depGarantia: Number(cr.deposito) || 0, folioCredito: cr.credito ? numero : '', formaPago: tarjeta ? cr.tipoTarjeta : cr.cheque ? 'Cheque' : '',
      tarjeta: { tipo: cr.tipoTarjeta, numero: cr.numeroTarjeta ? `•••• ${cr.numeroTarjeta.replace(/\D/g, '').slice(-4)}` : '', vence: cr.venceTarjeta, nombre: cr.nombreTarjeta }, cheque: cr.cheque, direccionEnvio: cr.direccion, credito: cr.credito,
      fiscal: { activa: fe.activa, tipoId: fe.tipoId, numeroId: fe.numeroId, razon: fe.razon, email: fe.email, actividad: fe.actividad, direccion: cr.direccion }, cargosAuto: cargos, estado: 'Abierto', movs,
      bitacora: [{ id: nuevoId('e'), fecha: t, usuario: h.sesion, accion: casa ? 'Cuenta casa creada' : `Folio creado con límite de crédito ${fmtMon(Number(cr.limite) || 0)}` },
        ...(movs.length ? [{ id: nuevoId('e'), fecha: t, usuario: h.sesion, accion: `${movs.length} cargo(s) automático(s) aplicados` }] : [])],
    };
    h.crearFolio(folio, perfilNuevo);
    onListo(folioId, casa ? `Cuenta casa ${numero} creada` : `Folio externo ${numero} creado${perfilNuevo ? ' (y su perfil)' : ''}`);
  };

  // ── Secciones ─────────────────────────────────────────────────────────────
  const aviso = (e: string) => intento && e ? <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>{e}</p> : null;
  const identificacion = (
    <>
      <Campo label="Tipo de perfil" required><div style={{ display: 'flex', gap: 20 }}>
        <Radio label="Empresa" name="tp" checked={id.tipoPerfil === 'empresa'} onChange={() => setId({ ...id, tipoPerfil: 'empresa', tipoId: 'Cédula Jurídica' })} />
        <Radio label="Cliente" name="tp" checked={id.tipoPerfil === 'cliente'} onChange={() => setId({ ...id, tipoPerfil: 'cliente', tipoId: 'Cédula Física' })} />
      </div></Campo>
      <Grid cols={2} gap={14}>
        <Campo label="Tipo de identificación" required><Select value={id.tipoId} onChange={v => setId({ ...id, tipoId: v as TipoId })} options={TIPOS_ID.map(t => ({ value: t, label: t }))} /></Campo>
        <Campo label="Número de identificación" required hint={id.buscado || `Formato: ${REGLAS_ID[id.tipoId].formato}`}>
          <div style={{ display: 'flex', gap: 8 }}><div style={{ flex: 1 }}><Input value={id.numero} onChange={v => setId({ ...id, numero: v, perfilId: null, buscado: '' })} placeholder="Ingresa la identificación" /></div>
            <Button variant="secondary" onClick={buscar} disabled={!id.numero.trim()}>Buscar perfil</Button></div>
        </Campo>
      </Grid>
      <Grid cols={2} gap={14}>
        <Campo label="Razón social / nombre" required><Input value={id.nombre} onChange={v => setId({ ...id, nombre: v })} disabled={!!id.perfilId} placeholder="Se completa al buscar o escríbelo" /></Campo>
        <Campo label="Correo electrónico"><Input value={id.email} onChange={v => setId({ ...id, email: v })} disabled={!!id.perfilId} placeholder="correo@empresa.com" /></Campo>
      </Grid>
      <Grid cols={3} gap={14}>
        <Campo label="Tipo de folio"><Select value={id.tipoFolio} onChange={v => setId({ ...id, tipoFolio: v })} options={TIPOS_FOLIO_EXT.map(t => ({ value: t, label: t }))} /></Campo>
        <Campo label="Cuenta contable"><Select value={id.cuenta} onChange={v => setId({ ...id, cuenta: v })} options={CUENTAS_CONTABLES.map(t => ({ value: t, label: t }))} /></Campo>
        <Campo label="Vencimiento"><Input type="date" value={id.vence} min={HOY} onChange={v => setId({ ...id, vence: v })} /></Campo>
      </Grid>
      {aviso(errId)}
    </>
  );
  const datosCasa = (
    <>
      <Grid cols={2} gap={14}>
        <Campo label="Nombre de la cuenta" required hint="Ej.: Consumo interno cocina, Cortesías gerencia"><Input value={id.nombre} onChange={v => setId({ ...id, nombre: v })} /></Campo>
        <Campo label="Responsable" required hint="Área o persona que autoriza los cargos"><Input value={id.titular} onChange={v => setId({ ...id, titular: v })} placeholder="Ej.: Gerencia general" /></Campo>
      </Grid>
      <Grid cols={3} gap={14}>
        <Campo label="Cuenta contable"><Select value={id.cuenta} onChange={v => setId({ ...id, cuenta: v })} options={cuentasCasa.map(t => ({ value: t, label: t }))} /></Campo>
        <Campo label="Moneda"><Select value={id.moneda} onChange={v => setId({ ...id, moneda: v as 'USD' | 'CRC' })} options={[{ value: 'USD', label: 'USD $' }, { value: 'CRC', label: 'CRC ₡' }]} /></Campo>
        <Campo label="Vigente hasta"><Input type="date" value={id.vence} min={HOY} onChange={v => setId({ ...id, vence: v })} /></Campo>
      </Grid>
      {aviso(errId)}
    </>
  );
  const credito = (
    <>
      <Grid cols={3} gap={14}>
        <Campo label={casa ? 'Tope de consumo' : 'Límite de crédito'} hint="Vacío = sin límite"><Input value={cr.limite} onChange={v => setCr({ ...cr, limite: v.replace(/[^\d.]/g, '') })} placeholder="0.00" /></Campo>
        {!casa && <Campo label="Depósito en garantía"><Select value={cr.tipoDeposito} onChange={v => setCr({ ...cr, tipoDeposito: v, deposito: v === 'Sin depósito' ? '' : cr.deposito })} options={TIPOS_DEPOSITO_GAR.map(t => ({ value: t, label: t }))} /></Campo>}
        {!casa && <Campo label="Importe del depósito"><Input value={cr.deposito} onChange={v => setCr({ ...cr, deposito: v.replace(/[^\d.]/g, '') })} placeholder="0.00" disabled={cr.tipoDeposito === 'Sin depósito'} /></Campo>}
      </Grid>
      {!casa && <>
        <Grid cols={3} gap={14}>
          <Campo label="Tarjeta de garantía"><Select value={cr.tipoTarjeta} onChange={v => setCr({ ...cr, tipoTarjeta: v })} options={TIPOS_TARJETA.map(t => ({ value: t, label: t }))} /></Campo>
          {tarjeta && <Campo label="Número de tarjeta"><Input value={cr.numeroTarjeta} onChange={v => setCr({ ...cr, numeroTarjeta: v.replace(/[^\d ]/g, '').slice(0, 19) })} placeholder="0000 0000 0000 0000" inputMode="numeric" /></Campo>}
          {tarjeta && <Campo label="Vencimiento (MM/AAAA)"><Input value={cr.venceTarjeta} onChange={v => setCr({ ...cr, venceTarjeta: v.replace(/[^\d/]/g, '').slice(0, 7) })} placeholder="MM/AAAA" /></Campo>}
        </Grid>
        {tarjeta && <Campo label="Nombre en la tarjeta"><Input value={cr.nombreTarjeta} onChange={v => setCr({ ...cr, nombreTarjeta: v })} placeholder="Como aparece en la tarjeta" /></Campo>}
        <Grid cols={2} gap={14}>
          <Campo label="Cheque a nombre de"><Input value={cr.cheque} onChange={v => setCr({ ...cr, cheque: v })} placeholder="Si paga con cheque" /></Campo>
          <Campo label="Dirección de envío de la factura"><Input value={cr.direccion} onChange={v => setCr({ ...cr, direccion: v })} placeholder="Dirección postal o correo" /></Campo>
        </Grid>
        <Checkbox label="Es cuenta de crédito (se factura al cierre y se cobra luego)" checked={cr.credito} onChange={v => setCr({ ...cr, credito: v })} />
      </>}
      {aviso(errCr)}
    </>
  );
  const facturacion = (
    <>
      <Switch checked={fe.activa} onChange={v => setFe(v && !fe.razon ? { ...fe, activa: true, tipoId: id.tipoId, numeroId: id.numero, razon: id.nombre, email: id.email } : { ...fe, activa: v })} label="Emitir factura electrónica (DICR)" />
      {fe.activa ? <>
        <Grid cols={2} gap={14}>
          <Campo label="Tipo de identificación" required><Select value={fe.tipoId} onChange={v => setFe({ ...fe, tipoId: v })} options={[{ value: '', label: 'Seleccionar' }, ...TIPOS_ID.map(t => ({ value: t, label: t }))]} /></Campo>
          <Campo label="Número de identificación" required><Input value={fe.numeroId} onChange={v => setFe({ ...fe, numeroId: v })} /></Campo>
          <Campo label="Razón social" required><Input value={fe.razon} onChange={v => setFe({ ...fe, razon: v })} /></Campo>
          <Campo label="Correo para facturas" required><Input value={fe.email} onChange={v => setFe({ ...fe, email: v })} placeholder="facturas@empresa.com" /></Campo>
        </Grid>
        <Campo label="Actividad económica" required><Select value={fe.actividad} onChange={v => setFe({ ...fe, actividad: v })} options={[{ value: '', label: 'Seleccionar' }, ...ACTIVIDADES.map(a => ({ value: a, label: a }))]} /></Campo>
      </> : <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>Sin factura electrónica, el folio se cierra con tiquete electrónico. Los datos se copian de la identificación al activarla.</p>}
      {aviso(errFe)}
    </>
  );
  const cargosAuto = (
    <>
      {cargos.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr>{['Servicio', 'Desde', 'Hasta', 'Cantidad', 'Precio', ''].map(x => <th key={x} style={{ textAlign: 'left', fontWeight: 400, color: C.n700, padding: '6px 4px' }}>{x}</th>)}</tr></thead>
          <tbody>
            {cargos.map((c, i) => {
              const set = (p: Partial<CargoAuto>) => setCargos(cargos.map((x, j) => (j === i ? { ...x, ...p } : x)));
              return (
                <tr key={c.id} style={{ borderTop: `1px solid ${C.n500}` }}>
                  <Td><Select value={c.servicio} onChange={v => set({ servicio: v })} options={[{ value: '', label: 'Seleccionar' }, ...CONCEPTOS.filter(k => k.codigo !== 'DESC').map(k => ({ value: k.codigo, label: k.descripcion }))]} /></Td>
                  <Td w={140}><Input type="date" value={c.desde} onChange={v => set({ desde: v })} aria-label="Desde" /></Td>
                  <Td w={140}><Input type="date" value={c.hasta} onChange={v => set({ hasta: v })} aria-label="Hasta" /></Td>
                  <Td w={80}><Input value={String(c.cantidad)} onChange={v => set({ cantidad: Number(v.replace(/\D/g, '')) || 0 })} aria-label="Cantidad" /></Td>
                  <Td w={100}><Input value={String(c.precio)} onChange={v => set({ precio: Number(v.replace(/[^\d.]/g, '')) || 0 })} aria-label="Precio" /></Td>
                  <Td w={32}><IconButton label="Quitar cargo" tono="peligro" onClick={() => setCargos(cargos.filter((_, j) => j !== i))}><IcTrash /></IconButton></Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div><Button variant="secondary" icon={<IcPlus size={12} />} onClick={() => setCargos([...cargos, { id: nuevoId('ca'), servicio: '', desde: HOY, hasta: sumarDias(HOY, 7), cantidad: 1, precio: 0 }])}>Agregar cargo automático</Button></div>
      {aviso(errCargos)}
    </>
  );

  const secciones: SeccionHoja[] = casa ? [
    { id: 'datos', titulo: 'Datos de la cuenta', descripcion: 'Las cuentas casa reciben los consumos internos del hotel (personal, cortesías, insumos).', contenido: datosCasa, estado: est(errId, !!id.nombre && !!id.titular) },
    { id: 'tope', titulo: 'Tope de consumo', opcional: true, descripcion: 'Si se supera, el folio lo marca en rojo.', contenido: credito, estado: est('', !!cr.limite) },
    { id: 'cargos', titulo: 'Cargos automáticos', opcional: true, descripcion: 'Servicios que la auditoría nocturna cargará cada día en el rango indicado. Los días ya transcurridos se cargan al crear.', contenido: cargosAuto, estado: est(errCargos, cargos.length > 0) },
  ] : [
    { id: 'identificacion', titulo: 'Identificación', descripcion: 'Busca el perfil por identificación; si no existe, se crea con estos datos.', contenido: identificacion, estado: est(errId, !!id.numero && !!id.nombre) },
    { id: 'credito', titulo: 'Crédito y garantía', opcional: true, contenido: credito, estado: est(errCr, !!cr.limite || !!cr.deposito || tarjeta) },
    { id: 'factura', titulo: 'Facturación electrónica', opcional: true, contenido: facturacion, estado: est(errFe, fe.activa) },
    { id: 'cargos', titulo: 'Cargos automáticos', opcional: true, descripcion: 'Servicios que la auditoría nocturna cargará cada día en el rango indicado. Los días ya transcurridos se cargan al crear.', contenido: cargosAuto, estado: est(errCargos, cargos.length > 0) },
  ];

  const diario = cargos.reduce((s, c) => s + c.cantidad * c.precio, 0);
  const sinDef = 'Sin definir';
  const resumen: ReactNode = (
    <>
      <div style={{ background: C.brandBg, borderRadius: radius.md, padding: '10px 12px', fontSize: 12, color: C.n700 }}>
        {casa ? 'Cuenta casa' : 'Folio externo'} N.° <b style={{ color: C.n900, fontWeight: 600 }}>{numero}</b>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <FilaResumen l={casa ? 'Cuenta' : 'Titular'} v={id.nombre || sinDef} vacio={!id.nombre} />
        {casa ? <FilaResumen l="Responsable" v={id.titular || sinDef} vacio={!id.titular} />
          : <FilaResumen l="Identificación" v={id.numero ? `${id.tipoId} ${id.numero}` : sinDef} vacio={!id.numero} />}
        {!casa && <FilaResumen l="Perfil" v={id.perfilId ? 'Existente' : id.nombre ? 'Se creará' : sinDef} vacio={!id.nombre} />}
        <FilaResumen l="Tipo" v={id.tipoFolio} />
        <FilaResumen l="Vence" v={fmtF(id.vence)} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 12, borderTop: `1px solid ${C.n500}` }}>
        <FilaResumen l={casa ? 'Tope' : 'Límite de crédito'} v={cr.limite ? fmtMon(Number(cr.limite), id.moneda) : 'Sin límite'} />
        {!casa && <FilaResumen l="Depósito" v={cr.deposito ? `${fmtMon(Number(cr.deposito))} · ${cr.tipoDeposito}` : 'Sin depósito'} />}
        {!casa && <FilaResumen l="Factura electrónica" v={fe.activa ? 'Sí' : 'No (tiquete)'} />}
        <FilaResumen l="Cargos automáticos" v={cargos.length ? `${cargos.length} · ${fmtMon(diario, id.moneda)} / día` : 'Ninguno'} />
      </div>
      <p style={{ margin: 0, fontSize: 11.5, color: C.n700, lineHeight: 1.5 }}>Solo la primera sección es obligatoria. {casa ? 'La cuenta' : 'El folio'} se puede completar después desde su detalle.</p>
    </>
  );

  return (
    <HojaCreacion titulo={casa ? 'Nueva cuenta casa' : 'Nuevo folio externo'} sub={`Facturación › ${casa ? 'Folios cuenta casa' : 'Folios externos'}`}
      secciones={secciones} resumen={resumen} error={intento ? error && errores[0] : ''} sucio={sucio} onClose={onClose}
      acciones={<>
        <Button onClick={crear} style={{ width: '100%', justifyContent: 'center' }}>{casa ? 'Crear cuenta casa' : 'Crear folio externo'}</Button>
      </>} />
  );
}

/** Se mantiene el nombre usado por las pantallas. */
export const NuevoFolioExterno = (p: { onClose: () => void; onListo: (id: string, t: string) => void }) => <NuevoFolio clase="externo" {...p} />;

const Td = ({ children, w }: { children: ReactNode; w?: number }) => <td style={{ padding: 4, width: w, fontFamily: FONT }}>{children}</td>;
