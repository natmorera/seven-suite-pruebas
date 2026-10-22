'use client';
// Check-in: formulario completo (huéspedes, identificación, firma, documentos y pago de garantía).
import { useState } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Modal, Radio, Select, StatusBadge, Switch } from '@/components/suite/ui';
import { Campo, Grid, IcTrash, IconButton, Popover, TextArea, LinkButton } from '@/components/configuracion/kit';
import { useHotel, totalReserva, nuevoId } from './store';
import { CONCEPTOS_CARGO, CONDICIONES, NACIONALIDADES, PAISES, REGIMENES, noches, type Reserva } from './datos';
import { Alerta, money } from './ui';
import { EstadoRegistro, TarjetaRegistro } from './TarjetaRegistro';
import { EstanciaTramos, erroresTramos, tramoInicial } from './checkinEstancia';
import type { Tramo } from './reservas';
import { Bloque, td, th } from './checkinPiezas';
import { MontoCelda } from '@/components/suite/Monto';

export function FormularioCheckIn({ reservaId, onClose }: { reservaId: string; onClose: () => void }) {
  const h = useHotel();
  const original = h.reservas.find(r => r.id === reservaId)!;
  const perfil = h.perfiles.find(p => p.id === original.perfilId);
  const [r, setR] = useState<Reserva>(() => structuredClone(original));
  const [extra, setExtra] = useState({ ocupacion: '', sexo: perfil?.genero ?? '', tipo: 'Adulto', pais: perfil?.dir.pais ?? '', ciudad: '', cp: '', direccion: '' });
  const [errores, setErrores] = useState<string[]>([]);
  const [confirmar, setConfirmar] = useState(false);
  const [tarjeta, setTarjeta] = useState(false);
  const [desglose, setDesglose] = useState(false);
  // Reserva de varias habitaciones: grupo (factura única con folio de agencia) o individual múltiple
  // (en el primer check-in se decide si se separa la facturación por habitación).
  const hermanas = original.grupo ? h.reservas.filter(x => x.grupo === original.grupo && x.estado !== 'Anulada') : [original];
  const multiple = hermanas.length > 1;
  const esGrupo = multiple && original.modalidad === 'grupo';
  const preguntarFact = multiple && !esGrupo && original.facturaUnica === undefined;
  const [unica, setUnica] = useState(false);
  // Estancia por tramos: un tramo = estancia normal; varios = cambio de habitación programado
  const [tramos, setTramos] = useState<Tramo[]>(() => [tramoInicial(original)]);
  const dividida = tramos.length > 1;
  const t0 = tramos[0];
  const registroListo = h.reservas.find(x => x.id === reservaId)?.tarjetaLista ?? false;
  const p = (x: Partial<Reserva>) => setR(v => ({ ...v, ...x }));
  const salida = tramos.at(-1)!.hasta;
  const n = noches(r.entrada, salida);
  const alojamiento = tramos.reduce((s, t) => s + t.precio * noches(t.desde, t.hasta), 0);
  const total = totalReserva({ ...r, salida }) - r.precio * n + alojamiento;
  const cargos = total + r.descuento - alojamiento;
  const limite = perfil?.extra.maximo ? Number(perfil.extra.maximo) : 42500;

  const validar = () => {
    const e: string[] = [];
    if (!r.nombre.trim()) e.push('Nombre del huésped principal');
    if (!r.identificacion.trim()) e.push('Identificación');
    if (!/^\S+@\S+\.\S+$/.test(r.email)) e.push('E-mail válido');
    e.push(...erroresTramos(tramos));
    r.adicionales.forEach((a, i) => { if (!a.nombre.trim() || !a.identificacion.trim()) e.push(`Nombre e identificación del adicional ${i + 1}`); });
    setErrores(e);
    if (!e.length) setConfirmar(true);
  };

  return (
    <>
      <Modal open onClose={onClose} width={980}
        title={`Check in · ${r.cliente === 'Tarifa Corporativa' ? 'C. Empresa' : r.cliente === 'Agencia de Viajes' ? 'C. Agencia' : 'C. Directo'} · Reserva ${r.numero}`}
        footer={<>
          {errores.length > 0 ? <span role="alert" style={{ marginRight: 'auto', fontSize: 12.5, color: C.error }}>Completa: {errores.join(', ')}.</span> : <span style={{ marginRight: 'auto' }} />}
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={validar}>{dividida ? `Confirmar check-in · ${tramos.length} tramos` : 'Confirmar check-in'}</Button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT }}>
          {/* Registro del huésped: pendiente (enlaces del Web Check-In) o completada (tarjeta) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', border: `1px solid ${registroListo ? C.n500 : 'rgba(238,179,0,.45)'}`, background: registroListo ? C.n000 : 'rgba(238,179,0,.06)', borderRadius: radius.md }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
              <b style={{ fontWeight: 600 }}>Registro del huésped</b><EstadoRegistro r={h.reservas.find(x => x.id === reservaId) ?? original} />
              <span style={{ color: C.n700 }}>{registroListo ? 'La tarjeta de registro está lista.' : 'Compártele el Web Check-In o complétalo aquí con él.'}</span>
            </span>
            <Button variant="secondary" style={{ height: 28 }} onClick={() => setTarjeta(true)}>{registroListo ? 'Ver tarjeta' : 'Completar registro'}</Button>
          </div>
          <EstanciaTramos r={original} tramos={tramos} onChange={setTramos} />
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12, color: C.n700, padding: '0 2px' }}>
            <span>Adultos / niños: <b style={{ color: C.n900, fontWeight: 500 }}>{r.adultos} / {r.ninos}</b></span>
            <span title={REGIMENES[r.regimen]}>Régimen: <b style={{ color: C.n900, fontWeight: 500 }}>{r.regimen}</b></span>
            <span>Tarifa: <b style={{ color: C.n900, fontWeight: 500 }}>{r.tarifa}</b></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: C.n200, borderRadius: radius.md }}>
            <Switch checked={r.credito} onChange={b => p({ credito: b })} label="Aplicar crédito al cliente" />
            {r.credito && <span style={{ fontSize: 12, color: C.n700 }}>Límite de crédito: <b style={{ color: C.n900 }}>{money(limite)}</b></span>}
          </div>

          <Bloque titulo="Huésped principal" abierto estado={r.nombre && r.identificacion ? <StatusBadge label="Completo" color="green" /> : <StatusBadge label="Sin información" color="gray" />}>
            <Grid cols={2}>
              <Campo label="Nombre del huésped principal" required><Input value={r.nombre} onChange={v => p({ nombre: v })} /></Campo>
              <Campo label="Perfil de cliente">
                <Select value={r.perfilId ?? ''} onChange={v => { const pf = h.perfiles.find(x => x.id === v); p({ perfilId: v || null, ...(pf ? { nombre: pf.nombre.toUpperCase(), identificacion: pf.numeroId, email: pf.email, telefono: pf.telefono, vip: pf.extra.vip } : {}) }); }}
                  options={[{ value: '', label: 'Sin perfil' }, ...h.perfiles.filter(x => x.tipo === 'cliente').map(x => ({ value: x.id, label: `${x.nombre} · ${x.numeroId}` }))]} />
              </Campo>
              <Campo label="Identificación" required><Input value={r.identificacion} onChange={v => p({ identificacion: v })} /></Campo>
              <Campo label="Nacionalidad (opcional)"><Select value={r.nacionalidad} onChange={v => p({ nacionalidad: v })} options={Object.entries(NACIONALIDADES).map(([k, v]) => ({ value: k, label: v }))} /></Campo>
              <Campo label="E-mail" required><Input type="email" value={r.email} onChange={v => p({ email: v })} placeholder="correo@ejemplo.com" /></Campo>
              <Campo label="Teléfono (opcional)"><Input value={r.telefono} onChange={v => p({ telefono: v })} placeholder="+506 8888 8888" /></Campo>
            </Grid>
            <Checkbox checked={r.vip} onChange={b => p({ vip: b })} label="Huésped VIP" />
            <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 500 }}>Información adicional (opcional)</p>
            <Grid cols={3}>
              <Campo label="Ocupación"><Input value={extra.ocupacion} onChange={v => setExtra({ ...extra, ocupacion: v })} placeholder="Selecciona la ocupación" /></Campo>
              <Campo label="Sexo"><Select value={extra.sexo} onChange={v => setExtra({ ...extra, sexo: v as '' })} options={[{ value: '', label: 'Selecciona' }, { value: 'M', label: 'Masculino' }, { value: 'F', label: 'Femenino' }]} /></Campo>
              <Campo label="Tipo"><div style={{ display: 'flex', gap: 16, height: 32, alignItems: 'center' }}>{['Adulto', 'Niño'].map(t => <Radio key={t} name="tipo-hp" checked={extra.tipo === t} onChange={() => setExtra({ ...extra, tipo: t })} label={t} />)}</div></Campo>
              <Campo label="País"><Select value={extra.pais} onChange={v => setExtra({ ...extra, pais: v })} options={[{ value: '', label: 'Selecciona el país' }, ...PAISES.map(x => ({ value: x, label: x }))]} /></Campo>
              <Campo label="Ciudad"><Input value={extra.ciudad} onChange={v => setExtra({ ...extra, ciudad: v })} /></Campo>
              <Campo label="Código postal"><Input value={extra.cp} onChange={v => setExtra({ ...extra, cp: v })} /></Campo>
            </Grid>
            <Campo label="Dirección"><Input value={extra.direccion} onChange={v => setExtra({ ...extra, direccion: v })} placeholder="Ingresa la dirección completa" /></Campo>
          </Bloque>

          <Bloque titulo="Huéspedes adicionales" estado={r.adicionales.length ? `${r.adicionales.length} adicionales` : 'Sin información'}>
            {r.adicionales.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 10, borderBottom: `1px solid ${C.n500}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 12, fontWeight: 500 }}>Adicional {i + 1}</b>
                  <IconButton label="Quitar adicional" tono="peligro" onClick={() => p({ adicionales: r.adicionales.filter(x => x.id !== a.id) })}><IcTrash /></IconButton></div>
                <Grid cols={4}>
                  {(['nombre', 'identificacion', 'nacionalidad', 'email'] as const).map(k => (
                    <Campo key={k} label={{ nombre: 'Nombre del huésped', identificacion: 'Identificación', nacionalidad: 'Nacionalidad (opcional)', email: 'E-mail (opcional)' }[k]} required={k === 'nombre' || k === 'identificacion'}>
                      {k === 'nacionalidad'
                        ? <Select value={a.nacionalidad} onChange={v => p({ adicionales: r.adicionales.map(x => (x.id === a.id ? { ...x, nacionalidad: v } : x)) })} options={[{ value: '', label: 'Selecciona' }, ...Object.entries(NACIONALIDADES).map(([c, l]) => ({ value: c, label: l }))]} />
                        : <Input value={a[k]} onChange={v => p({ adicionales: r.adicionales.map(x => (x.id === a.id ? { ...x, [k]: v } : x)) })} />}
                    </Campo>
                  ))}
                </Grid>
              </div>
            ))}
            <div><LinkButton onClick={() => p({ adicionales: [...r.adicionales, { id: nuevoId('ad'), nombre: '', identificacion: '', nacionalidad: '', email: '' }] })} style={{ textDecoration: 'none' }}>+ Agregar nuevo huésped</LinkButton></div>
          </Bloque>

          <Bloque titulo="Observaciones" estado={r.condiciones.length ? <span style={{ display: 'flex', gap: 4 }}>{r.condiciones.slice(0, 4).map(c => <StatusBadge key={c} label={c} color="brand" />)}</span> : 'Sin observaciones'}>
            <Campo label="Observaciones"><TextArea value={r.observaciones} onChange={v => p({ observaciones: v })} rows={2} placeholder="Escriba cualquier observación" /></Campo>
            <Campo label="Observaciones internas"><TextArea value={r.observacionesInternas} onChange={v => p({ observacionesInternas: v })} rows={2} placeholder="Solo visibles para el personal" /></Campo>
            <Campo label="Condiciones especiales">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CONDICIONES.map(c => { const on = r.condiciones.includes(c); return (
                  <button key={c} type="button" aria-pressed={on} onClick={() => p({ condiciones: on ? r.condiciones.filter(x => x !== c) : [...r.condiciones, c] })}
                    style={{ padding: '5px 10px', borderRadius: radius.control, fontSize: 12, fontFamily: FONT, cursor: 'pointer', border: `1px solid ${on ? C.brandBd : C.n500}`, background: on ? C.brandBg : C.n000, color: on ? C.brand : C.n900 }}>{c}</button>); })}
              </div>
            </Campo>
          </Bloque>

          <Bloque titulo="Cargos automáticos" estado={r.cargos.length ? `${r.cargos.length} cargos` : 'Sin cargos automáticos'}>
            {r.cargos.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Desde', 'Hasta', 'Cantidad', 'Concepto', 'Precio i.i', 'Total i.i', ''].map(c => <th key={c} style={th}>{c}</th>)}</tr></thead>
                <tbody>{r.cargos.map(c => {
                  const setC = (x: Partial<typeof c>) => p({ cargos: r.cargos.map(y => (y.id === c.id ? { ...y, ...x } : y)) });
                  const dias = Math.max(1, noches(c.desde, c.hasta));
                  return (
                    <tr key={c.id}>
                      <td style={td}><Input type="date" value={c.desde} min={r.entrada} max={r.salida} onChange={v => setC({ desde: v })} /></td>
                      <td style={td}><Input type="date" value={c.hasta} min={c.desde} max={r.salida} onChange={v => setC({ hasta: v })} /></td>
                      <td style={{ ...td, width: 70 }}><Input type="number" value={c.cantidad} onChange={v => setC({ cantidad: Math.max(1, Number(v) || 1) })} /></td>
                      <td style={td}><Select value={c.concepto} onChange={v => setC({ concepto: v })} options={[{ value: '', label: 'Selecciona un concepto' }, ...CONCEPTOS_CARGO.map(x => ({ value: x, label: x }))]} /></td>
                      <td style={{ ...td, width: 100 }}><Input type="number" value={c.precio} onChange={v => setC({ precio: Math.max(0, Number(v) || 0) })} /></td>
                      <td style={{ ...td, textAlign: 'right' }}><MontoCelda texto={money(c.precio * c.cantidad * dias)} /></td>
                      <td style={td}><IconButton label="Quitar cargo" tono="peligro" onClick={() => p({ cargos: r.cargos.filter(y => y.id !== c.id) })}><IcTrash /></IconButton></td>
                    </tr>);
                })}</tbody>
              </table>
            )}
            <div><LinkButton onClick={() => p({ cargos: [...r.cargos, { id: nuevoId('cg'), desde: r.entrada, hasta: r.salida, cantidad: 1, concepto: '', precio: 0 }] })} style={{ textDecoration: 'none' }}>+ Agregar nuevo cargo</LinkButton></div>
          </Bloque>

          <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 14, display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px 20px', fontSize: 12, alignItems: 'center' }}>
            <span>Descuento</span><div style={{ width: 140 }}><Input type="number" value={r.descuento} onChange={v => p({ descuento: Math.max(0, Number(v) || 0) })} style={{ textAlign: 'right' }} aria-label="Descuento" /></div>
            <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>Importe total
              <span style={{ position: 'relative' }}><LinkButton onClick={() => setDesglose(true)}>Ver desglose</LinkButton>
                <Popover open={desglose} onClose={() => setDesglose(false)} width={260}>
                  <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, fontSize: 12 }}>
                    <span>Alojamiento ({n} noches)</span><span>{money(alojamiento)}</span><span>Cargos adicionales</span><span>{money(cargos)}</span>
                    <span>Impuestos incluidos (13%)</span><span>{money((alojamiento + cargos) * 13 / 113)}</span><span>Descuento</span><span>- {money(r.descuento)}</span>
                    <b style={{ fontWeight: 600, borderTop: `1px solid ${C.n500}`, paddingTop: 6 }}>Subtotal i.i</b><b style={{ fontWeight: 600, borderTop: `1px solid ${C.n500}`, paddingTop: 6 }}>{money(total)}</b>
                  </div>
                </Popover>
              </span>
            </span><b style={{ fontSize: 14 }}>{money(total)}</b>
            <span>Importe pagado</span><span>{money(r.pagado)}</span>
            <span>Importe pendiente</span><span style={{ color: total - r.pagado > 0 ? '#B45309' : C.n900 }}>{money(Math.max(0, total - r.pagado))}</span>
            <span>Dep. en garantía</span><span>{money(r.depGarantia)}</span>
          </div>
        </div>
      </Modal>
      {tarjeta && <TarjetaRegistro reservaId={reservaId} onClose={() => setTarjeta(false)} alCompletar={() => setTarjeta(false)} />}
      <Alerta open={confirmar} titulo="¿Deseas realizar el check-in?" onClose={() => setConfirmar(false)}
        onConfirm={() => {
          // Si el registro se completó mientras el formulario estaba abierto, sus datos mandan
          const act = h.reservas.find(x => x.id === reservaId);
          const delRegistro = act?.registro && act.registro.fecha !== original.registro?.fecha
            ? { nombre: act.nombre, email: act.email, nacionalidad: act.nacionalidad, identificacion: act.identificacion, observaciones: act.observaciones, registro: act.registro } : {};
          const rr = { ...r, ...delRegistro };
          if (dividida) {
            // Primero se guardan los datos del formulario, luego se crean los tramos y por último el check-in del primero
            h.setReserva(reservaId, { ...rr, habitacion: original.habitacion, salida: original.salida, tipo: original.tipo, precio: original.precio, cuentas: original.cuentas });
            h.dividirEstancia(reservaId, tramos);
            h.checkIn(reservaId, { habitacion: t0.habitacion });
          } else {
            h.checkIn(reservaId, { ...rr, salida: t0.hasta, habitacion: t0.habitacion, tipo: t0.tipo, precio: t0.precio, tarjetaLista: true, ...(preguntarFact ? { facturaUnica: unica } : {}) });
          }
          if (preguntarFact) h.editarReserva(hermanas.filter(x => x.id !== reservaId).map(x => ({ id: x.id, p: { facturaUnica: unica } })), 'Facturación definida en el check-in', 'Por definir', unica ? 'Una sola factura para todas las habitaciones' : 'Factura separada por habitación');
          setConfirmar(false); onClose();
        }}>
        La reserva pasará a In-House y la habitación {t0.habitacion} quedará ocupada; se habilitará el registro de cargos.
        {dividida && <span style={{ display: 'block', marginTop: 10 }}>Cambios de habitación programados: {tramos.slice(1).map(t => `hab. ${t.habitacion} desde el ${t.desde.slice(8, 10)}/${t.desde.slice(5, 7)}`).join(', ')}. Cada tramo queda como una línea confirmada de la misma reserva, en una sola factura.</span>}
        {preguntarFact && (
          <div role="radiogroup" aria-label="Facturación de la reserva" style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: C.n900 }}>Esta reserva tiene {hermanas.length} habitaciones. ¿Cómo se factura?</span>
            {([[false, 'Factura separada por habitación', 'Cada habitación cierra su propia cuenta y recibe su factura.'], [true, 'Una sola factura', 'Todas las habitaciones se cobran juntas en una única factura.']] as const).map(([v, t, d]) => (
              <button key={t} type="button" role="radio" aria-checked={unica === v} onClick={() => setUnica(v)}
                style={{ display: 'flex', gap: 10, textAlign: 'left', padding: '10px 12px', border: `1px solid ${unica === v ? C.brand : C.n500}`, background: unica === v ? C.brandBg : C.n000, borderRadius: radius.md, cursor: 'pointer', fontFamily: FONT }}>
                <span aria-hidden style={{ width: 14, height: 14, marginTop: 2, borderRadius: '50%', border: `1.5px solid ${unica === v ? C.brand : '#B8B8BF'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{unica === v && <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.brand }} />}</span>
                <span><span style={{ display: 'block', fontSize: 12.5, color: C.n900 }}>{t}</span><span style={{ display: 'block', fontSize: 11.5, color: C.n700, marginTop: 2 }}>{d}</span></span>
              </button>
            ))}
            <span style={{ fontSize: 11, color: C.n700 }}>Se aplica a todas las habitaciones de la reserva.</span>
          </div>
        )}
        {esGrupo && <p style={{ margin: '12px 0 0', fontSize: 12, color: C.n700 }}>Reserva grupal: el hospedaje se cobra en el folio de agencia y los consumos de esta habitación en su propia cuenta; todo se cierra en una sola factura.</p>}
        {multiple && !esGrupo && !preguntarFact && <p style={{ margin: '12px 0 0', fontSize: 12, color: C.n700 }}>Facturación: {original.facturaUnica ? 'una sola factura para todas las habitaciones' : 'factura separada por habitación'} (definida en el primer check-in).</p>}
      </Alerta>
    </>
  );
}
