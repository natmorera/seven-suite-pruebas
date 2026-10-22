'use client';
// Dashboard › Operativo › Cupos garantizados: listado de los cupos guardados el día elegido (contrato, tipo de
// habitación, habitaciones por día y hasta cuándo) y de los que empiezan en los próximos 30 días.
import Link from 'next/link';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { IcEdit } from '@/components/configuracion/kit';
import { C, FONT, radius } from '@/components/suite/tokens';
import { useConfig } from '@/components/configuracion/store';
import { cuposDe, tramosCupos } from '@/components/configuracion/cupos';
import { sumar } from '@/components/configuracion/tarifario';
import { Panel } from '@/components/hotel/ui';
import { Ext } from './piezas';

const fmt = (d: string) => d.split('-').reverse().join('/');
const DIAS_PROXIMOS = 30;
const PRONTO = 7;
/** Filas visibles antes de «Ver todos». */
const LIMITE = 5;
const diasEntre = (a: string, b: string) => Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000);

interface Fila { tipo: string; tarifa: string; cupos: number; desde: string; hasta: string; cambio?: { dia: string; cupos: number } }

export function CuposGarantizados({ dia }: { dia: string }) {
  const { datos } = useConfig();
  const { tarifas, tiposHab, contratos, tarifario } = datos;
  const tramos = tramosCupos(tarifario);
  const nombreTarifa = (id: string) => tarifas.find(t => t.id === id)?.nombre ?? id;
  const contrato = (tarifa: string) => contratos.find(c => c.tarifa === nombreTarifa(tarifa));
  const tipo = (id: string) => tiposHab.find(t => t.id === id);
  const [todosV, setTodosV] = useState(false);
  const [todosP, setTodosP] = useState(false);

  // Vigentes hoy: desde el inicio del bloque continuo de días con cupos hasta su último día.
  const vigentes: Fila[] = [...new Set(tramos.filter(t => t.desde <= dia && t.hasta >= dia).map(t => `${t.tipo}|${t.tarifa}`))].map(k => {
    const [tp, ta] = k.split('|');
    const cupos = cuposDe(tarifario, tp, ta, dia);
    let desde = dia, hasta = dia, cambio: Fila['cambio'];
    while (cuposDe(tarifario, tp, ta, sumar(desde, -1)) > 0 && diasEntre(desde, dia) < 730) desde = sumar(desde, -1);
    while (cuposDe(tarifario, tp, ta, sumar(hasta, 1)) > 0 && diasEntre(dia, hasta) < 730) {
      hasta = sumar(hasta, 1);
      const n = cuposDe(tarifario, tp, ta, hasta);
      if (!cambio && n !== cupos) cambio = { dia: hasta, cupos: n };
    }
    return { tipo: tp, tarifa: ta, cupos, desde, hasta, cambio };
  }).sort((a, b) => a.hasta.localeCompare(b.hasta) || (contrato(a.tarifa)?.nombre ?? '').localeCompare(contrato(b.tarifa)?.nombre ?? ''));

  const limite = sumar(dia, DIAS_PROXIMOS);
  const proximos = tramos.filter(t => t.desde > dia && t.desde <= limite
    && cuposDe(tarifario, t.tipo, t.tarifa, sumar(t.desde, -1)) === 0)
    .sort((a, b) => a.desde.localeCompare(b.desde));

  const total = vigentes.reduce((s, f) => s + f.cupos, 0);
  const nContratos = new Set(vigentes.map(f => f.tarifa)).size;

  const enlace = (href: string, txt: string) => (
    <Link href={href} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: C.brand, textDecoration: 'none' }}>{txt} <Ext /></Link>
  );
  const nombreContrato = (ta: string) => (
    <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <span style={{ color: C.n900, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contrato(ta)?.nombre ?? nombreTarifa(ta)}</span>
      {contrato(ta) && <span style={{ fontSize: 11.5, color: C.n700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contrato(ta)!.codigo}{contrato(ta)!.nombre !== nombreTarifa(ta) && ` · tarifa ${nombreTarifa(ta)}`}</span>}
    </span>
  );
  const accion = (ta: string) => {
    const c = contrato(ta);
    return (
      <td style={{ ...td, textAlign: 'center', padding: '4px 6px' }}>
        {c && <Link href={`/configuracion/tarifas-contratos?tab=Contratos&contrato=${c.id}&pestana=cupos`} title="Ver y editar los cupos del contrato" aria-label={`Ver cupos de ${c.nombre}`}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: radius.control, color: C.brand }} className="suite-fila"><IcEdit /></Link>}
      </td>
    );
  };
  const verTodos = (n: number, abierto: boolean, set: (b: boolean) => void) => n > LIMITE && (
    <button type="button" onClick={() => set(!abierto)} style={{ alignSelf: 'flex-start', border: 'none', background: 'none', padding: 0, color: C.brand, fontSize: 12.5, fontFamily: FONT, cursor: 'pointer' }}>
      {abierto ? 'Ver menos' : `Ver todos (${n})`}
    </button>
  );
  const nombreTipo = (tp: string) => <>{tipo(tp)?.nombre ?? tp}<span style={{ color: C.n700 }}> · {tipo(tp)?.codigo}</span></>;

  return (
    <Panel titulo="Cupos garantizados" sub={`${fmt(dia)} · ${total} ${total === 1 ? 'habitación guardada' : 'habitaciones guardadas'} en ${nContratos} ${nContratos === 1 ? 'contrato' : 'contratos'}`}
      acciones={<span style={{ display: 'inline-flex', gap: 16 }}>{enlace('/configuracion/tarifas-contratos?tab=Contratos', 'Contratos')}{enlace('/configuracion/tarifas-contratos?tab=Tarifario', 'Tarifario')}</span>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: FONT }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Tabla headers={['Contrato', 'Tipo de habitación', 'Cupos por día', 'Desde', 'Guardados hasta', 'Quedan', '']} derecha={[2, 5]} scroll={todosV}>
          {vigentes.length === 0 && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: C.n700, padding: 20 }}>No hay cupos guardados este día.</td></tr>}
          {(todosV ? vigentes : vigentes.slice(0, LIMITE)).map(f => {
            const quedan = diasEntre(dia, f.hasta) + 1;
            const pronto = quedan <= PRONTO;
            return (
              <tr key={f.tipo + f.tarifa}>
                <td style={td}>{nombreContrato(f.tarifa)}</td>
                <td style={td}>{nombreTipo(f.tipo)}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <b style={{ fontWeight: 600, fontSize: 13 }}>{f.cupos}</b>
                  {f.cambio && <div style={{ fontSize: 11.5, color: C.n700 }}>{f.cambio.cupos} desde el {fmt(f.cambio.dia)}</div>}
                </td>
                <td style={td}>{fmt(f.desde)}</td>
                <td style={{ ...td, fontWeight: 500 }}>{fmt(f.hasta)}</td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 500, padding: '2px 8px', borderRadius: radius.pill,
                    background: pronto ? 'rgba(238,179,0,.16)' : C.n200, color: pronto ? '#8A6500' : C.n900 }}>
                    {quedan} {quedan === 1 ? 'día' : 'días'}
                  </span>
                </td>
                {accion(f.tarifa)}
              </tr>
            );
          })}
        </Tabla>
        {verTodos(vigentes.length, todosV, setTodosV)}
        </div>

        {proximos.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Empiezan en los próximos {DIAS_PROXIMOS} días</span>
            <Tabla headers={['Contrato', 'Tipo de habitación', 'Cupos por día', 'Desde', 'Hasta', 'Empieza en', '']} derecha={[2, 5]} scroll={todosP}>
              {(todosP ? proximos : proximos.slice(0, LIMITE)).map(t => {
                const en = diasEntre(dia, t.desde);
                return (
                  <tr key={t.tipo + t.tarifa + t.desde}>
                    <td style={td}>{nombreContrato(t.tarifa)}</td>
                    <td style={td}>{nombreTipo(t.tipo)}</td>
                    <td style={{ ...td, textAlign: 'right' }}><b style={{ fontWeight: 600 }}>{t.cupos}</b></td>
                    <td style={td}>{fmt(t.desde)}</td>
                    <td style={td}>{fmt(t.hasta)}</td>
                    <td style={{ ...td, textAlign: 'right', color: C.n700, whiteSpace: 'nowrap' }}>{en} {en === 1 ? 'día' : 'días'}</td>
                    {accion(t.tarifa)}
                  </tr>
                );
              })}
            </Tabla>
            {verTodos(proximos.length, todosP, setTodosP)}
          </section>
        )}
      </div>
    </Panel>
  );
}

const td: CSSProperties = { padding: '9px 12px', fontSize: 12.5, borderTop: `1px solid ${C.n500}`, verticalAlign: 'middle', color: C.n900 };

/** Tabla de la tarjeta; con `scroll` (lista completa) el cuerpo tiene alto máximo y el encabezado queda fijo. */
function Tabla({ headers, derecha = [], scroll, children }: { headers: string[]; derecha?: number[]; scroll?: boolean; children: ReactNode }) {
  return (
    <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: scroll ? 'auto' : 'hidden', maxHeight: scroll ? 380 : undefined }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT, tableLayout: 'fixed' }}>
        <colgroup><col style={{ width: '29%' }} /><col style={{ width: '23%' }} /><col style={{ width: '12%' }} /><col /><col /><col style={{ width: '10%' }} /><col style={{ width: 44 }} /></colgroup>
        <thead><tr>{headers.map((h, i) => (
          <th key={i} style={{ padding: '8px 12px', fontSize: 11.5, fontWeight: 500, color: C.n700, background: C.n200, textAlign: derecha.includes(i) ? 'right' : 'left', position: 'sticky', top: 0, zIndex: 1 }}>{h}</th>
        ))}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
