'use client';
import React from 'react';
import { radius } from '@/components/ui/tokens';
import { type EstadoMov, F } from './datos';

export const ESTADO_MOV_ICON: Record<EstadoMov, React.ReactNode> = {
  Conciliado: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="rgba(29,158,117,.15)"/><path d="M5 8l2 2 4-4" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Futuro:     <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="rgba(59,130,246,.15)"/><circle cx="8" cy="8" r="2.5" fill="#3B82F6"/></svg>,
  Pendiente:  <div style={{ width:16, height:16, borderRadius:4, border:`1px solid #ECECEC`, background:'#FFFFFF' }}/>,
};
export function Pill({ children, color, bg }: { children:React.ReactNode; color:string; bg:string }) {
  return <span style={{ fontSize:11, padding:'3px 10px', borderRadius:radius.pill, fontWeight:500, color, background:bg, whiteSpace:'nowrap', fontFamily:F }}>{children}</span>;
}
