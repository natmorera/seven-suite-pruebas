'use client';
import { useState, useEffect, useRef } from 'react';
import { Modal } from '../../../ui/primitives';
import { Button, Input } from '../../../ui/formulario';
import { radius, shadow, C } from '../../../ui/tokens';
import { fmtNum } from '../../../ui/formato';
import { SearchInput } from '../../../ui/filtros';
import { IcSearch, IcCheck, IcClose, IcChevronDown } from '../../../ui/icons';
import { TIPOS_PL, TipoPL } from '../presupuestoData';
import { F } from './datos';

// Celda de monto editable: mientras se edita muestra el número "pelado" (fácil
// de escribir), y al salir del campo lo formatea con "," de miles y "." de
// decimales, siempre con 2 decimales - el mismo formato estándar de toda la
// app (ver fmtNum), que antes solo se aplicaba en la vista de solo lectura.
export function CeldaMonto({ value, onChange, disabled }: { value:number; onChange:(v:number)=>void; disabled?:boolean }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState('');
  const mostrado = editando ? texto : (value ? fmtNum(value, 2) : '');
  return (
    <input type="text" inputMode="decimal" value={mostrado} disabled={disabled}
      onFocus={()=>{ setEditando(true); setTexto(value ? String(value) : ''); }}
      onChange={e=>setTexto(e.target.value)}
      onBlur={()=>{ setEditando(false); onChange(parseFloat(texto.replace(/,/g,'')) || 0); }}
      style={{ position:'relative', zIndex:0, width:110,height:26,padding:'0 6px',textAlign:'right',border:`1px solid ${C.n500}`,borderRadius:4,fontSize:12,fontFamily:F,
        color:value<0?C.error:C.n900,background:'#FFFFFF',outline:'none' }}
      onFocusCapture={e=>{ e.target.style.borderColor=C.brand; e.target.style.boxShadow=`0 0 0 2px ${C.brandBg}`; }}
      onBlurCapture={e=>{ e.target.style.borderColor=C.n500; e.target.style.boxShadow='none'; }} />
  );
}
// ── Filtro "Tipo" (Costos/Gastos/Ingresos) - toggle de selección múltiple ────
// La spec pide selección múltiple con resaltado ámbar el activo, aunque en las
// capturas se veía dibujado como radios de selección única.
export function TipoToggle({ value, onChange, disabled }: { value: Set<TipoPL>; onChange:(v:Set<TipoPL>)=>void; disabled?: boolean }) {
  function toggle(t: TipoPL) {
    if (disabled) return;
    const next = new Set(value);
    next.has(t) ? next.delete(t) : next.add(t);
    onChange(next);
  }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ fontSize:12, color:C.n700, fontFamily:F }}>Tipo:</span>
      {TIPOS_PL.map(t => {
        const active = value.has(t.value);
        return (
          <button key={t.value} type="button" onClick={()=>toggle(t.value)} disabled={disabled}
            style={{ height:28, padding:'0 12px', borderRadius:radius.pill, border:`1px solid ${active?C.brand:C.n500}`,
              background:active?C.brandBg:'#FFFFFF', color:active?C.brand:C.n700, fontSize:12, fontWeight:active?600:400,
              fontFamily:F, cursor:disabled?'not-allowed':'pointer', whiteSpace:'nowrap', opacity:disabled?.6:1 }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
// ── Filtro de selección múltiple anclado al botón (popover), no modal
// centrado - así se ve igual que en la captura de referencia: el panel
// "cuelga" debajo del botón activo en vez de tapar toda la pantalla.
export function FiltroMultiSelect({ label, items, selected, onApply }: {
  label:string; items:{ id:string; label:string; count?:number }[]; selected:Set<string>; onApply:(s:Set<string>)=>void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [temp, setTemp] = useState<Set<string>>(new Set(selected));
  const ref = useRef<HTMLDivElement>(null);
  const active = selected.size>0 && selected.size<items.length;

  useEffect(() => {
    function onClickFuera(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function onEsc(e: KeyboardEvent) { if (e.key==='Escape') setOpen(false); }
    if (open) { document.addEventListener('mousedown', onClickFuera); document.addEventListener('keydown', onEsc); }
    return () => { document.removeEventListener('mousedown', onClickFuera); document.removeEventListener('keydown', onEsc); };
  }, [open]);

  function toggle(id:string) { setTemp(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  const filtrados = items.filter(i => !q || i.label.toLowerCase().includes(q.toLowerCase()));
  const labelBoton = selected.size===0 ? label : selected.size===items.length ? `${label} (todas)` : `${label} (${selected.size})`;

  return (
    <div ref={ref} style={{ position:'relative', flexShrink:0 }}>
      <button type="button" onClick={()=>{ setTemp(new Set(selected)); setQ(''); setOpen(v=>!v); }}
        style={{ height:32, padding:'0 12px', border:`1px solid ${active||open?C.brand:C.n500}`, borderRadius:4,
          background:active?C.brandBg:'#FFFFFF', color:active||open?C.brand:C.n900, fontSize:12, fontFamily:F,
          cursor:'pointer', display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}>
        {labelBoton}
        <IcChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:300, background:'#FFFFFF',
          border:`1px solid ${C.n500}`, borderRadius:10, width:340, boxShadow:shadow.panel, fontFamily:F, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px 0' }}>
            <span style={{ fontSize:13, fontWeight:500, color:C.n900 }}>{label}</span>
            <button onClick={()=>setOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, display:'flex', padding:2 }}><IcClose className="w-3.5 h-3.5" /></button>
          </div>
          <div style={{ padding:'10px 14px' }}>
            <SearchInput value={q} onChange={setQ} placeholder={`Buscar ${label.toLowerCase()}…`} width="100%" autoFocus />
            <p style={{ fontSize:11, color:C.n700, margin:'8px 0 0' }}>{temp.size} de {items.length} seleccionados</p>
          </div>
          <div style={{ maxHeight:260, overflowY:'auto', borderTop:`1px solid ${C.n200}` }}>
            {filtrados.length===0 && <div style={{ padding:16, textAlign:'center', fontSize:12, color:C.n700 }}>Sin resultados.</div>}
            {filtrados.map(i => {
              const checked = temp.has(i.id);
              return (
                <div key={i.id} onClick={()=>toggle(i.id)}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px',
                    cursor:'pointer', background:checked?C.brandBg:'#FFFFFF' }}>
                  <span style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ width:18, height:18, borderRadius:5, border:`1.5px solid ${checked?C.brand:C.n500}`,
                      background:checked?C.brand:'#FFFFFF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {checked && <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.33 7L5.25 9.92L11.67 4.08"/></svg>}
                    </span>
                    <span style={{ fontSize:12, color:C.n900 }}>{i.label}</span>
                  </span>
                  {i.count !== undefined && <span style={{ fontSize:11, color:C.n700, background:C.n200, padding:'2px 8px', borderRadius:radius.pill }}>{i.count} cuenta{i.count!==1?'s':''}</span>}
                </div>
              );
            })}
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderTop:`1px solid ${C.n500}` }}>
            <button type="button" onClick={()=>setTemp(new Set())}
              style={{ background:'none', border:'none', color:C.n700, fontSize:12, cursor:'pointer', fontFamily:F, padding:0 }}>
              Deseleccionar todo
            </button>
            <div style={{ display:'flex', gap:8 }}>
              <Button variant="secondary" onClick={()=>setOpen(false)}>Cancelar</Button>
              <Button icon={<IcCheck className="w-3 h-3" />} onClick={()=>{ onApply(temp); setOpen(false); }}>Aplicar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ── Rango simple (Inicial/Final) ─────────────────────────────────────────────
// La lupa ahora abre un buscador real cuando se le pasan `opciones` (cuentas o
// centros de costo de esta misma pantalla); si no hay opciones para ese
// contexto, queda deshabilitada en vez de ser puramente decorativa.
export function RangoInput({ inicial, final, onInicial, onFinal, disabled, opciones, tituloBuscador='Buscar código' }: {
  inicial:string; final:string; onInicial:(v:string)=>void; onFinal:(v:string)=>void; disabled?:boolean;
  opciones?: { value:string; label:string }[]; tituloBuscador?:string;
}) {
  const [picker, setPicker] = useState<'inicial'|'final'|null>(null);
  const puedeBuscar = !!opciones && opciones.length>0 && !disabled;
  const searchBtn: React.CSSProperties = { width:32, height:32, border:`1px solid ${C.n500}`, borderRadius:4, background:'#FFFFFF',
    display:'flex', alignItems:'center', justifyContent:'center', color: puedeBuscar?C.n700:C.n500, cursor: puedeBuscar?'pointer':'not-allowed', flexShrink:0 };
  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr auto', gap:6, alignItems:'center' }}>
        <Input value={inicial} onChange={onInicial} placeholder="Inicial" disabled={disabled} />
        <button type="button" style={searchBtn} disabled={!puedeBuscar} onClick={()=>setPicker('inicial')} title={tituloBuscador}><IcSearch className="w-3 h-3" /></button>
        <Input value={final} onChange={onFinal} placeholder="Final" disabled={disabled} />
        <button type="button" style={searchBtn} disabled={!puedeBuscar} onClick={()=>setPicker('final')} title={tituloBuscador}><IcSearch className="w-3 h-3" /></button>
      </div>
      {picker && opciones && (
        <ModalBuscarCodigo title={tituloBuscador} opciones={opciones}
          onPick={v => picker==='inicial' ? onInicial(v) : onFinal(v)}
          onClose={()=>setPicker(null)} />
      )}
    </>
  );
}

// ── Buscador simple de un código (cuenta o centro de costo) ──────────────────
export function ModalBuscarCodigo({ title, opciones, onPick, onClose }: {
  title:string; opciones:{ value:string; label:string }[]; onPick:(v:string)=>void; onClose:()=>void;
}) {
  const [q, setQ] = useState('');
  const filtradas = opciones.filter(o => !q || o.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal open title={title} onClose={onClose}
      footer={<div style={{ display:'flex', justifyContent:'flex-end' }}><Button variant="secondary" onClick={onClose}>Cancelar</Button></div>}>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <SearchInput value={q} onChange={setQ} placeholder="Buscar por código o descripción…" width="100%" autoFocus />
        <div style={{ maxHeight:280, overflowY:'auto', border:`1px solid ${C.n500}`, borderRadius:4 }}>
          {filtradas.length===0 && <div style={{ padding:16, textAlign:'center', fontSize:12, color:C.n700 }}>Sin resultados.</div>}
          {filtradas.map(o => (
            <button key={o.value} type="button" onClick={()=>{ onPick(o.label); onClose(); }}
              style={{ display:'block', width:'100%', textAlign:'left', padding:'8px 12px', border:'none', borderBottom:`1px solid ${C.n200}`, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F, color:C.n900 }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
