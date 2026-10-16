'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Modal, Section, InfoBox, RowAction } from '../../../ui/primitives';
import { Button, FormField, Input, Checkbox } from '../../../ui/formulario';
import { TABLA, PAGE_PAD } from '../../../ui/tokens';
import { IcEdit, IcTrash, IcSearch, IcChevronDown } from '../../../ui/icons';
import { C } from '../../../ui/tokens';
import { Cuenta, NIVEL_LABELS } from '../catalogoData';
import { OPERACIONES_AJUSTE } from '../datos/ajustes';
import { TBL } from '../catalogoTableStyles';
import { BRAND, F, type GP, GP_I } from './datos';

export function TabGrupoPatrimonio({ addSignal, onAddHandled }: { addSignal?: number; onAddHandled?: () => void }) {
  const [rows, setRows] = useState<GP[]>(GP_I);
  const [modal, setMod] = useState(false);
  const [eid, setEid]   = useState<string|null>(null);
  const [form, setForm] = useState({codigo:'',desc:'',alt:'',activo:true});
  const [delId, setDel] = useState<string|null>(null);

  function openNew() { setForm({codigo:'',desc:'',alt:'',activo:true}); setEid(null); setMod(true); }
  function openEdit(r:GP) { setForm({codigo:r.codigo,desc:r.desc,alt:r.alt,activo:r.activo}); setEid(r.id); setMod(true); }
  function save() {
    if (!form.codigo||!form.desc) return;
    if (eid) setRows(p=>p.map(r=>r.id===eid?{...r,...form}:r));
    else setRows(p=>[...p,{id:`p${Date.now()}`,...form}]);
    setMod(false);
  }

  // Issue #6: el botón "Nuevo" ahora vive en el header de la página, no
  // arriba de la tabla - esta pestaña reacciona a la señal igual que
  // Movimientos de ajuste.
  useEffect(() => {
    if (addSignal) { openNew(); onAddHandled?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSignal]);

  return (
    <div style={{ flex:1, overflowY:'auto', padding:PAGE_PAD }}><Section title="Grupos de patrimonio" hint="Agrupan las cuentas de patrimonio para el estado de cambios en el patrimonio.">
      <div style={{ ...TBL.wrap }}>
        <table className="tabla" style={TABLA.table}>
          <thead><tr style={TABLA.headRow}>
            {['Grupo','Descripción','Descripción alternativa','Activo','Acciones'].map(h=>(
              <th key={h} style={{ ...TBL.th }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} style={{ borderTop:'1px solid #ECECEC' }}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#F9F9F9'}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='#FFFFFF'}>
                <td style={{ padding:'8px 12px', color:C.n900, fontFamily:F }}>{r.codigo}</td>
                <td style={{ padding:'8px 12px', fontFamily:F }}>{r.desc}</td>
                <td style={{ padding:'8px 12px', fontFamily:F }}>{r.alt}</td>
                <td style={{ padding:'8px 12px' }}>
                  <div onClick={e=>{e.stopPropagation();setRows(p=>p.map(x=>x.id===r.id?{...x,activo:!x.activo}:x));}}
                    style={{ width:16, height:16, background:r.activo?BRAND:'#FFFFFF', border:`1px solid ${r.activo?BRAND:'#ECECEC'}`, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                    {r.activo&&<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                  </div>
                </td>
                <td style={{ padding:'8px 12px', textAlign:'right' }}>
                  <div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
                    <RowAction title="Editar" onClick={()=>openEdit(r)}><IcEdit className="w-3.5 h-3.5"/></RowAction>
                    <RowAction title="Eliminar" danger onClick={()=>setDel(r.id)}><IcTrash className="w-3.5 h-3.5"/></RowAction>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal open title={eid?'Editar grupo':'Nuevo grupo de patrimonio'} onClose={()=>setMod(false)}
          footer={<div style={{ display:'flex', gap:7, justifyContent:'flex-end' }}>
            <Button variant="secondary" onClick={()=>setMod(false)}>Cancelar</Button>
            <Button onClick={save}>Guardar</Button>
          </div>}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:10 }}>
              <FormField label="Código" required><Input value={form.codigo} onChange={v=>setForm(f=>({...f,codigo:v}))} placeholder="Ej. 006"/></FormField>
              <FormField label="Descripción" required><Input value={form.desc} onChange={v=>setForm(f=>({...f,desc:v}))} placeholder="Ej. Capital social"/></FormField>
            </div>
            <FormField label="Descripción alternativa"><Input value={form.alt} onChange={v=>setForm(f=>({...f,alt:v}))} placeholder="En inglés"/></FormField>
            <Checkbox label="Activo" checked={form.activo} onChange={v=>setForm(f=>({...f,activo:v}))}/>
          </div>
        </Modal>
      )}
      {delId && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#FFFFFF', borderRadius:10, padding:21, maxWidth:380, width:'90%', fontFamily:F }}>
            <h3 style={{ fontSize:13, fontWeight:500, margin:'0 0 9px' }}>Eliminar grupo</h3>
            <p style={{ fontSize:11, color:C.n700, marginBottom:17 }}>¿Eliminar este grupo de patrimonio?</p>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:7 }}>
              <Button variant="secondary" onClick={()=>setDel(null)}>Cancelar</Button>
              <Button variant="danger" onClick={()=>{setRows(p=>p.filter(r=>r.id!==delId));setDel(null);}}>Confirmar</Button>
            </div>
          </div>
        </div>
      )}
    </Section></div>
  );
}
// ── Cheques ───────────────────────────────────────────────────────────────────
// Issue #12: only show accounts with tipoEspecial '05' and nivel 'detalle'
// Those accounts must exist in the catalog for cheques to be configurable



// ── Tab Cheques (configuración de chequera) ───────────────────────────────────
export function TabCheques() {
  const BRAND = C.brand;

  const [rows, setRows] = useState([
    { id:'ck1', cuenta:'100-002-0001', nombre:'BAC ¢ 4546545466888',     prefijo:'CK', consec:'23557', formato:'\\cheques_continuo' },
    { id:'ck2', cuenta:'100-002-0002', nombre:'BAC ¢ 4546777778855',     prefijo:'CK', consec:'21963', formato:'\\cheques_continuo' },
    { id:'ck3', cuenta:'100-003-0001', nombre:'BAC $ 4563212454587',     prefijo:'CK', consec:'5432',  formato:'\\cheques_usd' },
  ]);

  return (
    <Section title="Chequeras" hint="Prefijo y consecutivo de cheques de cada cuenta bancaria.">
      <InfoBox>
        La chequera define el prefijo y consecutivo para cada cuenta bancaria. El número de cheque se asigna automáticamente al emitir.
      </InfoBox>
      <div style={{ ...TBL.wrap }}>
        <table className="tabla" style={TABLA.table}>
          <thead>
            <tr style={TABLA.headRow}>
              <th style={{ ...TBL.th }}>Cuenta bancaria</th>
              <th style={{ ...TBL.th, width:80 }}>Prefijo</th>
              <th style={{ ...TBL.th, width:130 }}>Consecutivo actual</th>
              <th style={{ ...TBL.th }}>Formato de impresión</th>
              <th style={{ width:36 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} style={{ borderBottom:'1px solid #ECECEC', background:'#FFFFFF' }}>
              <td style={{ padding:'8px 12px' }}>
                <p style={{ fontWeight:500, color:C.n900 }}>{r.nombre}</p>
                <p style={{ fontSize:10, color:C.n700, fontFamily:F }}>{r.cuenta}</p>
              </td>
              <td style={{ padding:'7px 12px' }}>
                <input value={r.prefijo} onChange={e => setRows(prev => prev.map((x,j)=>j===i?{...x,prefijo:e.target.value}:x))}
                  style={{ height:24, width:60, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:4, fontSize:11, fontFamily:F, textAlign:'center', fontWeight:600, color:BRAND }}/>
              </td>
              <td style={{ padding:'7px 12px' }}>
                <input value={r.consec} onChange={e => setRows(prev => prev.map((x,j)=>j===i?{...x,consec:e.target.value}:x))}
                  style={{ height:24, width:100, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:4, fontSize:11, fontFamily:F, textAlign:'right' }}/>
              </td>
              <td style={{ padding:'7px 12px' }}>
                <input value={r.formato} onChange={e => setRows(prev => prev.map((x,j)=>j===i?{...x,formato:e.target.value}:x))}
                  style={{ height:24, width:'100%', padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:4, fontSize:11, fontFamily:F }}/>
              </td>
              <td style={{ padding:'8px 12px', textAlign:'center' }}>
                <button onClick={() => setRows(prev => prev.filter((_,j)=>j!==i))}
                  style={{ width:23, height:23, border:'1px solid #F5A5A5', borderRadius:4, background:C.errorBg, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#B71C1C' }}>
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"/></svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between' }}>
        <button onClick={()=>setRows(prev=>[...prev,{id:`ck${Date.now()}`,cuenta:'',nombre:'Nueva cuenta',prefijo:'CK',consec:'1',formato:'\\cheques_continuo'}])}
          style={{ display:'flex', alignItems:'center', gap:5, height:24, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:4, background:'#FFFFFF', cursor:'pointer', fontSize:11, fontFamily:F, color:C.n900 }}>
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>
          Agregar chequera
        </button>
        <button style={{ height:28, padding:'0 14px', border:'none', borderRadius:4, background:BRAND, color:'#FFFFFF', cursor:'pointer', fontSize:11, fontWeight:500, fontFamily:F }}>
          Guardar configuración
        </button>
      </div>
    </Section>
  );
}
// ── Selector de cuenta con búsqueda, agrupado por nivel (Issue #10) ──────────
// Antes era un <select> plano con 100+ opciones en un solo bloque; ahora se
// puede buscar por nombre, código o naturaleza, y las cuentas aparecen
// agrupadas por nivel (Detalle / Auxiliar) para ubicarlas más rápido.
export function AccountPicker({ value, onChange, options }: {
  value?: string; onChange: (code:string, nombre:string)=>void;
  options: (Cuenta & { depth:number })[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(c => c.code === value);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ(''); }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const grouped = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = options.filter(c => {
      if (!term) return true;
      return c.code.toLowerCase().includes(term)
        || c.nombre.toLowerCase().includes(term)
        || c.naturaleza.toLowerCase().includes(term)
        || (NIVEL_LABELS[c.nivel] ?? c.nivel).toLowerCase().includes(term);
    });
    const byNivel = new Map<string, (Cuenta & { depth:number })[]>();
    for (const c of filtered) {
      const list = byNivel.get(c.nivel) ?? [];
      list.push(c);
      byNivel.set(c.nivel, list);
    }
    return Array.from(byNivel.entries());
  }, [q, options]);

  return (
    <div ref={ref} style={{ position:'relative', width:'100%' }}>
      <button type="button" onClick={()=>setOpen(o=>!o)}
        style={{ height:30, width:'100%', padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:4, fontSize:12, fontFamily:F, background:'#FFFFFF', display:'flex', alignItems:'center', justifyContent:'space-between', gap:6, cursor:'pointer', textAlign:'left' }}>
        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:selected?C.n900:'#757575' }}>
          {selected ? `${selected.code} - ${selected.nombre}` : 'Sin cuenta (opcional)'}
        </span>
        <IcChevronDown className="w-3 h-3" style={{ flexShrink:0, color:C.n700 }}/>
      </button>
      {open && (
        <div style={{ position:'absolute', zIndex:50, top:'calc(100% + 4px)', left:0, width:'100%', minWidth:340, maxWidth:420, background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:6, boxShadow:'0 8px 24px rgba(0,0,0,.14)', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:7, borderBottom:`1px solid ${C.n500}`, position:'relative' }}>
            <span style={{ position:'absolute', left:15, top:'50%', transform:'translateY(-50%)', color:C.n700 }}><IcSearch className="w-3.5 h-3.5"/></span>
            <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nivel, nombre, naturaleza o código…"
              style={{ width:'100%', height:26, padding:'0 8px 0 26px', border:`1px solid ${C.n500}`, borderRadius:4, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
          </div>
          <div style={{ maxHeight:260, overflowY:'auto' }}>
            {value && (
              <button type="button" onClick={()=>{ onChange('',''); setOpen(false); setQ(''); }}
                style={{ width:'100%', textAlign:'left', padding:'6px 9px', background:'#FFFFFF', border:'none', borderBottom:`1px solid ${C.n500}`, cursor:'pointer', fontSize:11, color:C.error, fontFamily:F }}>
                Quitar cuenta
              </button>
            )}
            {grouped.length===0 && <p style={{ padding:12, fontSize:11, color:C.n700, textAlign:'center' }}>Sin resultados.</p>}
            {grouped.map(([nivel, cuentas]) => (
              <div key={nivel}>
                <div style={{ position:'sticky', top:0, background:'#F9F9F9', padding:'4px 9px', fontSize:9, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.03em' }}>
                  {NIVEL_LABELS[nivel] ?? nivel} · {cuentas.length}
                </div>
                {cuentas.map(c=>(
                  <button key={c.id} type="button" onClick={()=>{ onChange(c.code, c.nombre); setOpen(false); setQ(''); }}
                    style={{ width:'100%', textAlign:'left', padding:'6px 9px', background:c.code===value?C.brandBg:'#FFFFFF', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', gap:1 }}
                    onMouseEnter={e=>{ if(c.code!==value)(e.currentTarget as HTMLElement).style.background='#F9F9F9'; }}
                    onMouseLeave={e=>{ if(c.code!==value)(e.currentTarget as HTMLElement).style.background='#FFFFFF'; }}>
                    <span style={{ fontSize:11, color:C.n900, fontFamily:F }}>{c.nombre}</span>
                    <span style={{ fontSize:9, color:C.n700, fontFamily:F }}>{c.code} · {c.naturaleza}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
// ── Selector múltiple de operaciones bancarias ────────────────────────────
export function OperacionesPicker({ value, onChange }: { value:string[]; onChange:(v:string[])=>void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);
  const todas = value.length === OPERACIONES_AJUSTE.length;
  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter(x=>x!==v) : [...value, v]);
  }
  return (
    <div ref={ref} style={{ position:'relative', width:'100%' }}>
      <button type="button" onClick={()=>setOpen(o=>!o)}
        style={{ height:30, width:'100%', padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:4, fontSize:12, fontFamily:F, background:'#FFFFFF', display:'flex', alignItems:'center', justifyContent:'space-between', gap:6, cursor:'pointer', textAlign:'left' }}>
        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:value.length?C.n900:'#757575' }}>
          {value.length===0 ? 'Seleccioná…' : todas ? 'Todas las operaciones' : value.map(v=>OPERACIONES_AJUSTE.find(o=>o.value===v)?.label??v).join(', ')}
        </span>
        <IcChevronDown className="w-3 h-3" style={{ flexShrink:0, color:C.n700 }}/>
      </button>
      {open && (
        <div style={{ position:'absolute', zIndex:50, top:'calc(100% + 4px)', left:0, width:220, background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:6, boxShadow:'0 8px 24px rgba(0,0,0,.14)', padding:6 }}>
          <button type="button" onClick={()=>onChange(todas?[]:OPERACIONES_AJUSTE.map(o=>o.value))}
            style={{ width:'100%', textAlign:'left', padding:'5px 7px', fontSize:10, fontWeight:500, color:BRAND, background:'none', border:'none', cursor:'pointer', borderBottom:`1px solid ${C.n500}`, marginBottom:4 }}>
            {todas ? 'Quitar todas' : 'Seleccionar todas'}
          </button>
          {OPERACIONES_AJUSTE.map(o=>(
            <label key={o.value} style={{ display:'flex', alignItems:'center', gap:7, padding:'4px 7px', cursor:'pointer', borderRadius:4 }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#F9F9F9'}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
              <input type="checkbox" checked={value.includes(o.value)} onChange={()=>toggle(o.value)}/>
              <span style={{ fontSize:11, color:C.n900, fontFamily:F }}>{o.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
