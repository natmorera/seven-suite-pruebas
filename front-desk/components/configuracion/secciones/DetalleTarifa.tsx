'use client';
// Tarifario: panel lateral con todo lo de una tarifa en un día: precio, cupos, cierres (venta, llegada, salida),
// estancias y pax adicionales por tipo de habitación, con la explicación de cada concepto.
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, fmtNum, radius, shadow, Z } from '@/components/suite/tokens';
import { Button } from '@/components/suite/ui';
import { TERMINOS, type Tarifa } from '../datos';
import { adicionalesDe, sumar, valor, vistaPax, type Mapa, type Vista } from '../tarifario';

type Tipo = { id: string; nombre: string; codigo: string; base?: number; max?: number };

function Bloque({ titulo, children, extra }: { titulo: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: '.06em', color: C.n700 }}>{titulo.toUpperCase()}</h3>{extra}
      </div>
      {children}
    </section>
  );
}
const num = (v: number | boolean | null) => (typeof v === 'number' ? fmtNum(v) : '—');
const fmt = (d: string) => d.split('-').reverse().join('/');
const noches = (n: unknown) => `${n} ${n === 1 ? 'noche' : 'noches'}`;
const Chip = ({ on, si, no }: { on: boolean; si: string; no: string }) => (
  <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: radius.pill, whiteSpace: 'nowrap',
    background: on ? 'rgba(244,67,54,.10)' : 'rgba(76,175,80,.10)', color: on ? C.error : C.successDk }}>{on ? si : no}</span>
);

/** Fila de concepto: nombre, explicación debajo y valor a la derecha. */
const Concepto = ({ titulo, ayuda, children }: { titulo: string; ayuda: string; children: ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '2px 16px', padding: '9px 0', borderTop: `1px solid ${C.n200}`, alignItems: 'center' }}>
    <span style={{ fontSize: 12.5, color: C.n900, fontWeight: 500 }}>{titulo}</span>
    <span style={{ gridRow: 'span 2', textAlign: 'right', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>{children}</span>
    <span style={{ fontSize: 11.5, color: C.n700, lineHeight: 1.4 }}>{ayuda}</span>
  </div>
);

export function DetalleTarifa({ t, tarifas, tipos, mapa, dia: diaInicial, contratos = [], onClose, onEditar, onActualizar }: {
  t: Tarifa; tarifas: Tarifa[]; tipos: Tipo[]; mapa: Mapa; dia: string; contratos?: string[]; onClose: () => void; onEditar: () => void; onActualizar: () => void;
}) {
  const [dia, setDia] = useState(diaInicial);
  const [tipoId, setTipoId] = useState(tipos[0]?.id ?? '');
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const madre = t.derivaDe ? tarifas.find(x => x.id === t.derivaDe) : undefined;
  const v = (tp: string, vista: Vista) => valor(t, tp, dia, vista, tarifas, mapa);
  const tipo = tipos.find(x => x.id === tipoId) ?? tipos[0];
  const ajuste = t.metodo === 'Porcentaje'
    ? `${t.ajustePct > 0 ? '+' : ''}${t.ajustePct} %${t.ajusteImporte ? ` y ${t.ajusteImporte > 0 ? '+' : ''}${fmtNum(t.ajusteImporte)}` : ''}`
    : `${t.ajusteImporte > 0 ? '+' : ''}${fmtNum(t.ajusteImporte)}`;
  const th = { padding: '7px 8px', fontSize: 11, fontWeight: 500, color: C.n700, textAlign: 'right' as const, background: C.n200 };
  const td = { padding: '7px 8px', fontSize: 12, textAlign: 'right' as const, borderTop: `1px solid ${C.n500}`, fontVariantNumeric: 'tabular-nums' as const };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: Z.modal, fontFamily: FONT }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,15,15,.25)' }} />
      <aside role="dialog" aria-label={`Detalle de la tarifa ${t.nombre}`}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(600px, 100vw)', background: C.n000, boxShadow: shadow.modal, display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${C.n500}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: t.activo ? C.successDk : C.n700, background: t.activo ? 'rgba(76,175,80,.10)' : C.n200, borderRadius: radius.pill, padding: '2px 10px' }}>{t.activo ? 'Activa' : 'Inactiva'}</span>
            <span style={{ fontSize: 11.5, color: C.n700, background: C.n200, borderRadius: radius.pill, padding: '2px 10px' }}>{madre ? '🔗 Derivada' : 'Tarifa base'}</span>
            <button type="button" aria-label="Cerrar detalle" onClick={onClose} style={{ marginLeft: 'auto', border: 'none', background: 'none', fontSize: 18, color: C.n700, cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: C.n900 }}>{t.nombre}</h2>
          <span style={{ fontSize: 12, color: C.n700 }}>
            {t.moneda} · Estancia {t.restricciones.estMin}–{t.restricciones.estMax} noches
            {contratos.length > 0 && <> · Contratos: {contratos.join(', ')}</>}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Button variant="secondary" onClick={() => setDia(sumar(dia, -1))} title="Día anterior" style={{ minWidth: 32, padding: '0 8px' }}>‹</Button>
            <span style={{ fontSize: 12.5, fontWeight: 600, minWidth: 92, textAlign: 'center' }}>{fmt(dia)}</span>
            <Button variant="secondary" onClick={() => setDia(sumar(dia, 1))} title="Día siguiente" style={{ minWidth: 32, padding: '0 8px' }}>›</Button>
            <span style={{ fontSize: 11.5, color: C.n700, marginLeft: 6 }}>Valores de ese día, con los cambios hechos solo para ese día.</span>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <Bloque titulo="Cómo se calcula">
            <p style={{ margin: 0, fontSize: 12.5, color: C.n900, lineHeight: 1.5 }}>
              {madre
                ? <>Deriva de <b style={{ fontWeight: 600 }}>{madre.nombre}</b>: su precio con un ajuste de <b style={{ fontWeight: 600 }}>{ajuste}</b>.
                    {t.extras.derivar ? ` Los pax adicionales también se derivan (${t.extras.tipo === 'Porcentaje' ? `${t.extras.pct} %` : fmtNum(t.extras.importe)}).` : ' Los pax adicionales tienen precio propio.'}</>
                : <>Tarifa base: precio propio por tipo de habitación{t.extras.modo === 'escalones' ? ' y pax adicionales desglosados por escalón.' : ' y un mismo precio por cada pax adicional.'}</>}
            </p>
          </Bloque>

          <Bloque titulo="Todos los tipos · resumen del día">
            <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
                <thead><tr>
                  <th style={{ ...th, textAlign: 'left' }}>Tipo</th><th style={th}>Precio</th><th style={th}>Cupos</th><th style={{ ...th, textAlign: 'center' }}>Venta</th><th style={th}>Estancia</th>
                </tr></thead>
                <tbody>
                  {tipos.map(tp => {
                    const cerrado = v(tp.id, 'Cerrar ventas') === true, cta = v(tp.id, 'CTA') === true, ctd = v(tp.id, 'CTD') === true;
                    const activo = tp.id === tipo?.id;
                    return (
                      <tr key={tp.id} onClick={() => setTipoId(tp.id)} style={{ cursor: 'pointer', background: activo ? C.brandBg : undefined }} title="Ver el detalle de este tipo">
                        <td style={{ ...td, textAlign: 'left' }}>
                          <span style={{ color: activo ? C.brand : C.n900, fontWeight: activo ? 600 : 400 }}>{tp.nombre}</span>
                          <span style={{ color: C.n700 }}> · {tp.codigo}</span>
                        </td>
                        <td style={{ ...td, fontWeight: 600 }}>{num(v(tp.id, 'Tarifas'))}</td>
                        <td style={td}>{(v(tp.id, 'Cupos') as number) || '—'}</td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <span style={{ display: 'inline-flex', gap: 4 }}>
                            <Chip on={cerrado} si="Cerrada" no="Abierta" />
                            {cta && <Chip on si="CTA" no="" />}{ctd && <Chip on si="CTD" no="" />}
                          </span>
                        </td>
                        <td style={td}>{v(tp.id, 'Estancia Min') as number}–{v(tp.id, 'Estancia Max') as number}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Bloque>

          {tipo && (
            <Bloque titulo={`Detalle · ${tipo.nombre}`} extra={<span style={{ fontSize: 11.5, color: C.n700 }}>{tipo.base ?? 2} pax incluidos · máx. {tipo.max ?? 4}</span>}>
              <div>
                <Concepto titulo="Precio por noche" ayuda={TERMINOS.Tarifas}><b style={{ fontWeight: 600 }}>{num(v(tipo.id, 'Tarifas'))}</b></Concepto>
                <Concepto titulo="Cupos garantizados" ayuda={TERMINOS.Cupos}>{(v(tipo.id, 'Cupos') as number) || 'Sin cupos'}</Concepto>
                <Concepto titulo="Cerrar ventas" ayuda={TERMINOS['Cerrar ventas']}><Chip on={v(tipo.id, 'Cerrar ventas') === true} si="Cerrada" no="Abierta" /></Concepto>
                <Concepto titulo="CTA · llegada" ayuda={TERMINOS.CTA}><Chip on={v(tipo.id, 'CTA') === true} si="No se permite" no="Permitida" /></Concepto>
                <Concepto titulo="CTD · salida" ayuda={TERMINOS.CTD}><Chip on={v(tipo.id, 'CTD') === true} si="No se permite" no="Permitida" /></Concepto>
                <Concepto titulo="Estancia mínima" ayuda={TERMINOS['Estancia Min']}>{noches(v(tipo.id, 'Estancia Min'))}</Concepto>
                <Concepto titulo="Estancia máxima" ayuda={TERMINOS['Estancia Max']}>{noches(v(tipo.id, 'Estancia Max'))}</Concepto>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>Pax adicionales</span>
                <span style={{ fontSize: 11.5, color: C.n700, lineHeight: 1.4 }}>
                  Cargo por noche por cada persona por encima de las {tipo.base ?? 2} incluidas. El pax 1 es la primera persona adicional.
                </span>
                {adicionalesDe(tipo) === 0 ? <span style={{ fontSize: 12, color: C.n700 }}>Este tipo no admite personas adicionales.</span> : (
                  <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
                      <thead><tr><th style={{ ...th, textAlign: 'left' }}>Persona</th><th style={th}>Adulto</th><th style={th}>Niño</th></tr></thead>
                      <tbody>
                        {Array.from({ length: adicionalesDe(tipo) }, (_, i) => i + 1).map(n => (
                          <tr key={n}>
                            <td style={{ ...td, textAlign: 'left' }}>Pax {n} <span style={{ color: C.n700 }}>· {(tipo.base ?? 2) + n}.ª persona</span></td>
                            <td style={td}>{num(v(tipo.id, vistaPax('adulto', n)))}</td>
                            <td style={td}>{num(v(tipo.id, vistaPax('nino', n)))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Bloque>
          )}
        </div>

        <footer style={{ borderTop: `1px solid ${C.n500}`, padding: '12px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onActualizar}>Actualizar por período</Button>
          <Button onClick={onEditar}>Editar tarifa</Button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
