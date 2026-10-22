'use client';
import { useState, useRef, useEffect } from 'react';
import { C, radius } from '@/components/ui/tokens';
import { BRAND, CUENTAS, type Cuenta, F, type RangoCuentas } from './datos';
import { MiniCuentaCombo } from './piezas';

// ── CuentaFiltroUnico - un solo filtro: busca por código/nombre, una cuenta o un rango ──
export function CuentaFiltroUnico({ cuenta, rango, onSelectCuenta, onSelectRango, onClear }: {
  cuenta: Cuenta|null; rango: RangoCuentas|null;
  onSelectCuenta:(c:Cuenta)=>void; onSelectRango:(r:RangoCuentas)=>void; onClear:()=>void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'una'|'rango'>(rango ? 'rango' : 'una');
  const [nivel, setNivel] = useState<'detalle'|'auxiliar'>('detalle');
  const [rDesde, setRDesde] = useState<Cuenta|null>(rango?.desde ?? null);
  const [rHasta, setRHasta] = useState<Cuenta|null>(rango?.hasta ?? null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const elegibles = CUENTAS.filter(c => c.nivel === nivel);
  const filtered = elegibles.filter(c =>
    !q || c.code.toLowerCase().includes(q.toLowerCase()) || c.nombre.toLowerCase().includes(q.toLowerCase())
  );

  const label = rango ? `Rango: ${rango.desde.code} → ${rango.hasta.code}`
    : cuenta ? `Cuenta: ${cuenta.code}`
    : 'Todas las cuentas';

  function aplicarRango() {
    if (rDesde && rHasta) {
      const [a,b] = rDesde.code <= rHasta.code ? [rDesde,rHasta] : [rHasta,rDesde];
      onSelectRango({ desde:a, hasta:b });
      setOpen(false);
    }
  }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={()=>{ setQ(''); setOpen(v=>!v); }}
        style={{ height:34, padding:'0 14px', border:`1px solid ${(cuenta||rango)?BRAND:C.n500}`, borderRadius:radius.md,
          background:(cuenta||rango)?C.brandBg:'#FFFFFF', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:6,
          color:(cuenta||rango)?BRAND:'#0F0F0F', fontFamily:F, fontWeight:(cuenta||rango)?500:400, maxWidth:280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {label}
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink:0 }}><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
      </button>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:500, background:'#FFFFFF',
          border:`1px solid ${C.n500}`, borderRadius:radius.lg, boxShadow:'0 8px 32px rgba(0,0,0,.16)', width:460, fontFamily:F }}>

          <div style={{ padding:'10px 14px', borderBottom:`1px solid ${C.n500}` }}>
            <p style={{ fontSize:12, fontWeight:600, margin:'0 0 8px' }}>Seleccionar cuenta</p>

            {/* Pestañas de nivel */}
            <div style={{ display:'flex', gap:4, marginBottom:8 }}>
              {(['detalle','auxiliar'] as const).map(n=>(
                <button key={n} onClick={()=>setNivel(n)}
                  style={{ height:26, padding:'0 12px', border:`1px solid ${nivel===n?BRAND:C.n500}`, borderRadius:radius.pill,
                    background:nivel===n?BRAND:'#FFFFFF', color:nivel===n?'#FFFFFF':'#0F0F0F', cursor:'pointer', fontSize:11, fontFamily:F, fontWeight:nivel===n?600:400 }}>
                  {n==='detalle'?'Detalle':'Auxiliar'}
                </button>
              ))}
            </div>

            {/* Una cuenta / Rango tabs - mutuamente excluyentes */}
            <div style={{ display:'flex', borderBottom:`2px solid ${C.n500}` }}>
              {(['una','rango'] as const).map(t=>(
                <button key={t} onClick={()=>setTab(t)}
                  style={{ height:30, padding:'0 12px', border:'none', background:'none', cursor:'pointer', fontSize:12, fontFamily:F,
                    color:tab===t?BRAND:'#0F0F0F', borderBottom:`2px solid ${tab===t?BRAND:'transparent'}`, marginBottom:-2, fontWeight:tab===t?600:400 }}>
                  {t==='una'?'Una cuenta':'Rango de cuentas'}
                </button>
              ))}
            </div>
          </div>

          {tab === 'una' && (
            <>
              <div style={{ padding:'10px 14px 0' }}>
                <div style={{ position:'relative' }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.3" style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)' }}><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l-2-2"/></svg>
                  <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por código o nombre…" aria-label="Buscar por código o nombre…"
                    style={{ width:'100%', height:32, paddingLeft:26, paddingRight:8, border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                </div>
              </div>
              <div style={{ maxHeight:220, overflowY:'auto', padding:'6px 0 4px' }}>
                <div onClick={()=>{ onClear(); setOpen(false); }}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', cursor:'pointer', background: (!cuenta&&!rango) ? C.brandBg:'#FFFFFF', fontSize:12, fontFamily:F, color: (!cuenta&&!rango)?BRAND:C.n700 }}
                  onMouseEnter={e=>(e.currentTarget.style.background=C.n200)} onMouseLeave={e=>(e.currentTarget.style.background=(!cuenta&&!rango)?C.brandBg:'#FFFFFF')}>
                  <span>Todas las cuentas</span>
                  {!cuenta && !rango && <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={BRAND} strokeWidth="2.5" strokeLinecap="round"><path d="M2 7l3.5 3.5L12 3"/></svg>}
                </div>
                {filtered.map(ct=>{
                  const isSel = cuenta?.code === ct.code;
                  return (
                    <div key={ct.code} onClick={()=>{ onSelectCuenta(ct); setOpen(false); }}
                      style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 14px', cursor:'pointer', fontSize:12, fontFamily:F,
                        background:isSel?C.brandBg:'#FFFFFF' }}
                      onMouseEnter={e=>(e.currentTarget.style.background=C.n200)} onMouseLeave={e=>(e.currentTarget.style.background=isSel?C.brandBg:'#FFFFFF')}>
                      <div style={{ display:'flex', gap:10, minWidth:0 }}>
                        <span style={{ color:BRAND, fontWeight:600, minWidth:110, flexShrink:0 }}>{ct.code}</span>
                        <span style={{ color:'#0F0F0F', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ct.nombre}</span>
                      </div>
                      {isSel && <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={BRAND} strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0}}><path d="M2 7l3.5 3.5L12 3"/></svg>}
                    </div>
                  );
                })}
                {filtered.length===0 && <p style={{ padding:'10px 14px', fontSize:12, color:C.n700, margin:0 }}>Sin resultados</p>}
              </div>
            </>
          )}

          {tab === 'rango' && (
            <div style={{ padding:'12px 14px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <label style={{ fontSize:11, color:C.n700, display:'block', marginBottom:4 }}>Desde</label>
                  <MiniCuentaCombo cuentas={elegibles} value={rDesde} onSelect={setRDesde} placeholder="Buscar…"/>
                </div>
                <div>
                  <label style={{ fontSize:11, color:C.n700, display:'block', marginBottom:4 }}>Hasta</label>
                  <MiniCuentaCombo cuentas={elegibles} value={rHasta} onSelect={setRHasta} placeholder="Buscar…"/>
                </div>
              </div>
              {rDesde && rHasta && (() => {
                const [a,b] = rDesde.code <= rHasta.code ? [rDesde,rHasta] : [rHasta,rDesde];
                const n = elegibles.filter(c=>c.code>=a.code && c.code<=b.code).length;
                return (
                  <div style={{ marginTop:10, padding:'7px 10px', background:C.brandBg, borderRadius:radius.sm, fontSize:11, color:BRAND }}>
                    {a.code} → {b.code} · {n} cuenta{n!==1?'s':''}
                  </div>
                );
              })()}
            </div>
          )}

          <div style={{ padding:'8px 14px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
            <button onClick={()=>setOpen(false)} style={{ height:28, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#FFFFFF', cursor:'pointer', fontSize:11, fontFamily:F }}>Cancelar</button>
            {tab==='rango' && (
              <button onClick={aplicarRango} disabled={!rDesde || !rHasta}
                style={{ height:28, padding:'0 12px', border:'none', borderRadius:radius.sm, background:(rDesde&&rHasta)?BRAND:C.n500, color:'#FFFFFF', cursor:(rDesde&&rHasta)?'pointer':'default', fontSize:11, fontWeight:500, fontFamily:F }}>
                Aplicar rango
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
