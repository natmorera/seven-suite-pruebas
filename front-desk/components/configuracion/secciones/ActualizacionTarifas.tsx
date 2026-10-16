'use client';
// Tarifario → Actualización colectiva.
// 1) Se elige primero A QUÉ se aplica: matriz tarifa × tipo de habitación
//    (por fila, por columna o celda a celda; también llega preseleccionada
//    desde la grilla). 2) QUÉ cambia: precio por noche (fijar, subir o bajar
//    por monto o %), pax adicionales (un precio base por adicional o desglose
//    por escalón) y restricciones. 3) CUÁNDO: un período con días de la semana,
//    o «Permanente», que cambia la tarifa misma sin abrirlas una por una.
//    Antes de aplicar se ve el resumen y una vista previa actual → nuevo.
import { Fragment, useMemo, useState } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Modal } from '@/components/suite/ui';
import { DIAS, type Tarifa, type TipoHab } from '../datos';
import { adicionalesDe, clave, dow, sumar, valor, vistaPax, type Mapa } from '../tarifario';
import { Bloque, Cambio, CampoFecha, Casilla, Chip, LinkBtn, Nota, Num, OPS, Paso, aplicarOp, corto, finDeMes, num, selectS, tdP, thM, type Op, type Tri } from './ActualizacionPiezas';

export interface ResultadoMasivo { mapa: Mapa; tarifas: Tarifa[]; mensaje: string }

export function ActualizacionColectiva({ inicio, tarifas, todas, tipos, mapa, seleccionInicial, onClose, onAplicar }: {
  inicio: string; tarifas: Tarifa[]; todas: Tarifa[]; tipos: TipoHab[]; mapa: Mapa; seleccionInicial: string[];
  onClose: () => void; onAplicar: (r: ResultadoMasivo) => void;
}) {
  // ── 1. Selección (tipo|tarifa) ─────────────────────────────────────────────
  const [sel, setSel] = useState<string[]>(seleccionInicial);
  const [q, setQ] = useState('');
  const filas = tarifas.filter(t => !q.trim() || t.nombre.toLowerCase().includes(q.trim().toLowerCase()));
  const k = (tp: string, ta: string) => `${tp}|${ta}`;
  const tiene = (tp: string, ta: string) => sel.includes(k(tp, ta));
  const poner = (ks: string[], on: boolean) => setSel(s => (on ? [...new Set([...s, ...ks])] : s.filter(x => !ks.includes(x))));
  const todasK = filas.flatMap(t => tipos.map(tp => k(tp.id, t.id)));
  const estado = (ks: string[]) => (ks.length && ks.every(x => sel.includes(x)) ? 'todo' : ks.some(x => sel.includes(x)) ? 'parcial' : 'nada');

  // ── 2. Cambios ─────────────────────────────────────────────────────────────
  const [alcance, setAlcance] = useState<'periodo' | 'permanente'>('periodo');
  const [desde, setDesde] = useState(inicio);
  const [hasta, setHasta] = useState(sumar(inicio, 29));
  const [dias, setDias] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [precioOn, setPrecioOn] = useState(true);
  const [op, setOp] = useState<Op>('fijar');
  const [monto, setMonto] = useState('');
  const [paxOn, setPaxOn] = useState(false);
  const [paxModo, setPaxModo] = useState<'base' | 'escalones'>('base');
  const [paxBase, setPaxBase] = useState({ adulto: '', nino: '' });
  const maxEsc = Math.max(1, ...tipos.map(adicionalesDe));
  const [escalones, setEscalones] = useState<{ adulto: string; nino: string }[]>([{ adulto: '', nino: '' }, { adulto: '', nino: '' }]);
  const [restrOn, setRestrOn] = useState(false);
  const [restr, setRestr] = useState<{ cerrar: Tri; cta: Tri; ctd: Tri; estMin: string; estMax: string }>({ cerrar: '', cta: '', ctd: '', estMin: '', estMax: '' });
  const [error, setError] = useState('');

  const pares = sel.map(x => x.split('|') as [string, string]).filter(([tp, ta]) => tipos.some(t => t.id === tp) && tarifas.some(t => t.id === ta));
  const tarifasSel = [...new Set(pares.map(([, ta]) => ta))].map(id => tarifas.find(t => t.id === id)!);
  const tiposSel = [...new Set(pares.map(([tp]) => tp))];
  const fechas = useMemo(() => {
    const out: string[] = [];
    if (!desde || !hasta || hasta < desde) return out;
    for (let d = desde; d <= hasta && out.length < 800; d = sumar(d, 1)) if (dias.includes(dow(d))) out.push(d);
    return out;
  }, [desde, hasta, dias]);
  const derivadasSel = tarifasSel.filter(t => t.derivaDe);
  const vMonto = num(monto);
  const basesIguales = new Set(tipos.filter(t => tiposSel.includes(t.id)).map(t => t.base ?? 2)).size <= 1;
  const baseComun = tipos.find(t => tiposSel.includes(t.id))?.base ?? 2;

  /** Calcula el resultado sin aplicarlo (sirve para la vista previa y para guardar). */
  const calcular = (): ResultadoMasivo & { celdas: number; omitidas: number; error?: string } => {
    const vacio = { mapa: {}, tarifas: todas, mensaje: '', celdas: 0, omitidas: 0 };
    if (!pares.length) return { ...vacio, error: 'Selecciona al menos una tarifa y un tipo de habitación.' };
    if (!precioOn && !paxOn && !restrOn) return { ...vacio, error: 'Activa al menos un cambio: precio, pax adicionales o restricciones.' };
    if (precioOn && vMonto === null) return { ...vacio, error: 'Ingresa el valor del precio.' };
    const esc = escalones.map(e => ({ adulto: num(e.adulto), nino: num(e.nino) }));
    const pb = { adulto: num(paxBase.adulto), nino: num(paxBase.nino) };
    if (paxOn && (paxModo === 'base' ? pb.adulto === null && pb.nino === null : esc.every(e => e.adulto === null && e.nino === null))) return { ...vacio, error: 'Ingresa al menos un precio de pax adicional.' };
    const rMin = num(restr.estMin), rMax = num(restr.estMax);
    if (restrOn && alcance === 'periodo' && !restr.cerrar && !restr.cta && !restr.ctd && rMin === null && rMax === null) return { ...vacio, error: 'Elige al menos una restricción a cambiar.' };
    if (restrOn && alcance === 'permanente' && rMin === null && rMax === null) return { ...vacio, error: 'Indica la estancia mínima o máxima.' };

    if (alcance === 'permanente') {
      let celdas = 0, omitidas = 0;
      const nuevas = todas.map(t => {
        if (!tarifasSel.some(x => x.id === t.id)) return t;
        const tps = pares.filter(([, ta]) => ta === t.id).map(([tp]) => tp);
        let n: Tarifa = structuredClone(t);
        if (precioOn) {
          if (t.derivaDe) omitidas += tps.length;
          else tps.forEach(tp => { const v = aplicarOp(t.base[tp] ?? null, op, vMonto!); if (v === null) omitidas++; else { n.base = { ...n.base, [tp]: v }; celdas++; } });
        }
        if (paxOn) {
          n = { ...n, extras: paxModo === 'base'
            ? { ...n.extras, derivar: false, modo: 'base', adulto: pb.adulto ?? n.extras.adulto, nino: pb.nino ?? n.extras.nino }
            : { ...n.extras, derivar: false, modo: 'escalones', escalones: esc.map((e, i) => ({ adulto: e.adulto ?? n.extras.escalones?.[i]?.adulto ?? n.extras.adulto, nino: e.nino ?? n.extras.escalones?.[i]?.nino ?? n.extras.nino })) } };
          celdas++;
        }
        if (restrOn) { n = { ...n, restricciones: { estMin: rMin ?? n.restricciones.estMin, estMax: rMax ?? n.restricciones.estMax } }; celdas++; }
        return n;
      });
      return { mapa: {}, tarifas: nuevas, celdas, omitidas, mensaje: `${tarifasSel.length} ${tarifasSel.length === 1 ? 'tarifa actualizada' : 'tarifas actualizadas'} de forma permanente` };
    }

    if (!fechas.length) return { ...vacio, error: 'El período no incluye ninguno de los días elegidos.' };
    const m: Mapa = {};
    let celdas = 0;
    const sinPrecio = new Set<string>();
    for (const d of fechas) for (const [tp, ta] of pares) {
      const t = tarifas.find(x => x.id === ta)!;
      const tipo = tipos.find(x => x.id === tp)!;
      if (precioOn) {
        const actual = valor(t, tp, d, 'Tarifas', todas, mapa);
        const v = aplicarOp(typeof actual === 'number' ? actual : null, op, vMonto!);
        if (v === null) sinPrecio.add(`${tp}|${ta}`); else { m[clave(tp, ta, d, 'Tarifas')] = v; celdas++; }
      }
      if (paxOn) {
        const n = adicionalesDe(tipo);
        for (let i = 1; i <= n; i++) {
          const e = paxModo === 'base' ? pb : esc[i - 1];
          if (!e) continue; // el escalón no está definido: queda como estaba
          if (e.adulto !== null) m[clave(tp, ta, d, vistaPax('adulto', i))] = e.adulto;
          if (e.nino !== null) m[clave(tp, ta, d, vistaPax('nino', i))] = e.nino;
        }
        celdas++;
      }
      if (restrOn) {
        ([['Cerrar ventas', restr.cerrar], ['CTA', restr.cta], ['CTD', restr.ctd]] as const).forEach(([v, x]) => { if (x) m[clave(tp, ta, d, v)] = x === 'si'; });
        if (rMin !== null) m[clave(tp, ta, d, 'Estancia Min')] = rMin;
        if (rMax !== null) m[clave(tp, ta, d, 'Estancia Max')] = rMax;
        celdas++;
      }
    }
    return { mapa: m, tarifas: todas, celdas, omitidas: sinPrecio.size, mensaje: `Tarifario actualizado: ${tarifasSel.length} ${tarifasSel.length === 1 ? 'tarifa' : 'tarifas'} × ${tiposSel.length} ${tiposSel.length === 1 ? 'tipo' : 'tipos'} × ${fechas.length} días` };
  };
  const res = calcular();
  const aplicar = () => { if (res.error) return setError(res.error); onAplicar(res); };

  // Vista previa: primer día del período (o la tarifa en sí) por combinación
  const dia0 = alcance === 'periodo' ? fechas[0] : inicio;
  const previa = pares.slice(0, 40).map(([tp, ta]) => {
    const t = tarifas.find(x => x.id === ta)!, tn = res.tarifas.find(x => x.id === ta) ?? t, tipo = tipos.find(x => x.id === tp)!;
    const antes = dia0 ? valor(t, tp, dia0, 'Tarifas', todas, mapa) : null;
    const despues = dia0 ? valor(tn, tp, dia0, 'Tarifas', res.tarifas, { ...mapa, ...res.mapa }) : null;
    const paxA = dia0 ? valor(t, tp, dia0, 'Adulto Extra', todas, mapa) : null;
    const paxD = dia0 ? valor(tn, tp, dia0, 'Adulto Extra', res.tarifas, { ...mapa, ...res.mapa }) : null;
    return { id: `${tp}|${ta}`, tarifa: t.nombre, tipo: tipo.nombre, antes, despues, paxA, paxD, derivada: !!t.derivaDe };
  });
  const presetDias = (d: number[]) => setDias(d);
  const rangoTxt = alcance === 'permanente' ? 'Permanente' : fechas.length ? `${corto(desde)} – ${corto(hasta)} · ${fechas.length} días` : 'Sin días';

  return (
    <Modal open title="Actualización colectiva" onClose={onClose} width={1160}
      footer={<>
        <span style={{ marginRight: 'auto', alignSelf: 'center', fontSize: 12, color: res.error ? C.n700 : C.n900 }} aria-live="polite">
          {res.error ? (pares.length ? 'Completa los cambios para ver el resumen.' : 'Empieza seleccionando a qué tarifas y tipos aplicas el cambio.')
            : <><b style={{ fontWeight: 600 }}>{tarifasSel.length}</b> {tarifasSel.length === 1 ? 'tarifa' : 'tarifas'} · <b style={{ fontWeight: 600 }}>{tiposSel.length}</b> {tiposSel.length === 1 ? 'tipo' : 'tipos'} · {rangoTxt}{res.omitidas ? <span style={{ color: '#B45309' }}> · {res.omitidas} {res.omitidas === 1 ? 'combinación' : 'combinaciones'} sin precio base no {res.omitidas === 1 ? 'cambia' : 'cambian'} de precio</span> : null}</>}
        </span>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={aplicar} disabled={!pares.length}>{alcance === 'permanente' ? 'Guardar en las tarifas' : `Aplicar a ${pares.length} ${pares.length === 1 ? 'combinación' : 'combinaciones'}`}</Button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px', gap: 20, alignItems: 'start', fontFamily: FONT }}>
        {/* ── 1. ¿A qué? ───────────────────────────────────────────────── */}
        <section aria-label="Selección" style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <Paso n={1} titulo="¿A qué tarifas y tipos de habitación?" sub={`${pares.length} de ${tarifas.length * tipos.length} combinaciones seleccionadas`} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar tarifa" aria-label="Buscar tarifa" className="suite-campo"
              style={{ flex: 1, height: 32, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 10px', fontSize: 12, fontFamily: FONT, outline: 'none' }} />
            <Button variant="ghost" onClick={() => poner(todasK, true)}>Seleccionar todo</Button>
            <Button variant="ghost" onClick={() => setSel([])} disabled={!sel.length}>Limpiar</Button>
          </div>
          <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'auto', maxHeight: 520 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ ...thM, textAlign: 'left', left: 0, zIndex: 3, width: 210, minWidth: 210 }}>
                    <Casilla estado={estado(todasK)} label="Seleccionar todas las combinaciones" onChange={b => poner(todasK, b)} /> <span style={{ marginLeft: 6 }}>Tarifa</span>
                  </th>
                  {tipos.map(tp => {
                    const col = filas.map(t => k(tp.id, t.id));
                    return (
                      <th key={tp.id} style={{ ...thM, minWidth: 70, verticalAlign: 'top' }} title={`${tp.nombre} · ${tp.base ?? 2} pax incluidos, máx. ${tp.max ?? 4}`}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <Casilla estado={estado(col)} label={`Seleccionar ${tp.nombre} en todas las tarifas`} onChange={b => poner(col, b)} />
                          <span style={{ maxWidth: 96, lineHeight: 1.25, textAlign: 'center' }}>{tp.nombre}</span>
                          <span style={{ fontSize: 11, color: C.n700, fontWeight: 400 }}>{tp.codigo} · máx {tp.max ?? 4}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filas.length === 0 && <tr><td colSpan={tipos.length + 1} style={{ padding: 20, textAlign: 'center', color: C.n700 }}>Ninguna tarifa coincide.</td></tr>}
                {filas.map(t => {
                  const fila = tipos.map(tp => k(tp.id, t.id));
                  const madre = t.derivaDe ? todas.find(x => x.id === t.derivaDe) : undefined;
                  return (
                    <tr key={t.id} style={{ borderTop: `1px solid ${C.n500}` }}>
                      <td style={{ padding: '6px 10px', position: 'sticky', left: 0, background: C.n000, zIndex: 1 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Casilla estado={estado(fila)} label={`Seleccionar ${t.nombre} en todos los tipos`} onChange={b => poner(fila, b)} />
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }} title={t.nombre}>{t.nombre}</span>
                            {madre && <span style={{ fontSize: 10.5, color: C.n700 }}>Deriva de {madre.nombre} ({t.ajustePct > 0 ? '+' : ''}{t.ajustePct}%{t.ajusteImporte ? ` ${t.ajusteImporte > 0 ? '+' : ''}${t.ajusteImporte}` : ''})</span>}
                          </span>
                        </span>
                      </td>
                      {tipos.map(tp => {
                        const on = tiene(tp.id, t.id);
                        const sinPrecio = valor(t, tp.id, inicio, 'Tarifas', todas, mapa) === null;
                        return (
                          <td key={tp.id} style={{ textAlign: 'center', padding: 0, background: on ? C.brandBg : undefined }}>
                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40, cursor: 'pointer' }} title={sinPrecio ? 'Sin precio base para este tipo' : undefined}>
                              <Casilla estado={on ? 'todo' : 'nada'} label={`${t.nombre} · ${tp.nombre}`} onChange={b => poner([k(tp.id, t.id)], b)} />
                              {sinPrecio && <span style={{ fontSize: 10.5, color: C.n700, marginLeft: 4 }}>s/p</span>}
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {derivadasSel.length > 0 && (
            <p style={{ margin: 0, fontSize: 11.5, color: C.n700, lineHeight: 1.5 }}>
              Las tarifas derivadas se recalculan solas cuando cambia su tarifa madre. Si las seleccionas, el cambio de precio {alcance === 'permanente' ? 'no se aplica (cambia la madre o su ajuste)' : 'queda como excepción en esos días'}.
            </p>
          )}
          {/* Vista previa */}
          {pares.length > 0 && !res.error && (
            <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: C.n200, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                <b style={{ fontWeight: 600 }}>Vista previa</b><span style={{ color: C.n700 }}>{alcance === 'permanente' ? 'Precio de la tarifa' : dia0 ? `Primer día: ${corto(dia0)}` : ''}</span>
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead><tr>{['Tarifa', 'Tipo', 'Precio', 'Adulto adicional'].map(h => <th key={h} style={{ ...thM, position: 'static', textAlign: 'left', fontWeight: 400, color: C.n700 }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {previa.map(p => (
                      <tr key={p.id} style={{ borderTop: `1px solid ${C.n500}` }}>
                        <td style={tdP}>{p.tarifa}</td><td style={tdP}>{p.tipo}</td>
                        <td style={tdP}><Cambio a={p.antes} b={p.despues} /></td>
                        <td style={tdP}><Cambio a={p.paxA} b={p.paxD} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ── 2. ¿Qué cambia y cuándo? ─────────────────────────────────── */}
        <section aria-label="Cambios" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Paso n={2} titulo="¿Cuándo aplica?" />
          <div role="radiogroup" aria-label="Alcance" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: `1px solid ${C.n500}`, borderRadius: radius.control, overflow: 'hidden' }}>
            {([['periodo', 'En un período', 'Excepciones por día'], ['permanente', 'Permanente', 'Cambia la tarifa']] as const).map(([id, l, d]) => (
              <button key={id} type="button" role="radio" aria-checked={alcance === id} onClick={() => setAlcance(id)}
                style={{ padding: '8px 10px', border: 'none', background: alcance === id ? C.brandBg : C.n000, color: alcance === id ? C.brand : C.n900, cursor: 'pointer', fontFamily: FONT, textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600 }}>{l}</span><span style={{ fontSize: 11, color: C.n700 }}>{d}</span>
              </button>
            ))}
          </div>
          {alcance === 'periodo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <CampoFecha label="Desde" value={desde} onChange={setDesde} />
                <CampoFecha label="Hasta" value={hasta} onChange={setHasta} min={desde} />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {([['Próx. 30 días', inicio, sumar(inicio, 29)], ['Resto del mes', inicio, finDeMes(inicio)], ['Próximo mes', sumar(finDeMes(inicio), 1), finDeMes(sumar(finDeMes(inicio), 1))], ['Hasta fin de año', inicio, `${inicio.slice(0, 4)}-12-31`]] as const).map(([l, a, b]) => (
                  <Chip key={l} on={desde === a && hasta === b} onClick={() => { setDesde(a); setHasta(b); }}>{l}</Chip>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }} role="group" aria-label="Días de la semana">
                {DIAS.map((d, i) => <Chip key={d} on={dias.includes(i)} onClick={() => setDias(x => (x.includes(i) ? x.filter(y => y !== i) : [...x, i]))} cuadrado>{d}</Chip>)}
                <span style={{ width: 8 }} />
                <LinkBtn onClick={() => presetDias([0, 1, 2, 3, 4, 5, 6])}>Todos</LinkBtn>
                <LinkBtn onClick={() => presetDias([0, 1, 2, 3, 4])}>Lun–Vie</LinkBtn>
                <LinkBtn onClick={() => presetDias([4, 5])}>Vie–Sáb</LinkBtn>
              </div>
            </div>
          )}

          <Paso n={3} titulo="¿Qué cambia?" />
          <Bloque titulo="Precio por noche" on={precioOn} onChange={setPrecioOn}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: 8 }}>
              <select value={op} onChange={e => setOp(e.target.value as Op)} aria-label="Operación de precio" className="suite-campo" style={selectS}>
                {OPS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <Num value={monto} onChange={setMonto} label="Valor del precio" afijo={OPS.find(o => o.id === op)!.afijo} />
            </div>
            {alcance === 'permanente' && <Nota>Cambia el precio base de las tarifas no derivadas. Las derivadas se ajustan solas.</Nota>}
          </Bloque>

          <Bloque titulo="Pax adicionales" on={paxOn} onChange={setPaxOn}>
            <div role="radiogroup" aria-label="Modo de pax adicionales" style={{ display: 'flex', gap: 6 }}>
              <Chip on={paxModo === 'base'} onClick={() => setPaxModo('base')}>Precio base por adicional</Chip>
              <Chip on={paxModo === 'escalones'} onClick={() => setPaxModo('escalones')}>Desglose por escalón</Chip>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 96px 96px 28px', gap: 6, alignItems: 'center', fontSize: 12 }}>
              <span /><span style={{ fontSize: 11, color: C.n700 }}>Adulto</span><span style={{ fontSize: 11, color: C.n700 }}>Niño</span><span />
              {paxModo === 'base' ? (
                <>
                  <span>Cada pax adicional</span>
                  <Num value={paxBase.adulto} onChange={v => setPaxBase(p => ({ ...p, adulto: v }))} label="Precio adulto adicional" afijo="$" />
                  <Num value={paxBase.nino} onChange={v => setPaxBase(p => ({ ...p, nino: v }))} label="Precio niño adicional" afijo="$" />
                  <span />
                </>
              ) : escalones.map((e, i) => (
                <Fragment key={i}>
                  <span>Pax adicional {i + 1} <span style={{ color: C.n700 }}>({basesIguales ? `total ${baseComun + i + 1}` : `incluidos + ${i + 1}`})</span></span>
                  <Num value={e.adulto} onChange={v => setEscalones(xs => xs.map((x, j) => (j === i ? { ...x, adulto: v } : x)))} label={`Adulto adicional ${i + 1}`} afijo="$" />
                  <Num value={e.nino} onChange={v => setEscalones(xs => xs.map((x, j) => (j === i ? { ...x, nino: v } : x)))} label={`Niño adicional ${i + 1}`} afijo="$" />
                  <button type="button" aria-label={`Quitar escalón ${i + 1}`} disabled={escalones.length === 1} onClick={() => setEscalones(xs => xs.filter((_, j) => j !== i))}
                    style={{ width: 28, height: 28, border: `1px solid ${C.n500}`, borderRadius: radius.control, background: C.n000, color: C.error, cursor: escalones.length === 1 ? 'default' : 'pointer', opacity: escalones.length === 1 ? 0.4 : 1 }}>×</button>
                </Fragment>
              ))}
            </div>
            {paxModo === 'escalones' && escalones.length < maxEsc && <LinkBtn onClick={() => setEscalones(xs => [...xs, { adulto: '', nino: '' }])}>+ Agregar escalón</LinkBtn>}
            <Nota>{paxModo === 'base' ? 'El mismo precio para cada persona adicional, en todos los tipos seleccionados.' : 'Los escalones se aplican solo a las habitaciones que admiten esa cantidad de pax adicionales. Un campo vacío no cambia ese valor.'}</Nota>
          </Bloque>

          <Bloque titulo="Disponibilidad y restricciones" on={restrOn} onChange={setRestrOn}>
            {alcance === 'periodo' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {([['cerrar', 'Cerrar ventas'], ['cta', 'CTA (llegada)'], ['ctd', 'CTD (salida)']] as const).map(([id, l]) => (
                  <label key={id} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: C.n700 }}>{l}
                    <select value={restr[id]} onChange={e => setRestr(r => ({ ...r, [id]: e.target.value as Tri }))} className="suite-campo" style={selectS}>
                      <option value="">Sin cambio</option><option value="si">{id === 'cerrar' ? 'Cerrar' : 'Activar'}</option><option value="no">{id === 'cerrar' ? 'Abrir' : 'Quitar'}</option>
                    </select>
                  </label>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: C.n700 }}>Estancia mínima<Num value={restr.estMin} onChange={v => setRestr(r => ({ ...r, estMin: v }))} label="Estancia mínima" afijo="noches" sufijo /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: C.n700 }}>Estancia máxima<Num value={restr.estMax} onChange={v => setRestr(r => ({ ...r, estMax: v }))} label="Estancia máxima" afijo="noches" sufijo /></label>
            </div>
          </Bloque>
          {error && res.error && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>{res.error}</p>}
        </section>
      </div>
    </Modal>
  );
}
