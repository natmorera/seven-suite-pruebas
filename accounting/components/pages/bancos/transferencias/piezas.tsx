'use client';
import React from 'react';
import { C, radius } from '../../../ui/tokens';
import { BRAND, F } from './datos';

export function Pill({ children, color, bg }: { children:React.ReactNode; color:string; bg:string }) {
  return <span style={{ fontSize:11, padding:'2px 9px', borderRadius:radius.pill, fontWeight:500, color, background:bg, whiteSpace:'nowrap', fontFamily:F }}>{children}</span>;
}
// ── Toggle de moneda compartido (antes duplicado en origen y destino) ──────────
export function MonedaToggle({ value, onChange }:{ value:'CRC'|'USD'; onChange:(m:'CRC'|'USD')=>void }) {
  return (
    <div style={{ display:'flex', gap:4 }}>
      {(['CRC','USD'] as const).map(m=>(
        <button key={m} onClick={()=>onChange(m)} style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:12, fontFamily:F, fontWeight:500, background:value===m?BRAND:C.n200, color:value===m?'#FFFFFF':'#0F0F0F' }}>
          {m==='CRC'?'¢ CRC':'$ USD'}
        </button>
      ))}
    </div>
  );
}
