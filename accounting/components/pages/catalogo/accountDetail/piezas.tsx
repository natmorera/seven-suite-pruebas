'use client';
import { useState } from 'react';
import { radius , C } from '@/components/ui/tokens';
import { type Cuenta } from '../catalogoData';
import { BRAND, F, NIIF_TREE, type NiifLeaf } from './datos';

// ── Selector único con búsqueda para clasificación NIIF ────────────────────────
// Solo el número de GRUPO (1 dígito) se muestra como "código" - sub grupo y sub sub grupo
// son puramente descriptivos (texto), para que no se confundan con el código contable.
function GrupoBadge({ n, size=22 }: { n:string; size?:number }) {
  return (
    <span style={{ width:size, height:size, borderRadius:'50%', background:'transparent', border:`1px solid ${C.brandBd}`,
      color:BRAND, fontSize:size*0.5, fontWeight:600, fontFamily:F, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      {n}
    </span>
  );
}
export function NiifSearchSelect({ selected, onSelect }: { selected: NiifLeaf|null; onSelect:(leaf:NiifLeaf)=>void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  // Árbol Grupo → Sub grupo → Sub sub grupo (con indentación) en vez de lista plana.
  // Solo la última fila (sub sub grupo) es seleccionable; Grupo y Sub grupo son
  // encabezados de contexto para ubicarse más fácil dentro del mapa de opciones.
  const tree = Object.entries(NIIF_TREE).map(([gVal, g]) => {
    const sgs = Object.entries(g.sgs).map(([sgVal, sg]) => {
      const leaves = Object.entries(sg.ssgs)
        .map(([ssgVal, ssgLabel]) => ({ grupo:gVal, sg:sgVal, ssg:ssgVal, grupoLabel:g.label, sgLabel:sg.label, ssgLabel, search:'' }))
        .filter(l => !q || `${l.ssg} ${l.ssgLabel} ${sg.label} ${g.label}`.toLowerCase().includes(q));
      return { sgVal, sgLabel: sg.label, leaves };
    }).filter(s => s.leaves.length > 0);
    return { gVal, gLabel: g.label, sgs };
  }).filter(gr => gr.sgs.length > 0);

  return (
    <div style={{ position:'relative' }}>
      {!open ? (
        <button type="button" onClick={()=>{ setOpen(true); setQuery(''); }}
          style={{ width:'100%', height:37, padding:'0 10px', border:`1px solid ${selected?BRAND:C.n500}`, borderRadius:radius.md,
            background: selected?C.brandBg:'#FFFFFF', cursor:'pointer', fontFamily:F, textAlign:'left',
            display:'flex', alignItems:'center', gap:9 }}>
          {selected ? (
            <>
              <GrupoBadge n={selected.grupo}/>
              <span style={{ minWidth:0, flex:1 }}>
                <span style={{ display:'block', fontSize:11, fontWeight:600, color:'#0F0F0F', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selected.ssgLabel}</span>
                <span style={{ display:'block', fontSize:10.5, color:C.n700 }}>{selected.grupoLabel.split('·')[1]?.trim()??selected.grupoLabel} › {selected.sgLabel}</span>
              </span>
            </>
          ) : <span style={{ fontSize:11, color:C.n700 }}>Buscar grupo NIIF…</span>}
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink:0, marginLeft:'auto' }}><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
        </button>
      ) : (
        <>
          <div style={{ position:'relative' }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.3" style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)' }}><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l-2-2"/></svg>
            <input autoFocus value={query} onChange={e=>setQuery(e.target.value)} onBlur={()=>setTimeout(()=>setOpen(false),120)}
              placeholder="Ej. activos corrientes, ingresos…" aria-label="Ej. activos corrientes, ingresos…"
              style={{ width:'100%', height:37, padding:'0 10px 0 26px', border:`1px solid ${BRAND}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none' }}/>
          </div>
          <div style={{ position:'absolute', top:40, left:0, right:0, background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:radius.md, boxShadow:'0 8px 24px rgba(0,0,0,.12)', maxHeight:280, overflowY:'auto', zIndex:30, padding:'4px 0' }}>
            {tree.length===0 && <p style={{ padding:'9px 10px', fontSize:11, color:C.n700, margin:0, fontFamily:F }}>Sin resultados</p>}
            {tree.map(gr=>(
              <div key={gr.gVal}>
                {/* Grupo - encabezado, no seleccionable */}
                <div style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 10px 4px' }}>
                  <GrupoBadge n={gr.gVal} size={18}/>
                  <span style={{ fontSize:11, fontWeight:700, color:'#0F0F0F', fontFamily:F }}>{gr.gLabel.split('·')[1]?.trim()??gr.gLabel}</span>
                </div>
                {gr.sgs.map(sg=>(
                  <div key={sg.sgVal}>
                    {/* Sub grupo - encabezado, no seleccionable */}
                    <div style={{ padding:'3px 10px 3px 35px', fontSize:10.5, fontWeight:600, color:C.n700, fontFamily:F }}>{sg.sgLabel}</div>
                    {/* Sub sub grupo - única opción seleccionable */}
                    {sg.leaves.map(l=>(
                      <button key={l.ssg} type="button" onMouseDown={e=>{ e.preventDefault(); onSelect(l); setOpen(false); }}
                        style={{ display:'block', width:'100%', textAlign:'left', padding:'6px 10px 6px 56px', border:'none',
                          background: selected?.ssg===l.ssg ? C.brandBg : 'none', cursor:'pointer', fontFamily:F,
                          fontSize:11, fontWeight: selected?.ssg===l.ssg ? 600 : 400, color: selected?.ssg===l.ssg ? BRAND : '#0F0F0F' }}
                        onMouseEnter={e=>{ if(selected?.ssg!==l.ssg) e.currentTarget.style.background=C.n200; }}
                        onMouseLeave={e=>{ if(selected?.ssg!==l.ssg) e.currentTarget.style.background='none'; }}>
                        {l.ssgLabel}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
// ── Selector con búsqueda para elegir la cuenta madre (Mayor / Sub mayor) ──────
// Un solo dropdown que agrupa las opciones bajo su cuenta padre (ej. las Sub mayor se
// listan bajo el encabezado de su Mayor) para que se lea como jerarquía y no como un
// bloque plano de códigos. El código va como texto (sin "chip" con borde) para que la
// lista de resultados no se sienta visualmente cargada.
export function AccountPickerSelect({ groups, selected, onSelect, placeholder, emptyLabel }: {
  groups: { parent: Cuenta|null; label?: string; items: Cuenta[] }[];
  selected: Cuenta|null; onSelect:(c:Cuenta)=>void; placeholder:string; emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const filteredGroups = groups
    .map(g => ({ parent: g.parent, label: g.label, items: g.items.filter(o => !q || `${o.code} ${o.nombre}`.toLowerCase().includes(q)) }))
    .filter(g => g.items.length > 0);
  const showHeaders = groups.length > 1;

  return (
    <div style={{ position:'relative' }}>
      {!open ? (
        <button type="button" onClick={()=>{ setOpen(true); setQuery(''); }}
          style={{ width:'100%', height:37, padding:'0 10px', border:`1px solid ${selected?BRAND:C.n500}`, borderRadius:radius.md,
            background: selected?C.brandBg:'#FFFFFF', cursor:'pointer', fontFamily:F, textAlign:'left',
            display:'flex', alignItems:'center', gap:9 }}>
          {selected ? (
            <>
              <span style={{ fontSize:11, fontWeight:700, color:BRAND, fontFamily:F, letterSpacing:'.02em', flexShrink:0 }}>{selected.code}</span>
              <span style={{ fontSize:11, fontWeight:500, color:'#0F0F0F', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{selected.nombre}</span>
            </>
          ) : <span style={{ fontSize:11, color:C.n700, flex:1 }}>{placeholder}</span>}
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink:0, marginLeft:'auto' }}><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
        </button>
      ) : (
        <>
          <div style={{ position:'relative' }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.3" style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)' }}><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l-2-2"/></svg>
            <input autoFocus value={query} onChange={e=>setQuery(e.target.value)} onBlur={()=>setTimeout(()=>setOpen(false),120)}
              placeholder="Buscar por código o nombre…" aria-label="Buscar por código o nombre…"
              style={{ width:'100%', height:37, padding:'0 10px 0 26px', border:`1px solid ${BRAND}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none' }}/>
          </div>
          <div style={{ position:'absolute', top:40, left:0, right:0, background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:radius.md, boxShadow:'0 8px 24px rgba(0,0,0,.12)', maxHeight:240, overflowY:'auto', zIndex:30, padding:'4px 0' }}>
            {filteredGroups.length===0 && <p style={{ padding:'9px 10px', fontSize:11, color:C.n700, margin:0, fontFamily:F }}>{emptyLabel ?? 'Sin resultados'}</p>}
            {filteredGroups.map((g,i)=>(
              <div key={g.parent?.id ?? `grp-${i}`}>
                {showHeaders && (
                  <div style={{ padding:'6px 10px 3px', fontSize:10.5, fontWeight:700, color:C.n700, textTransform:'uppercase', letterSpacing:'.04em', fontFamily:F }}>
                    {g.label ?? (g.parent ? `${g.parent.code} · ${g.parent.nombre}` : 'Otras')}
                  </div>
                )}
                {g.items.map(o=>{
                  const isSel = selected?.id===o.id;
                  return (
                    <button key={o.id} type="button" onMouseDown={e=>{ e.preventDefault(); onSelect(o); setOpen(false); }}
                      style={{ display:'flex', alignItems:'baseline', gap:8, width:'100%', textAlign:'left',
                        padding: showHeaders ? '6px 10px 6px 20px' : '7px 10px',
                        border:'none', background: isSel?C.brandBg:'none', cursor:'pointer', fontFamily:F }}
                      onMouseEnter={e=>{ if(!isSel) e.currentTarget.style.background=C.n200; }}
                      onMouseLeave={e=>{ e.currentTarget.style.background = isSel?C.brandBg:'none'; }}>
                      <span style={{ fontSize:11, fontWeight:700, color:BRAND, fontFamily:F, minWidth:44, flexShrink:0 }}>{o.code}</span>
                      <span style={{ fontSize:11, fontWeight:500, color:'#0F0F0F', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.nombre}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
export function Label({ children }: { children:React.ReactNode }) {
  return <p style={{ fontSize:10.5, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 5px', fontFamily:F }}>{children}</p>;
}
export function Field2({ label, value, color }: { label:string; value:React.ReactNode; color?:string }) {
  return (
    <div>
      <p style={{ fontSize:10.5, color:C.n700, margin:'0 0 2px', fontFamily:F }}>{label}</p>
      <p style={{ fontSize:11, fontWeight:400, color:color??C.n900, margin:0, fontFamily:F }}>{value}</p>
    </div>
  );
}
