'use client';
import React, { useState } from 'react';
import { C } from '@/components/ui/tokens';
import { Pagination } from '@/components/ui/tabla';
import { F, type ToastType, fmtMontoDisplay, formatMontoTyping, parseMontoInput } from './datos';

// ── Footer de paginación funcional (Pendientes / Anulados) ─────────────────────
export function PaginationFooter({ total, porPagina, setPorPagina, pagina, setPagina }: {
  total: number; porPagina: number; setPorPagina: React.Dispatch<React.SetStateAction<number>>;
  pagina: number; setPagina: React.Dispatch<React.SetStateAction<number>>;
}) {
  return (
    <div style={{ background:'#FFFFFF', borderTop:`1px solid ${C.n500}`, padding:'8px 24px', flexShrink:0 }}>
      <Pagination page={pagina} pageSize={porPagina} total={total}
        onPageChange={setPagina} onPageSizeChange={setPorPagina}/>
    </div>
  );
}
export function ToastContainer({ toasts, onDismiss }: { toasts:{id:number;type:ToastType;msg:string}[]; onDismiss:(id:number)=>void }) {
  const COLORS: Record<ToastType,[string,string]> = { success:[C.success,C.successBg], error:[C.error,C.errorBg], info:['#378ADD','#EFF6FF'], warning:['#EF9F27','#FFFBEB'] };
  return (
    <div style={{ position:'fixed', bottom:48, right:20, display:'flex', flexDirection:'column', gap:8, zIndex:9999 }}>
      {toasts.map(t => {
        const [color,bg] = COLORS[t.type];
        return (
          <div key={t.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', background:bg, border:`1px solid ${color}30`, borderRadius:10, maxWidth:340, boxShadow:'0 4px 16px rgba(0,0,0,.12)', fontFamily:F }}>
            <span style={{ width:18,height:18,borderRadius:'50%',background:color,color:'#FFFFFF',fontSize:10.5,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>!</span>
            <span style={{ fontSize:12, color:'#0F0F0F', flex:1 }}>{t.msg}</span>
            <button onClick={()=>onDismiss(t.id)} aria-label="Cerrar notificación" title="Cerrar notificación" style={{ background:'none',border:'none',cursor:'pointer',color:'#757575',padding:0,fontSize:14 }}>×</button>
          </div>
        );
      })}
    </div>
  );
}
export function MontoInput({ value, onChange, style, decimals=2, placeholder }: { value: number; onChange: (v:number)=>void; style?: React.CSSProperties; decimals?: number; placeholder?: string }) {
  const [text, setText] = useState(fmtMontoDisplay(value, decimals));
  const [focused, setFocused] = useState(false);
  // Mientras no se edita, el campo muestra el valor formateado
  const mostrado = focused ? text : fmtMontoDisplay(value, decimals);
  return (
    <input type="text" inputMode="decimal" placeholder={placeholder ?? (0).toFixed(decimals)} aria-label={placeholder ?? (0).toFixed(decimals)} value={mostrado}
      onFocus={() => { setText(fmtMontoDisplay(value, decimals)); setFocused(true); }}
      onChange={e => { const display = formatMontoTyping(e.target.value, decimals); setText(display); onChange(parseMontoInput(display)); }}
      onBlur={() => { setFocused(false); setText(fmtMontoDisplay(value, decimals)); }}
      style={style}/>
  );
}
