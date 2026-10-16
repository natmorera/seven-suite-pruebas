'use client';
// Wizard «Nuevo folio externo» (4 pasos): Identificación → Crédito y garantía →
// Facturación electrónica → Cargos automáticos. Los pasos 2–4 se pueden saltar.
import { useState, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Modal, Radio, Select, Switch } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { Campo, Grid, IcTrash, IconButton } from '@/components/configuracion/kit';
import { useHotel, nuevoId } from '@/components/hotel/store';
import { ACTIVIDADES, HOY, REGLAS_ID, formatearId, perfilVacio, sumarDias, type Perfil, type TipoId } from '@/components/hotel/datos';
import {
  CONCEPTOS, CUENTAS_CONTABLES, TIPOS_DEPOSITO_GAR, TIPOS_FOLIO_EXT, TIPOS_TARJETA, ahoraHotel, conceptoDe, extraVacio, fmtN, r2,
  type CargoAuto, type FolioCuenta, type MovFolio,
} from '@/components/hotel/finanzas';

const PASOS = ['Identificación', 'Crédito y garantía', 'Facturación electrónica', 'Cargos automáticos'];
const TIPOS_ID: TipoId[] = ['Cédula Física', 'Cédula Jurídica', 'DIMEX', 'NITE', 'Pasaporte'];

export function NuevoFolioExterno({ onClose, onListo }: { onClose: () => void; onListo: (id: string, t: string) => void }) {
  const h = useHotel();
  const [paso, setPaso] = useState(0);
  const [error, setError] = useState('');
  const [id, setId] = useState({ tipoPerfil: 'empresa' as 'cliente' | 'empresa', tipoId: 'Cédula Jurídica' as TipoId, numero: '', nombre: '', perfilId: null as string | null, buscado: '', tipoFolio: TIPOS_FOLIO_EXT[2] ?? TIPOS_FOLIO_EXT[0], cuenta: CUENTAS_CONTABLES[0], vence: sumarDias(HOY, 30), email: '' });
  const [cr, setCr] = useState({ limite: '', tipoDeposito: TIPOS_DEPOSITO_GAR[0], deposito: '', tipoTarjeta: TIPOS_TARJETA[0], numeroTarjeta: '', venceTarjeta: '', nombreTarjeta: '', cheque: '', direccion: '', credito: false });
  const [fe, setFe] = useState({ activa: false, tipoId: '', numeroId: '', razon: '', email: '', actividad: '' });
  const [cargos, setCargos] = useState<CargoAuto[]>([]);

  const buscar = () => {
    const n = id.numero.replace(/[^A-Za-z0-9]/g, '');
    const p = h.perfiles.find(x => x.numeroId.replace(/[^A-Za-z0-9]/g, '') === n);
    if (p) {
      setId({ ...id, nombre: p.nombre, perfilId: p.id, tipoPerfil: p.tipo, tipoId: (p.tipoId || id.tipoId) as TipoId, email: p.email, buscado: `Perfil encontrado: ${p.nombre}` });
      setFe({ activa: p.fiscal.emitir, tipoId: p.fiscal.tipoId || p.tipoId, numeroId: p.fiscal.numeroId || p.numeroId, razon: p.fiscal.razon || p.nombre, email: p.fiscal.email || p.email, actividad: p.fiscal.actividad });
    } else setId({ ...id, perfilId: null, buscado: 'No se encontró en perfiles ni en DICR: ingresa la razón social o el nombre.' });
  };
  const validar = (p: number) => {
    if (p === 0) {
      if (!id.numero.trim() || !id.nombre.trim()) return 'Tipo e identificación y razón social / nombre son obligatorios.';
      if (!REGLAS_ID[id.tipoId].validar(id.numero.trim())) return `Identificación inválida: ${REGLAS_ID[id.tipoId].msg}`;
    }
    if (p === 1 && cr.tipoTarjeta !== 'Sin tarjeta' && (!/^\d{4}$/.test(cr.numeroTarjeta.replace(/\D/g, '').slice(-4)) || !/^\d{2}\/\d{4}$/.test(cr.venceTarjeta))) return 'Indica el número de tarjeta y el vencimiento (MM/AAAA).';
    if (p === 2 && fe.activa && (!fe.tipoId || !fe.numeroId || !fe.razon || !/^\S+@\S+\.\S+$/.test(fe.email) || !fe.actividad)) return 'Con factura electrónica activa, completa tipo ID, número, razón social, correo y código de actividad.';
    if (p === 3 && cargos.some(c => !c.servicio || !c.desde || !c.hasta || c.hasta < c.desde || c.cantidad <= 0 || c.precio <= 0)) return 'Revisa los cargos automáticos: servicio, fechas válidas, cantidad y precio.';
    return '';
  };
  const siguiente = () => { const e = validar(paso); if (e) return setError(e); setError(''); setPaso(paso + 1); };
  const crear = () => {
    for (let p = 0; p < 4; p++) { const e = validar(p); if (e) { setPaso(p); return setError(e); } }
    const numero = String(h.seq.folio);
    const folioId = `fx-${numero}`;
    const t = ahoraHotel();
    let perfilNuevo: Perfil | undefined;
    let perfilId = id.perfilId;
    if (!perfilId) {
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
      ...extraVacio(), id: folioId, clase: 'externo', numero, nombre: id.nombre.trim(), perfilId, titular: id.nombre.trim(), tipo: id.tipoFolio, cuenta: id.cuenta, emision: HOY, vencimiento: id.vence,
      moneda: 'USD', limite: Number(cr.limite) || 0, tipoDeposito: cr.tipoDeposito, depGarantia: Number(cr.deposito) || 0, folioCredito: cr.credito ? numero : '', formaPago: cr.tipoTarjeta !== 'Sin tarjeta' ? cr.tipoTarjeta : cr.cheque ? 'Cheque' : '',
      tarjeta: { tipo: cr.tipoTarjeta, numero: cr.numeroTarjeta ? `•••• ${cr.numeroTarjeta.replace(/\D/g, '').slice(-4)}` : '', vence: cr.venceTarjeta, nombre: cr.nombreTarjeta }, cheque: cr.cheque, direccionEnvio: cr.direccion, credito: cr.credito,
      fiscal: { activa: fe.activa, tipoId: fe.tipoId, numeroId: fe.numeroId, razon: fe.razon, email: fe.email, actividad: fe.actividad, direccion: cr.direccion }, cargosAuto: cargos, estado: 'Abierto', movs,
      bitacora: [{ id: nuevoId('e'), fecha: t, usuario: h.sesion, accion: `Folio creado con límite de crédito USD ${fmtN(Number(cr.limite) || 0)}` }, ...(movs.length ? [{ id: nuevoId('e'), fecha: t, usuario: h.sesion, accion: `${movs.length} cargo(s) automático(s) aplicados` }] : [])],
    };
    h.crearFolio(folio, perfilNuevo);
    onListo(folioId, `Folio externo ${numero} creado${perfilNuevo ? ' (y su perfil)' : ''}`);
  };
  const tarjeta = cr.tipoTarjeta !== 'Sin tarjeta';
  return (
    <Modal open title="Nuevo folio externo" onClose={onClose} width={820}
      footer={<>
        {paso > 0 && <Button variant="secondary" onClick={() => { setError(''); setPaso(paso - 1); }} style={{ marginRight: 'auto' }}>Anterior</Button>}
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        {paso > 0 && paso < 3 && <Button variant="ghost" onClick={() => { setError(''); setPaso(paso + 1); }}>Omitir paso</Button>}
        {paso < 3 ? <Button onClick={siguiente}>Siguiente</Button> : <Button onClick={crear}>Guardar</Button>}
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <ol style={{ display: 'flex', gap: 8, margin: 0, padding: 0, listStyle: 'none' }}>
          {PASOS.map((p, i) => (
            <li key={p} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: i === paso ? C.brand : i < paso ? '#2E7D32' : C.n700, fontWeight: i === paso ? 600 : 400 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, background: i === paso ? C.brand : i < paso ? '#2E7D32' : C.n500, color: i <= paso ? '#fff' : C.n700 }}>{i < paso ? '✓' : i + 1}</span>
              {p}{i > 0 && <span style={{ color: C.n700, fontWeight: 400 }}>(opc.)</span>}
            </li>
          ))}
        </ol>

        {paso === 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Campo label="Tipo de perfil" required><div style={{ display: 'flex', gap: 20 }}>
            <Radio label="Cliente" name="tp" checked={id.tipoPerfil === 'cliente'} onChange={() => setId({ ...id, tipoPerfil: 'cliente', tipoId: 'Cédula Física' })} />
            <Radio label="Empresa" name="tp" checked={id.tipoPerfil === 'empresa'} onChange={() => setId({ ...id, tipoPerfil: 'empresa', tipoId: 'Cédula Jurídica' })} />
          </div></Campo>
          <Grid cols={2} gap={14}>
            <Campo label="Tipo de identificación" required><Select value={id.tipoId} onChange={v => setId({ ...id, tipoId: v as TipoId })} options={TIPOS_ID.map(t => ({ value: t, label: t }))} /></Campo>
            <Campo label="Número de identificación" required hint={id.buscado || `Formato: ${REGLAS_ID[id.tipoId].formato}`}>
              <div style={{ display: 'flex', gap: 8 }}><div style={{ flex: 1 }}><Input value={id.numero} onChange={v => setId({ ...id, numero: v, perfilId: null, buscado: '' })} placeholder="Ingresa la identificación" /></div>
                <Button variant="secondary" style={{ color: C.brand, borderColor: C.brandBd }} onClick={buscar} disabled={!id.numero.trim()}>Buscar</Button></div>
            </Campo>
          </Grid>
          <Campo label="Razón social / Nombre" required><Input value={id.nombre} onChange={v => setId({ ...id, nombre: v })} disabled={!!id.perfilId} placeholder="Se autocompleta o ingrésalo manualmente" /></Campo>
          <Grid cols={3} gap={14}>
            <Campo label="Tipo de folio"><Select value={id.tipoFolio} onChange={v => setId({ ...id, tipoFolio: v })} options={TIPOS_FOLIO_EXT.map(t => ({ value: t, label: t }))} /></Campo>
            <Campo label="Cuenta contable"><Select value={id.cuenta} onChange={v => setId({ ...id, cuenta: v })} options={CUENTAS_CONTABLES.map(t => ({ value: t, label: t }))} /></Campo>
            <Campo label="Vencimiento"><Input type="date" value={id.vence} min={HOY} onChange={v => setId({ ...id, vence: v })} /></Campo>
          </Grid>
          {!id.perfilId && <Campo label="Correo electrónico (opcional)"><Input value={id.email} onChange={v => setId({ ...id, email: v })} placeholder="correo@empresa.com" /></Campo>}
        </div>}

        {paso === 1 && <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Grid cols={2} gap={14}>
            <Campo label="Límite de crédito"><Input value={cr.limite} onChange={v => setCr({ ...cr, limite: v.replace(/[^\d.]/g, '') })} placeholder="0.00" /></Campo>
            <Campo label="Tipo de depósito garantía"><Select value={cr.tipoDeposito} onChange={v => setCr({ ...cr, tipoDeposito: v })} options={TIPOS_DEPOSITO_GAR.map(t => ({ value: t, label: t }))} /></Campo>
          </Grid>
          <Campo label="Importe depósito en garantía"><Input value={cr.deposito} onChange={v => setCr({ ...cr, deposito: v.replace(/[^\d.]/g, '') })} placeholder="0.00" disabled={cr.tipoDeposito === 'Sin depósito'} /></Campo>
          <Campo label="Tipo de tarjeta de crédito"><Select value={cr.tipoTarjeta} onChange={v => setCr({ ...cr, tipoTarjeta: v })} options={TIPOS_TARJETA.map(t => ({ value: t, label: t }))} /></Campo>
          {tarjeta && <>
            <Grid cols={2} gap={14}>
              <Campo label="Número de tarjeta"><Input value={cr.numeroTarjeta} onChange={v => setCr({ ...cr, numeroTarjeta: v.replace(/[^\d ]/g, '').slice(0, 19) })} placeholder="0000 0000 0000 0000" inputMode="numeric" /></Campo>
              <Campo label="Vencimiento tarjeta (MM/AAAA)"><Input value={cr.venceTarjeta} onChange={v => setCr({ ...cr, venceTarjeta: v.replace(/[^\d/]/g, '').slice(0, 7) })} placeholder="MM/AAAA" /></Campo>
            </Grid>
            <Campo label="Nombre en la tarjeta"><Input value={cr.nombreTarjeta} onChange={v => setCr({ ...cr, nombreTarjeta: v })} placeholder="Nombre como aparece en la tarjeta" /></Campo>
          </>}
          <Campo label="Cheque a nombre de"><Input value={cr.cheque} onChange={v => setCr({ ...cr, cheque: v })} placeholder="Beneficiario del cheque (si aplica)" /></Campo>
          <Campo label="Dirección de envío de factura"><Input value={cr.direccion} onChange={v => setCr({ ...cr, direccion: v })} placeholder="Dirección postal o electrónica" /></Campo>
          <Checkbox label="Marcar como cuenta de crédito" checked={cr.credito} onChange={v => setCr({ ...cr, credito: v })} />
        </div>}

        {paso === 2 && <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Switch checked={fe.activa} onChange={v => setFe(v && !fe.razon ? { ...fe, activa: true, tipoId: id.tipoId, numeroId: id.numero, razon: id.nombre, email: id.email } : { ...fe, activa: v })} label="Emitir factura electrónica (DICR)" />
          {fe.activa ? <>
            <Grid cols={2} gap={14}>
              <Campo label="Tipo de identificación" required><Select value={fe.tipoId} onChange={v => setFe({ ...fe, tipoId: v })} options={[{ value: '', label: 'Seleccionar' }, ...TIPOS_ID.map(t => ({ value: t, label: t }))]} /></Campo>
              <Campo label="Número de identificación" required><Input value={fe.numeroId} onChange={v => setFe({ ...fe, numeroId: v })} /></Campo>
              <Campo label="Razón social" required><Input value={fe.razon} onChange={v => setFe({ ...fe, razon: v })} /></Campo>
              <Campo label="Correo electrónico" required><Input value={fe.email} onChange={v => setFe({ ...fe, email: v })} placeholder="facturas@empresa.com" /></Campo>
            </Grid>
            <Campo label="Código de actividad" required><Select value={fe.actividad} onChange={v => setFe({ ...fe, actividad: v })} options={[{ value: '', label: 'Seleccionar' }, ...ACTIVIDADES.map(a => ({ value: a, label: a }))]} /></Campo>
          </> : <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>Sin factura electrónica: el folio se facturará con tiquete electrónico.</p>}
        </div>}

        {paso === 3 && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>Servicios que la auditoría nocturna cargará cada día en el rango indicado. Los días ya transcurridos se cargan al crear el folio.</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>{['Servicio', 'Desde', 'Hasta', 'Cantidad', 'Precio', ''].map(x => <th key={x} style={{ textAlign: 'left', fontWeight: 400, color: C.n700, padding: '6px 4px' }}>{x}</th>)}</tr></thead>
            <tbody>
              {cargos.length === 0 && <tr><td colSpan={6} style={{ padding: 18, textAlign: 'center', color: C.n700, border: `1px dashed ${C.n500}`, borderRadius: radius.md }}>Sin cargos automáticos.</td></tr>}
              {cargos.map((c, i) => {
                const set = (p: Partial<CargoAuto>) => setCargos(cargos.map((x, j) => (j === i ? { ...x, ...p } : x)));
                return (
                  <tr key={c.id}>
                    <Td><Select value={c.servicio} onChange={v => set({ servicio: v })} options={[{ value: '', label: 'Seleccionar' }, ...CONCEPTOS.filter(k => k.codigo !== 'DESC').map(k => ({ value: k.codigo, label: k.descripcion }))]} /></Td>
                    <Td><Input type="date" value={c.desde} onChange={v => set({ desde: v })} aria-label="Desde" /></Td>
                    <Td><Input type="date" value={c.hasta} onChange={v => set({ hasta: v })} aria-label="Hasta" /></Td>
                    <Td w={80}><Input value={String(c.cantidad)} onChange={v => set({ cantidad: Number(v.replace(/\D/g, '')) || 0 })} aria-label="Cantidad" /></Td>
                    <Td w={110}><Input value={String(c.precio)} onChange={v => set({ precio: Number(v.replace(/[^\d.]/g, '')) || 0 })} aria-label="Precio" /></Td>
                    <Td w={32}><IconButton label="Quitar" tono="peligro" onClick={() => setCargos(cargos.filter((_, j) => j !== i))}><IcTrash /></IconButton></Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div><Button variant="secondary" icon={<IcPlus size={12} />} style={{ color: C.brand, borderColor: C.brandBd }} onClick={() => setCargos([...cargos, { id: nuevoId('ca'), servicio: '', desde: HOY, hasta: sumarDias(HOY, 7), cantidad: 1, precio: 0 }])}>Agregar cargo automático</Button></div>
        </div>}
        {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error, fontFamily: FONT }}>{error}</p>}
      </div>
    </Modal>
  );
}
const Td = ({ children, w }: { children: ReactNode; w?: number }) => <td style={{ padding: '4px', width: w }}>{children}</td>;
