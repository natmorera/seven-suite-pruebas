'use client';
// Tarifario › Actualización masiva: en un solo formulario se elige el período (y los días de la semana),
// los tipos de habitación y las tarifas, y qué cambia: el precio por noche y / o los pax adicionales
// en una de dos modalidades: un precio base de adulto y niño para cada adicional, o el desglose con un precio
// por persona adicional (las personas sin fila no cambian), y los cupos garantizados de esos días.
// Los cambios quedan como valores por día en el Tarifario.
import { Fragment, useMemo, useState } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Select } from '@/components/suite/ui';
import { Campo, IcTrash, IconButton, ModalBase } from '../kit';
import type { Tarifa, TipoHab } from '../datos';
import { adicionalesDe, clave, dow, sumar, valor, vistaPax, type Mapa } from '../tarifario';
import { LinkBtn, ListaChecks, Nota, Num, OPS, Seccion, aplicarOp, num, type Op } from './ActualizacionPiezas';

const COLS = 'minmax(0, 1fr) 160px 160px 28px';

export interface ResultadoMasivo { mapa: Mapa; tarifas: Tarifa[]; mensaje: string }

/** Orden de las casillas de días (Dom primero); el número es el índice de DIAS (Lun = 0). */
const DIAS_SEMANA: [number, string][] = [[6, 'Dom'], [0, 'Lun'], [1, 'Mar'], [2, 'Mié'], [3, 'Jue'], [4, 'Vie'], [5, 'Sáb']];

export function ActualizacionColectiva({ inicio, tarifas, todas, tipos, mapa, seleccionInicial, onClose, onAplicar }: {
  inicio: string; tarifas: Tarifa[]; todas: Tarifa[]; tipos: TipoHab[]; mapa: Mapa; seleccionInicial: string[];
  onClose: () => void; onAplicar: (r: ResultadoMasivo) => void;
}) {
  const pares0 = seleccionInicial.map(x => x.split('|'));
  const [selTipos, setSelTipos] = useState<string[]>(() => [...new Set(pares0.map(([tp]) => tp))].filter(id => tipos.some(t => t.id === id)));
  const [selTarifas, setSelTarifas] = useState<string[]>(() => [...new Set(pares0.map(([, ta]) => ta))].filter(id => tarifas.some(t => t.id === id)));
  const [desde, setDesde] = useState(inicio);
  const [hasta, setHasta] = useState(sumar(inicio, 29));
  const [dias, setDias] = useState<number[]>([]);
  const [op, setOp] = useState<Op>('fijar');
  const [monto, setMonto] = useState('');
  const [paxBase, setPaxBase] = useState({ adulto: '', nino: '' });
  const [cupos, setCupos] = useState('');
  const [desglose, setDesglose] = useState(false);
  const [escalones, setEscalones] = useState<{ adulto: string; nino: string }[]>([{ adulto: '', nino: '' }]);
  const [error, setError] = useState('');

  const tiposSel = tipos.filter(t => selTipos.includes(t.id));
  const maxEsc = Math.max(1, ...(tiposSel.length ? tiposSel : tipos).map(adicionalesDe));
  const bases = new Set(tiposSel.map(t => t.base ?? 2));
  const baseComun = bases.size === 1 ? [...bases][0] : null;
  const fechas = useMemo(() => {
    const out: string[] = [];
    if (!desde || !hasta || hasta < desde) return out;
    for (let d = desde; d <= hasta && out.length < 800; d = sumar(d, 1)) if (!dias.length || dias.includes(dow(d))) out.push(d);
    return out;
  }, [desde, hasta, dias]);

  const guardar = () => {
    if (!desde || !hasta) return setError('Indica las fechas desde y hasta.');
    if (hasta < desde) return setError('La fecha hasta no puede ser anterior a la fecha desde.');
    if (!selTipos.length || !selTarifas.length) return setError('Selecciona al menos un tipo de habitación y una tarifa.');
    // Un campo vacío no cambia ese valor: se actualiza lo que tenga datos.
    const v = num(monto);
    const base = { adulto: num(paxBase.adulto), nino: num(paxBase.nino) };
    const esc = desglose ? escalones.map(e => ({ adulto: num(e.adulto), nino: num(e.nino) })) : [];
    if (desglose) { base.adulto = null; base.nino = null; }
    const precioOn = v !== null;
    const paxOn = base.adulto !== null || base.nino !== null || esc.some(e => e.adulto !== null || e.nino !== null);
    const nCupos = cupos.trim() === '' ? null : Math.max(0, Math.round(Number(cupos)));
    if (!precioOn && !paxOn && nCupos === null) return setError('Ingresa el valor de la tarifa, un precio de pax adicional o los cupos.');
    if (!fechas.length) return setError('El período no incluye ninguno de los días marcados.');

    const m: Mapa = {};
    let sinPrecio = 0;
    for (const d of fechas) for (const tp of tiposSel) for (const ta of selTarifas) {
      const t = tarifas.find(x => x.id === ta)!;
      if (precioOn) {
        const actual = valor(t, tp.id, d, 'Tarifas', todas, mapa);
        const n = aplicarOp(typeof actual === 'number' ? actual : null, op, v!);
        if (n === null) sinPrecio++; else m[clave(tp.id, ta, d, 'Tarifas')] = n;
      }
      if (nCupos !== null) m[clave(tp.id, ta, d, 'Cupos')] = nCupos;
      if (paxOn) {
        // Cada persona adicional que admite el tipo: el precio de su fila del desglose o, si no tiene, el base.
        for (let i = 1; i <= adicionalesDe(tp); i++) {
          const adulto = desglose ? esc[i - 1]?.adulto ?? null : base.adulto, nino = desglose ? esc[i - 1]?.nino ?? null : base.nino;
          if (adulto !== null) m[clave(tp.id, ta, d, vistaPax('adulto', i))] = adulto;
          if (nino !== null) m[clave(tp.id, ta, d, vistaPax('nino', i))] = nino;
        }
      }
    }
    const partes = `${selTarifas.length} ${selTarifas.length === 1 ? 'tarifa' : 'tarifas'} × ${tiposSel.length} ${tiposSel.length === 1 ? 'tipo' : 'tipos'} × ${fechas.length} ${fechas.length === 1 ? 'día' : 'días'}`;
    onAplicar({ mapa: m, tarifas: todas, mensaje: `Tarifario actualizado: ${partes}${sinPrecio ? ` (${sinPrecio} sin precio base no cambiaron)` : ''}` });
  };
  const limpiar = <T,>(f: (v: T) => void) => (v: T) => { f(v); setError(''); };
  const opActual = OPS.find(o => o.id === op)!;
  const moneda = tarifas[0]?.moneda.startsWith('CRC') ? '₡' : '$';

  return (
    <ModalBase titulo="Actualización masiva" onClose={onClose} ancho={820} altoMax="96vh"
      pie={<>
        {error && <span role="alert" style={{ marginRight: 'auto', fontSize: 12, color: C.error }}>{error}</span>}
        <Button onClick={guardar}>Guardar</Button>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Campo label="Desde"><Input type="date" value={desde} onChange={limpiar(setDesde)} /></Campo>
          <Campo label="Hasta"><Input type="date" value={hasta} min={desde} onChange={limpiar(setHasta)} /></Campo>
        </div>
        <div role="group" aria-label="Días de la semana" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          {DIAS_SEMANA.map(([i, l]) => (
            <Checkbox key={i} label={l} checked={dias.includes(i)} onChange={b => { setDias(x => (b ? [...x, i] : x.filter(y => y !== i))); setError(''); }} />
          ))}
        </div>
        <Nota>{dias.length ? `${fechas.length} ${fechas.length === 1 ? 'día' : 'días'} en el período.` : `Sin días marcados se aplica a todos los días del período (${fechas.length}).`}</Nota>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <ListaChecks titulo="Tipo de habitación" alto={200} sel={selTipos} onChange={limpiar(setSelTipos)}
            items={tipos.map(t => ({ id: t.id, label: t.nombre.toUpperCase(), nota: `${t.base ?? 2} pax incluidos · máx. ${t.max ?? 4}` }))} />
          <ListaChecks titulo="Tarifa" alto={200} sel={selTarifas} onChange={limpiar(setSelTarifas)}
            items={tarifas.map(t => {
              const madre = t.derivaDe ? todas.find(x => x.id === t.derivaDe) : undefined;
              return { id: t.id, label: t.nombre, resaltado: !!madre, nota: madre ? `Derivada de ${madre.nombre}` : undefined };
            })} />
        </div>

        <Seccion titulo="Precio por noche">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Campo label="Actualizar"><Select value={op} onChange={v => { setOp(v as Op); setError(''); }} options={OPS.map(o => ({ value: o.id, label: o.label }))} /></Campo>
            <Campo label={opActual.campo}><Num value={monto} onChange={limpiar(setMonto)} label={opActual.campo} afijo={op.endsWith('Pct') ? '%' : moneda} /></Campo>
          </div>
        </Seccion>

        <Seccion titulo="Pax adicionales">
          {!desglose && (
            <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 8, alignItems: 'center', fontSize: 12 }}>
              <span /><span style={{ fontSize: 11, color: C.n700 }}>Precio adulto adicional</span><span style={{ fontSize: 11, color: C.n700 }}>Precio niño adicional</span><span />
              <span>Precio base <span style={{ color: C.n700 }}>· cada pax adicional</span></span>
              <Num value={paxBase.adulto} onChange={v => { setPaxBase(x => ({ ...x, adulto: v })); setError(''); }} label="Precio base adulto adicional" afijo={moneda} />
              <Num value={paxBase.nino} onChange={v => { setPaxBase(x => ({ ...x, nino: v })); setError(''); }} label="Precio base niño adicional" afijo={moneda} />
              <span />
            </div>
          )}
          <Checkbox checked={desglose} label="Hacer desglose por pax adicional" onChange={b => {
            // Al activar el desglose, las filas vacías arrancan con el precio base que ya se había escrito.
            if (b) setEscalones(xs => xs.map(x => ({ adulto: x.adulto || paxBase.adulto, nino: x.nino || paxBase.nino })));
            setDesglose(b); setError('');
          }} />
          {desglose && (
            <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, background: C.n200, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 8, alignItems: 'center', fontSize: 12 }}>
                <span /><span style={{ fontSize: 11, color: C.n700 }}>Precio adulto adicional</span><span style={{ fontSize: 11, color: C.n700 }}>Precio niño adicional</span><span />
                {escalones.map((e, i) => {
                  const aplica = tiposSel.filter(t => adicionalesDe(t) >= i + 1);
                  const parcial = tiposSel.length > 0 && aplica.length < tiposSel.length;
                  return (
                    <Fragment key={i}>
                      <span style={{ minWidth: 0 }}>
                        Pax adicional {i + 1} <span style={{ color: C.n700 }}>({baseComun !== null ? `Total: ${baseComun + i + 1}` : `incluidos + ${i + 1}`})</span>
                        {parcial && <span title={aplica.map(t => t.nombre).join(', ')} style={{ display: 'block', fontSize: 11, color: C.n700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Solo {aplica.map(t => t.nombre).join(', ')}</span>}
                      </span>
                      <Num value={e.adulto} onChange={v => { setEscalones(xs => xs.map((x, j) => (j === i ? { ...x, adulto: v } : x))); setError(''); }} label={`Precio adulto adicional ${i + 1}`} afijo={moneda} />
                      <Num value={e.nino} onChange={v => { setEscalones(xs => xs.map((x, j) => (j === i ? { ...x, nino: v } : x))); setError(''); }} label={`Precio niño adicional ${i + 1}`} afijo={moneda} />
                      {escalones.length > 1
                        ? <IconButton label={`Quitar pax adicional ${i + 1}`} tono="peligro" onClick={() => setEscalones(xs => xs.filter((_, j) => j !== i))}><IcTrash /></IconButton>
                        : <span />}
                    </Fragment>
                  );
                })}
              </div>
              {escalones.length < maxEsc && (
                <LinkBtn onClick={() => setEscalones(xs => [...xs, { adulto: '', nino: '' }])}>+ Agregar pax adicional ({escalones.length} de {maxEsc})</LinkBtn>
              )}
            </div>
          )}
        </Seccion>

        <Seccion titulo="Cupos garantizados">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
            <Campo label="Cupos por día" hint="Habitaciones de cada tipo que se guardan para la tarifa en esos días. 0 quita el cupo.">
              <Input type="number" min={0} value={cupos} placeholder="Sin cambio" onChange={limpiar(setCupos)} />
            </Campo>
          </div>
        </Seccion>
      </div>
    </ModalBase>
  );
}
