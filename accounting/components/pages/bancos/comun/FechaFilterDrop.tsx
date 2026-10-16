'use client';
// Filtro de rango de fechas de las pantallas de Bancos: botón con el mismo
// estilo que FilterDropdown y un panel con «Desde» y «Hasta».
import { useState, useRef, useEffect } from 'react';
import { C, FONT, radius, shadow } from '../../../ui/tokens';

const F = FONT;
const BRAND = C.brand;

// Convierte una fecha dd/mm/aa de los datos de ejemplo en Date
export function parseFechaDDMMYY(s:string): Date|null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if(!m) return null;
  const [,d,mo,y] = m;
  return new Date(2000+parseInt(y), parseInt(mo)-1, parseInt(d));
}

export function FechaFilterDrop({ desde, hasta, onApply, onClear }:{
  desde:string; hasta:string; onApply:(desde:string,hasta:string)=>void; onClear:()=>void;
}) {
  const [open,setOpen] = useState(false);
  const [ld,setLd] = useState(desde);
  const [lh,setLh] = useState(hasta);
  const ref = useRef<HTMLDivElement>(null);
  const active = !!(desde||hasta);
  useEffect(()=>{
    function h(e:MouseEvent){if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);}
    function esc(e:KeyboardEvent){if(e.key==='Escape')setOpen(false);}
    if(open){document.addEventListener('mousedown',h);document.addEventListener('keydown',esc);}
    return ()=>{document.removeEventListener('mousedown',h);document.removeEventListener('keydown',esc);}
  },[open]);
  return (
    <div ref={ref} style={{position:'relative'}}>
      <button aria-expanded={open} onClick={()=>{setLd(desde);setLh(hasta);setOpen(v=>!v);}}
        style={{height:32,padding:'0 12px',border:`1px solid ${active?BRAND:C.n500}`,borderRadius:4,background:active?C.brandBg:'#FFFFFF',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',gap:5,fontFamily:F,color:active?BRAND:'#0F0F0F'}}>
        Fechas{active?` (${[desde,hasta].filter(Boolean).length})`:''}&nbsp;<svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
      </button>
      {open&&(
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,zIndex:300,background:'#FFFFFF',
          border:`1px solid ${C.n500}`,borderRadius:10,minWidth:220,boxShadow:shadow.panel,overflow:'hidden',fontFamily:F,padding:12}}>
          <p style={{fontSize:11,fontWeight:600,margin:'0 0 8px'}}>Rango de fechas</p>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <label style={{fontSize:11,color:'#757575'}}>Desde
              <input type="date" value={ld} onChange={e=>setLd(e.target.value)}
                style={{ width:'100%',height:30,marginTop:3,padding:'0 8px',border:'1px solid #ECECEC',borderRadius:radius.sm,fontSize:12,fontFamily:F,outline:'none',boxSizing:'border-box' }}/>
            </label>
            <label style={{fontSize:11,color:'#757575'}}>Hasta
              <input type="date" value={lh} onChange={e=>setLh(e.target.value)}
                style={{ width:'100%',height:30,marginTop:3,padding:'0 8px',border:'1px solid #ECECEC',borderRadius:radius.sm,fontSize:12,fontFamily:F,outline:'none',boxSizing:'border-box' }}/>
            </label>
          </div>
          <div style={{display:'flex',gap:8,marginTop:10}}>
            <button onClick={()=>{setLd('');setLh('');onClear();setOpen(false);}} style={{flex:1,height:30,border:`1px solid ${C.n500}`,borderRadius:7,background:'#FFFFFF',cursor:'pointer',fontSize:11,fontFamily:F}}>Limpiar</button>
            <button onClick={()=>{onApply(ld,lh);setOpen(false);}} style={{flex:1,height:30,border:'none',borderRadius:7,background:BRAND,color:'#FFFFFF',cursor:'pointer',fontSize:11,fontWeight:500,fontFamily:F}}>Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
}
