'use client';
// Caja: apertura de caja / turno con conteo, arqueo, resumen y firma del cierre de turno.
import { useState } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Select } from '@/components/suite/ui';
import { TextArea } from '@/components/configuracion/kit';
import { usePrint } from '@/components/hotel/ui';
import { useHotel, nuevoId } from '@/components/hotel/store';
import { HOY, fmtF } from '@/components/hotel/datos';
import { COMPROBANTES, MOTIVOS_DIFERENCIA, RESPONSABLE, TC, ahoraHotel, conteoVacio, fmtDuracion, fmtUSD, minutosEntre, r2, totalComprobantesUSD, totalConteoUSD, type Comprobantes, type Conteo } from '@/components/hotel/finanzas';
import { Banda, Bloque, PaginaFact, Tarjeta, Visor, useAhora } from '../comun';
import { CONFIG_CAJA, esResponsable, heredado, resumenTurno, totalesDeclarados, type Declaracion } from './calc';
import { TicketTurno } from './Reportes';
import { Check, Dato, FirmaModal, Linea, Renglon, TablaConteo, VerComo, Volver, type P } from './piezas';

export function AbrirTurno({ ir, toast, modo, cajero }: P & { modo: 'caja' | 'turno'; cajero: string }) {
  const h = useHotel();
  const ahora = useAhora();
  const { anterior, saldo, conteo: conteoAnterior } = heredado(h);
  const [conteo, setConteo] = useState<Conteo>(conteoVacio());
  const [obs, setObs] = useState('');
  const [error, setError] = useState('');
  const declarado = totalConteoUSD(conteo);
  const dif = r2(declarado - saldo);
  const abrir = () => {
    if (declarado <= 0 && saldo > 0) return setError('Cuenta el efectivo físico y declara las cantidades por denominación.');
    if (Math.abs(dif) >= 0.01 && !obs.trim()) return setError('Hay una diferencia con el saldo esperado: explícala en Observaciones.');
    const inicio = ahoraHotel();
    if (modo === 'caja') h.abrirCaja(cajero, inicio);
    h.abrirTurno({ id: nuevoId('tur'), cajero, inicio, saldoInicial: saldo, conteoApertura: conteo, obsApertura: obs.trim(), turnoAnterior: anterior?.id ?? null });
    toast(modo === 'caja' ? `Caja del día abierta · turno de ${cajero} iniciado` : `Turno de ${cajero} abierto`);
    ir({ v: 'inicio' });
  };
  return (
    <PaginaFact titulo={modo === 'caja' ? 'Abrir caja' : cajero === h.sesion ? 'Abrir mi turno' : `Abrir turno · ${cajero}`} izquierda={<Volver onClick={() => ir({ v: 'inicio' })} />}
      pie={<><Button variant="secondary" onClick={() => ir({ v: 'inicio' })}>Cancelar</Button><Button onClick={abrir}>Abrir turno →</Button></>}>
      {modo === 'caja' && <Banda tono="info">Declara el efectivo físico con el que abre la caja del día. El sistema calculará automáticamente la diferencia con el cierre anterior.</Banda>}
      {modo === 'turno' && cajero !== h.sesion && <Banda tono="warn">Apertura manual realizada por {h.sesion} en nombre de {cajero}.</Banda>}
      <Tarjeta titulo="Información del turno">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '18px 24px' }}>
          <Dato l="Cajero" v={cajero} /><Dato l="Caja asignada" v="Recepción" /><Dato l="Fecha y hora de apertura" v={ahora ? `${fmtF(HOY)} · ${ahora.slice(11, 16)}` : fmtF(HOY)} />
          <Dato l="Turno anterior" v={anterior ? `${anterior.cajero} · ${fmtF(anterior.inicio.slice(0, 10)).slice(0, 5)} ${anterior.inicio.slice(11, 16)}–${anterior.fin!.slice(11, 16)}` : '—'} />
          <Dato l="Tipo de cambio BCCR" v={`₡${TC} / $1 USD`} />
          <Dato l={CONFIG_CAJA.modalidad === 'fijo' ? 'Fondo fijo' : 'Saldo heredado'} v={<span style={{ color: C.brand, fontSize: 18 }}>{fmtUSD(saldo)}</span>} />
        </div>
      </Tarjeta>
      <Tarjeta titulo="Verificación de saldo inicial">
        <p style={{ margin: '-6px 0 0', fontSize: 12.5, color: C.n700 }}>Cuenta el efectivo físico y declara lo que encuentras en caja. Si el monto difiere del esperado, el sistema registrará la diferencia al turno anterior.
          {conteoAnterior && <> · <button type="button" onClick={() => setConteo({ USD: { ...conteoAnterior.USD }, CRC: { ...conteoAnterior.CRC } })} style={{ border: 'none', background: 'none', color: C.brand, cursor: 'pointer', fontFamily: FONT, fontSize: 12.5, padding: 0, textDecoration: 'underline' }}>Usar el conteo del cierre anterior</button></>}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <TablaConteo moneda="USD" conteo={conteo} onChange={setConteo} titulo="Efectivo USD" />
          <TablaConteo moneda="CRC" conteo={conteo} onChange={setConteo} titulo="Efectivo CRC" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, borderTop: `1px solid ${C.n500}`, paddingTop: 16 }}>
          <Linea l="Saldo esperado (turno anterior)" v={fmtUSD(saldo)} />
          <Linea l="Total declarado (USD + equiv. CRC)" v={fmtUSD(declarado)} azul />
        </div>
        {declarado > 0 && Math.abs(dif) >= 0.01 && <Banda tono={dif < 0 ? 'error' : 'warn'}>Diferencia de {fmtUSD(dif)} ({dif < 0 ? 'faltante' : 'sobrante'}) respecto al saldo esperado. Se registrará en el turno de {anterior?.cajero ?? 'apertura'}.</Banda>}
      </Tarjeta>
      <Tarjeta>
        <span style={{ fontSize: 13 }}>Observaciones <span style={{ color: C.n700 }}>(opcional)</span></span>
        <TextArea value={obs} onChange={setObs} rows={3} placeholder="Ej: Posible billete no contabilizado en turno anterior..." />
        {error && <p role="alert" style={{ margin: 0, color: C.error, fontSize: 12 }}>{error}</p>}
      </Tarjeta>
    </PaginaFact>
  );
}
// ── Arqueo (cerrar turno) ───────────────────────────────────────────────────
export function Arqueo({ ir, turnoId, inicial, obsInicial }: P & { turnoId: string; inicial?: Declaracion; obsInicial?: string }) {
  const h = useHotel();
  const t = h.turnos.find(x => x.id === turnoId)!;
  const r = resumenTurno(h, t);
  const [conteo, setConteo] = useState<Conteo>(inicial?.conteo ?? conteoVacio());
  const [comp, setComp] = useState<Comprobantes>(inicial?.comprobantes ?? r.sistema);
  const [obs, setObs] = useState(obsInicial ?? '');
  const totalComp = totalComprobantesUSD(comp);
  const inputMonto = (k: keyof Comprobantes) => (
    <input value={comp[k] || comp[k] === 0 ? String(comp[k]) : ''} inputMode="decimal" aria-label={`Monto ${k}`} className="suite-campo"
      onChange={e => setComp({ ...comp, [k]: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })}
      style={{ width: 130, height: 32, border: `1px solid ${C.n500}`, borderRadius: radius.control, textAlign: 'right', padding: '0 10px', fontSize: 13, fontFamily: FONT, outline: 'none' }} />
  );
  return (
    <PaginaFact titulo={`Arqueo de turno · ${t.cajero}`} izquierda={<Volver onClick={() => ir({ v: 'inicio' })} />}
      pie={<><Button variant="secondary" onClick={() => ir({ v: 'inicio' })}>Cancelar</Button><Button onClick={() => ir({ v: 'resumen', turnoId, decl: { conteo, comprobantes: comp }, obs })}>Calcular y revisar →</Button></>}>
      <Banda tono="info">Declara el efectivo físico y los comprobantes de tu turno. El sistema calculará automáticamente la diferencia.</Banda>
      <Tarjeta titulo="Resumen de operación">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 14 }}>
          <Bloque label="Saldo inicial" valor={fmtUSD(t.saldoInicial)} />
          <Bloque label="Ingresos" valor={fmtUSD(r.ingresos, true)} color="#2E7D32" sub={`${r.nIng} movimientos`} />
          <Bloque label="Egresos" valor={fmtUSD(-r.egresos)} color={C.error} sub={`${r.nEgr} movimientos`} />
          <Bloque label="Saldo esperado" valor={fmtUSD(r.esperado)} color={C.brand} fondo="#EEF2FA" />
        </div>
      </Tarjeta>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Tarjeta titulo="Declaración efectivo USD"><TablaConteo moneda="USD" conteo={conteo} onChange={setConteo} titulo="" /></Tarjeta>
        <Tarjeta titulo="Declaración efectivo CRC"><TablaConteo moneda="CRC" conteo={conteo} onChange={setConteo} titulo="" /></Tarjeta>
      </div>
      <Tarjeta titulo="Liquidación de comprobantes (datáfonos y otros)">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>{['Método', 'Detalle', 'CRC (₡)', 'USD ($)', 'Total USD'].map((x, i) => <th key={x} style={{ textAlign: i >= 2 ? 'right' : 'left', fontWeight: 400, color: C.n700, padding: '8px 10px', borderBottom: `1px solid ${C.n500}`, fontSize: 12 }}>{x}</th>)}</tr></thead>
          <tbody>
            {COMPROBANTES.map(k => (
              <tr key={k.k} style={{ borderBottom: `1px solid ${C.n500}` }}>
                <td style={{ padding: '8px 10px' }}>{k.metodo}</td><td style={{ padding: '8px 10px' }}>{k.detalle}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{k.moneda === 'CRC' ? inputMonto(k.k) : '—'}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{k.moneda === 'USD' ? inputMonto(k.k) : '—'}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmtUSD(k.moneda === 'CRC' ? comp[k.k] / TC : comp[k.k])}</td>
              </tr>
            ))}
            <tr style={{ background: '#EEF2FA' }}><td colSpan={4} style={{ padding: '10px', fontWeight: 600 }}>Total comprobantes</td><td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>{fmtUSD(totalComp)}</td></tr>
          </tbody>
        </table>
        <p style={{ margin: 0, fontSize: 11.5, color: C.n700 }}>Los montos vienen precargados con lo registrado en el sistema; corrígelos con el cierre de lote de cada datáfono.</p>
      </Tarjeta>
      <Tarjeta>
        <span style={{ fontSize: 13 }}>Observaciones del turno <span style={{ color: C.n700 }}>(opcional)</span></span>
        <TextArea value={obs} onChange={setObs} rows={3} placeholder="Ej.: Turno sin incidencias." />
      </Tarjeta>
    </PaginaFact>
  );
}

// ── Resumen de cierre de turno + firma ──────────────────────────────────────
export function ResumenCierre({ ir, toast, turnoId, decl, obs }: P & { turnoId: string; decl: Declaracion; obs: string }) {
  const h = useHotel();
  const t = h.turnos.find(x => x.id === turnoId)!;
  const r = resumenTurno(h, t);
  const tot = totalesDeclarados(decl);
  const dif = r2(tot.total - r.esperado);
  const conDif = Math.abs(dif) >= 0.01;
  const [motivo, setMotivo] = useState('');
  const [detalles, setDetalles] = useState('');
  const [firmar, setFirmar] = useState(false);
  const [error, setError] = useState('');
  const ahora = useAhora();
  const seguir = () => {
    if (conDif && (!motivo || !detalles.trim())) return setError('Indica el motivo y los detalles de la diferencia.');
    setError(''); setFirmar(true);
  };
  const cerrar = () => {
    h.cerrarTurno(turnoId, { fin: ahoraHotel(), conteo: decl.conteo, comprobantes: decl.comprobantes, esperado: r.esperado, declarado: tot.total, diferencia: dif, motivo: conDif ? motivo : undefined, detalles: conDif ? detalles.trim() : undefined, observaciones: obs, firmadoPor: t.cajero });
    toast('Turno cerrado. El reporte se envió a contabilidad.');
    ir({ v: 'turnoCerrado', turnoId });
  };
  const hora = ahora?.slice(11, 16) ?? '';
  return (
    <PaginaFact titulo={`Resumen de cierre · ${t.cajero}`} izquierda={<Volver onClick={() => ir({ v: 'arqueo', turnoId, decl, obs })} />}
      pie={<><Button variant="secondary" onClick={() => ir({ v: 'arqueo', turnoId, decl, obs })}>Cancelar</Button>
        <Button onClick={seguir} style={conDif ? { background: C.error, borderColor: C.error } : undefined}>{conDif ? 'Firmar y cerrar con diferencia' : 'Firmar y cerrar turno →'}</Button></>}>
      {conDif ? <Banda tono="error"><b>Diferencia detectada: {fmtUSD(dif)} ({dif < 0 ? 'faltante' : 'sobrante'})</b></Banda>
        : <Banda tono="ok"><b>Tu caja cuadra perfectamente.</b> No se detectaron diferencias. Puedes proceder al cierre.</Banda>}
      <Tarjeta titulo="Desglose">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <Renglon l="D1 · Total comprobantes (tarjetas + transferencias)" v={fmtUSD(tot.d1)} />
            <Renglon l="D2 · Total efectivo USD declarado" v={fmtUSD(tot.d2)} />
            <Renglon l="D3 · Total efectivo CRC (equiv. USD)" v={fmtUSD(tot.d3)} />
            <Renglon l="Total declarado" v={fmtUSD(tot.total)} fuerte />
          </div>
          <div>
            <Renglon l="Saldo inicial del turno" v={fmtUSD(t.saldoInicial)} />
            <Renglon l="Total operado neto" v={<span style={{ color: '#2E7D32' }}>{fmtUSD(r.ingresos - r.egresos, true)}</span>} />
            <Renglon l="Saldo esperado" v={fmtUSD(r.esperado)} fuerte />
          </div>
        </div>
        <Linea l="Diferencia final (sobrante / faltante)" v={`${fmtUSD(dif)}${conDif ? '' : ' ✓'}`} verde={!conDif} rojo={conDif} bold />
      </Tarjeta>
      {conDif && <Tarjeta titulo="Justificación de diferencia">
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>Motivo
          <Select value={motivo} onChange={setMotivo} options={[{ value: '', label: 'Seleccionar motivo' }, ...MOTIVOS_DIFERENCIA.map(m => ({ value: m, label: m }))]} /></label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>Detalles<TextArea value={detalles} onChange={setDetalles} rows={3} placeholder="Describe lo ocurrido" /></label>
      </Tarjeta>}
      {conDif && <Banda tono="warn">El cierre con diferencia será notificado al Cajero Responsable ({RESPONSABLE}) y al administrador. El monto {dif < 0 ? 'faltante' : 'sobrante'} quedará registrado en tu historial.</Banda>}
      {error && <Banda tono="error">{error}</Banda>}
      {firmar && <FirmaModal titulo="Firma de cierre de turno" sub={`Firma digital · ${t.cajero} · ${fmtF(HOY)} ${hora}`} firmante={t.cajero} onClose={() => setFirmar(false)} onFirmar={cerrar}
        confirmar="Firmar y cerrar turno" peligro={conDif}
        resumen={<div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <div><div style={{ fontSize: 12, color: C.n700 }}>Cierre del turno {t.inicio.slice(11, 16)}–{hora}</div><div style={{ fontSize: 13, marginTop: 4 }}>{r.movs.length} movimientos · {fmtUSD(r.ingresos)} ingresos · {fmtUSD(r.egresos)} egresos</div></div>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 12, color: C.n700 }}>Diferencia</div><b style={{ color: conDif ? C.error : C.brand }}>{fmtUSD(dif)}{conDif ? '' : ' ✓'}</b></div>
        </div>}
        aviso="Al firmar, declaras que el conteo es correcto. Una vez cerrado, no podrás modificar movimientos. El reporte será enviado a contabilidad." />}
    </PaginaFact>
  );
}
export function TurnoCerrado({ ir, turnoId }: P & { turnoId: string }) {
  const h = useHotel();
  const t = h.turnos.find(x => x.id === turnoId)!;
  const r = resumenTurno(h, t);
  const [ver, setVer] = useState(false);
  const { imprimir, portal } = usePrint();
  const conDif = Math.abs(t.diferencia) >= 0.01;
  return (
    <PaginaFact titulo="Caja" izquierda={<span style={{ marginLeft: 8 }}><VerComo /></span>}>
      <Tarjeta style={{ alignItems: 'center', textAlign: 'center', padding: '44px 20px', gap: 10 }}>
        <Check />
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 600 }}>Turno cerrado exitosamente</h2>
        <p style={{ margin: 0, color: C.n700, fontSize: 13, maxWidth: 560, lineHeight: 1.6 }}>Tu turno del {fmtF(t.inicio.slice(0, 10))} {t.inicio.slice(11, 16)}–{t.fin?.slice(11, 16)} quedó registrado. El siguiente cajero podrá abrir su turno ahora.</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <Button variant="secondary" onClick={() => setVer(true)}>Ver reporte</Button>
          <Button variant="secondary" onClick={() => imprimir(<TicketTurno t={t} />)}>Imprimir cierre</Button>
          <Button onClick={() => ir({ v: 'inicio', tab: esResponsable(h.sesion) ? 'Historial de turnos' : 'Mis turnos anteriores' })}>Ir a mis turnos</Button>
        </div>
      </Tarjeta>
      <Tarjeta titulo="Resumen del turno cerrado">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 14 }}>
          <Bloque label="Duración" valor={fmtDuracion(minutosEntre(t.inicio, t.fin!))} />
          <Bloque label="Movimientos" valor={r.movs.length} sub={`${r.nIng} ingresos · ${r.nEgr} egresos`} />
          <Bloque label="Total operado neto" valor={fmtUSD(r.ingresos - r.egresos, true)} color="#2E7D32" />
          <Bloque label="Diferencia" valor={`${fmtUSD(t.diferencia)}${conDif ? '' : ' ✓'}`} color={conDif ? C.error : '#2E7D32'} fondo={conDif ? 'rgba(244,67,54,.05)' : 'rgba(76,175,80,.08)'} />
        </div>
      </Tarjeta>
      <Banda tono="ok" style={{ alignSelf: 'flex-start' }}>El reporte de cierre fue enviado a contabilidad (Seven Accounting)</Banda>
      {ver && <Visor titulo="Cierre de turno" sub={t.cajero} ancho={640} onClose={() => setVer(false)}><TicketTurno t={t} /></Visor>}
      {portal}
    </PaginaFact>
  );
}
