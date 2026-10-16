'use client';
import { ReactNode, CSSProperties } from 'react';
import { fmtNum } from './formato';
import { C } from './tokens';

// ── Celda de monto alineada ───────────────────────────────────────────────────
// Regla transversal (explícita): el símbolo de moneda SIEMPRE a la izquierda,
// fijo; la cifra SIEMPRE alineada a la derecha, aunque el número sea chico.
// Ej.: "$   100.00" - el símbolo no se mueve, la cifra se pega al borde derecho.
export function MoneyCell({
  n, sym = '₡', decimals = 2, style,
}: { n: number; sym?: string; decimals?: number; style?: CSSProperties }) {
  return (
    <span style={{ display: 'inline-flex', justifyContent: 'space-between', width: '100%', fontVariantNumeric: 'tabular-nums', ...style }}>
      <span>{sym}</span>
      <span>{fmtNum(n, decimals)}</span>
    </span>
  );
}
// ── Monto (valor ya formateado) ──────────────────────────────────────────────
// Misma regla que MoneyCell pero recibe la cifra ya formateada por la pantalla
// (cada una tiene su fmt: paréntesis para negativos, decimales, etc.). Ocupa el
// ancho de la celda: signo pegado a la izquierda, cifra pegada a la derecha.
// Usar el MISMO componente en la fila de totales garantiza que signo y cifra
// del total queden alineados con la columna que suma.
export function Monto({ sym = '₡', valor, style }: { sym?: ReactNode; valor: ReactNode; style?: CSSProperties }) {
  return (
    <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, width: '100%', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', ...style }}>
      <span>{sym}</span>
      <span>{valor}</span>
    </span>
  );
}
// ── Columnas de moneda con alineación garantizada ────────────────────────────
// Un <div> con flex/grid propio dentro de una sola <td> no alinea de forma
// confiable con la fila de Totales, porque cada fila calcula su ancho por
// separado. La forma robusta es usar DOS columnas reales de tabla (símbolo +
// cifra): el navegador garantiza que todas las <th>/<td> de la MISMA columna
// de un <table> midan exactamente lo mismo, así que el símbolo y la cifra
// quedan siempre alineados entre encabezado, datos y total.
export function MoneyHeaderCells({ label }: { label:string }) {
  return (
    <>
      <th style={{ width:16, padding:'10px 0 10px 12px' }}/>
      <th style={{ padding:'10px 12px 10px 0', textAlign:'right', fontWeight:500, color:C.n700, fontSize:11, whiteSpace:'nowrap' }}>{label}</th>
    </>
  );
}
export function MoneyCells({ sym, value, bold, color }: { sym:string; value:string; bold?:boolean; color?:string }) {
  return (
    <>
      <td style={{ padding:'8px 0 8px 12px' }}>{sym}</td>
      <td style={{ padding:'8px 12px 8px 0', textAlign:'right', fontWeight:bold?700:400, color:color??C.n900, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>{value}</td>
    </>
  );
}
export function MoneyCellsStack({ rows, bold }: { rows:{sym:string; value:string}[]; bold?:boolean }) {
  return (
    <>
      <td style={{ padding:'8px 0 8px 12px', verticalAlign:'top' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>{rows.map((r,i)=><span key={i}>{r.sym}</span>)}</div>
      </td>
      <td style={{ padding:'8px 12px 8px 0', textAlign:'right', fontWeight:bold?700:400, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>{rows.map((r,i)=><span key={i}>{r.value}</span>)}</div>
      </td>
    </>
  );
}
