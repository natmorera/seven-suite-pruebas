'use client';
import React, { useState } from 'react';
import { C, radius } from '../../../ui/tokens';
import { IcChevronDown, IcInfo } from '../../../ui/icons';
import { isFirmaLeafKey, type Firmantes, type Usuario } from '../permissionsData';
import { type PermLeaf } from '../permisos/tipos';
import { BRAND, CATEGORY_ORDER, F, leafCategory } from './datos';

export function InfoNote({ children }: { children: string }) {
  return (
    <div style={{ display:'flex', gap:8, padding:'10px 12px', background:'#EAF3FC', borderRadius:radius.md, marginBottom:10 }}>
      <span style={{ color:'#2196F3', flexShrink:0, marginTop:1 }}><IcInfo className="w-3.5 h-3.5"/></span>
      <span style={{ fontSize:11.5, color:'#1565C0', lineHeight:1.5, fontFamily:F }}>{children}</span>
    </div>
  );
}
export function MarcarQuitar({ onMarcar, onQuitar }: { onMarcar:()=>void; onQuitar:()=>void }) {
  return (
    <div style={{ display:'flex', gap:14, marginBottom:8 }}>
      <button onClick={onMarcar} style={{ background:'none', border:'none', cursor:'pointer', color:BRAND, fontSize:11, fontWeight:500, fontFamily:F, textDecoration:'underline', padding:0 }}>Marcar todo</button>
      <button onClick={onQuitar} style={{ background:'none', border:'none', cursor:'pointer', color:C.error, fontSize:11, fontWeight:500, fontFamily:F, textDecoration:'underline', padding:0 }}>Quitar todo</button>
    </div>
  );
}
export function LeafRow({ label, desc, checked, onChange }: { label:string; desc?:string; checked:boolean; onChange:()=>void }) {
  return (
    <label style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'7px 10px', borderRadius:radius.sm,
      background: checked ? '#FAF7F0' : 'transparent', cursor:'pointer', breakInside:'avoid', marginBottom:2 }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ width:15, height:15, marginTop:1, accentColor:BRAND, cursor:'pointer', flexShrink:0 }}/>
      <span style={{ minWidth:0 }}>
        <span style={{ display:'block', fontSize:12.5, color:C.n900, fontFamily:F, lineHeight:1.3 }}>{label}</span>
        {desc && <span style={{ display:'block', fontSize:10.5, color:C.n700, fontFamily:F, lineHeight:1.3, marginTop:2 }}>{desc}</span>}
      </span>
    </label>
  );
}
// Selector de sub-opciones para permisos "por tipo" (p.ej. Registrar asiento
// -> de cuáles orígenes; Crear cuenta -> en cuál nivel). Las opciones se ven
// como chips debajo del permiso, siempre visibles - sin dropdown ni acordeón
// que haya que abrir primero.
export function LeafRowSubOptions({ leaf, perms, onSetMany }: {
  leaf: PermLeaf; perms: Set<string>; onSetMany:(keys:string[], value:boolean)=>void;
}) {
  const options = leaf.subOptions!;
  const selected = options.filter(o => perms.has(`${leaf.key}:${o}`));
  const checked = selected.length > 0;
  // Los chips solo se muestran si se abre la fila (clic en el permiso) - antes
  // estaban siempre visibles y con muchos permisos "por tipo" en pantalla
  // (bandeja, bancos, etc.) eso era demasiado ruido. Si ya tiene algo
  // seleccionado arranca abierta, para no esconder lo que ya está otorgado.
  const [open, setOpen] = useState(checked);

  function toggleOption(o: string) {
    onSetMany([`${leaf.key}:${o}`], !perms.has(`${leaf.key}:${o}`));
  }

  return (
    <div style={{ breakInside:'avoid', marginBottom:6, padding:'7px 10px', borderRadius:radius.sm, background: checked ? '#FAF7F0' : 'transparent' }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ display:'flex', alignItems:'flex-start', gap:8, width:'100%', background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left' }}>
        <span style={{ width:16, height:16, marginTop:1, borderRadius:4, border:`1px solid ${checked?BRAND:'#ECECEC'}`, background:checked?BRAND:'#FFFFFF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {checked && <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 4.5L3.3 7 8 1.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </span>
        <span style={{ minWidth:0, flex:1 }}>
          <span style={{ display:'block', fontSize:12.5, color:C.n900, fontFamily:F, lineHeight:1.3 }}>{leaf.label}</span>
          {leaf.desc && <span style={{ display:'block', fontSize:10.5, color:C.n700, fontFamily:F, lineHeight:1.3, marginTop:2 }}>{leaf.desc}</span>}
        </span>
        <IcChevronDown className="w-3 h-3" style={{ color:C.n700, flexShrink:0, marginTop:2, transform: open?'rotate(180deg)':'none', transition:'transform .1s' }}/>
      </button>
      {open && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:7, marginLeft:23 }}>
          {options.map(o=>{
            const on = perms.has(`${leaf.key}:${o}`);
            return (
              <button key={o} onClick={()=>toggleOption(o)} style={{
                fontSize:10, fontFamily:F, fontWeight:on?600:400, padding:'3px 8px', borderRadius:radius.pill, cursor:'pointer',
                border:`1px solid ${on?BRAND:'#ECECEC'}`, background:on?BRAND:'#FFFFFF', color:on?'#FFFFFF':C.n700,
              }}>
                {o}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
// Fusión visual de "Exportar" + "Formato de exportación": siguen siendo dos
// permisos independientes (uno controla si puede exportar, el otro en qué
// formatos), pero como esas dos claves aparecen juntas en casi cada módulo,
// mostrarlas en un único bloque con 2 grupos de chips (Alcance / Formato) en
// vez de 2 filas apiladas con su propio encabezado "EXPORTACIÓN" arriba.
// Ver auditoría de permisos.
export function LeafRowExportPair({ exportLeaf, formatoLeaf, perms, onSetMany }: {
  exportLeaf: PermLeaf; formatoLeaf: PermLeaf; perms: Set<string>; onSetMany:(keys:string[], value:boolean)=>void;
}) {
  const alcance = exportLeaf.subOptions!;
  const formato = formatoLeaf.subOptions!;
  const selAlcance = alcance.filter(o => perms.has(`${exportLeaf.key}:${o}`));
  const selFormato = formato.filter(o => perms.has(`${formatoLeaf.key}:${o}`));
  const checked = selAlcance.length > 0 || selFormato.length > 0;
  const [open, setOpen] = useState(checked);

  function toggle(leafKey: string, o: string) {
    onSetMany([`${leafKey}:${o}`], !perms.has(`${leafKey}:${o}`));
  }

  function Grupo({ titulo, leafKey, options, selected }: { titulo:string; leafKey:string; options:readonly string[]; selected:string[] }) {
    return (
      <div>
        <p style={{ fontSize:9.5, fontWeight:600, color:C.n700, fontFamily:F, letterSpacing:'.03em', margin:'0 0 4px' }}>{titulo}</p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {options.map(o=>{
            const on = selected.includes(o);
            return (
              <button key={o} onClick={()=>toggle(leafKey,o)} style={{
                fontSize:10, fontFamily:F, fontWeight:on?600:400, padding:'3px 8px', borderRadius:radius.pill, cursor:'pointer',
                border:`1px solid ${on?BRAND:'#ECECEC'}`, background:on?BRAND:'#FFFFFF', color:on?'#FFFFFF':C.n700,
              }}>
                {o}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width:'100%', padding:'7px 10px', borderRadius:radius.sm, background: checked ? '#FAF7F0' : 'transparent' }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ display:'flex', alignItems:'flex-start', gap:8, width:'100%', background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left' }}>
        <span style={{ width:16, height:16, marginTop:1, borderRadius:4, border:`1px solid ${checked?BRAND:'#ECECEC'}`, background:checked?BRAND:'#FFFFFF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {checked && <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 4.5L3.3 7 8 1.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </span>
        <span style={{ fontSize:12.5, color:C.n900, fontFamily:F, lineHeight:1.3, flex:1 }}>Exportar</span>
        <IcChevronDown className="w-3 h-3" style={{ color:C.n700, flexShrink:0, marginTop:2, transform: open?'rotate(180deg)':'none', transition:'transform .1s' }}/>
      </button>
      {open && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:'10px 20px', marginTop:7, marginLeft:23 }}>
          <Grupo titulo="ALCANCE" leafKey={exportLeaf.key} options={alcance} selected={selAlcance}/>
          <Grupo titulo="FORMATO" leafKey={formatoLeaf.key} options={formato} selected={selFormato}/>
        </div>
      )}
    </div>
  );
}
// Permiso "Firmar <reporte>": además de marcarlo, hay que elegir cuáles
// usuarios quedan autorizados a firmar ese reporte - una lista compartida
// por reporte, independiente de a quién le estás editando los permisos.
// Solo los usuarios elegidos acá van a poder ejecutar la firma.
export function LeafRowFirmantes({ leaf, checked, onChange, usuarios, firmantesIds, onToggleFirmante }: {
  leaf: PermLeaf; checked:boolean; onChange:()=>void;
  usuarios: Usuario[]; firmantesIds: number[]; onToggleFirmante:(usuarioId:number)=>void;
}) {
  return (
    <div style={{ breakInside:'avoid', marginBottom:6, padding:'7px 10px', borderRadius:radius.sm, background: checked ? '#FAF7F0' : 'transparent' }}>
      <label style={{ display:'flex', alignItems:'flex-start', gap:8, cursor:'pointer' }}>
        <input type="checkbox" checked={checked} onChange={onChange} style={{ width:15, height:15, marginTop:1, accentColor:BRAND, cursor:'pointer', flexShrink:0 }}/>
        <span style={{ minWidth:0 }}>
          <span style={{ display:'block', fontSize:12.5, color:C.n900, fontFamily:F, lineHeight:1.3 }}>{leaf.label}</span>
          {leaf.desc && <span style={{ display:'block', fontSize:10.5, color:C.n700, fontFamily:F, lineHeight:1.3, marginTop:2 }}>{leaf.desc}</span>}
        </span>
      </label>
      {checked && (
        <div style={{ marginTop:8, marginLeft:23 }}>
          <p style={{ fontSize:10, fontWeight:600, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 6px' }}>
            Usuarios autorizados a firmar {firmantesIds.length>0 && `(${firmantesIds.length})`}
          </p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {usuarios.map(u=>{
              const on = firmantesIds.includes(u.id);
              return (
                <button key={u.id} onClick={()=>onToggleFirmante(u.id)} style={{
                  fontSize:10, fontFamily:F, fontWeight:on?600:400, padding:'3px 8px', borderRadius:radius.pill, cursor:'pointer',
                  border:`1px solid ${on?BRAND:'#ECECEC'}`, background:on?BRAND:'#FFFFFF', color:on?'#FFFFFF':C.n700,
                }}>
                  {u.descripcion}
                </button>
              );
            })}
            {usuarios.length===0 && <span style={{ fontSize:11, color:C.n700 }}>No hay usuarios disponibles.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
export function CountBadge({ n, total }: { n:number; total:number }) {
  const done = n === total && total > 0;
  return (
    <span style={{ fontSize:11, fontFamily:F, color: done ? C.success : C.n700 }}>{n}/{total}</span>
  );
}
export function LeafGrid({ leaves, perms, onToggleLeaf, onSetMany, usuarios, firmantes, onToggleFirmante }: {
  leaves: PermLeaf[]; perms: Set<string>; onToggleLeaf:(k:string)=>void; onSetMany:(keys:string[], value:boolean)=>void;
  usuarios: Usuario[]; firmantes: Firmantes; onToggleFirmante:(leafKey:string, usuarioId:number)=>void;
}) {
  // Junta "Exportar" + "Formato de exportación" en un solo ítem cuando
  // aparecen consecutivos (el patrón real en todo el árbol) - ver
  // LeafRowExportPair. Siguen siendo 2 permisos independientes.
  const items: (PermLeaf | { pair: [PermLeaf, PermLeaf] })[] = [];
  for (let i = 0; i < leaves.length; i++) {
    const l = leaves[i];
    const next = leaves[i + 1];
    if (l.key.endsWith('.export') && l.subOptions && next && next.key.endsWith('.exportformato') && next.subOptions) {
      items.push({ pair: [l, next] });
      i++;
    } else {
      items.push(l);
    }
  }
  return (
    // Grilla responsive con columnas FIJAS por breakpoint (ver .perm-leaf-grid
    // en globals.css): 2-3 en laptop, más solo en monitores grandes.
    <div className="perm-leaf-grid">
      {items.map(item => {
        if ('pair' in item) {
          const [exportLeaf, formatoLeaf] = item.pair;
          return (
            <div key={exportLeaf.key}>
              <LeafRowExportPair exportLeaf={exportLeaf} formatoLeaf={formatoLeaf} perms={perms} onSetMany={onSetMany}/>
            </div>
          );
        }
        const l = item;
        return (
          <div key={l.key} style={ isFirmaLeafKey(l.key) ? { columnSpan:'all', breakInside:'avoid' } as React.CSSProperties : undefined }>
            {isFirmaLeafKey(l.key)
              ? <LeafRowFirmantes leaf={l} checked={perms.has(l.key)} onChange={()=>onToggleLeaf(l.key)}
                  usuarios={usuarios} firmantesIds={firmantes[l.key] ?? []} onToggleFirmante={(uid)=>onToggleFirmante(l.key, uid)}/>
              : l.subOptions
                ? <LeafRowSubOptions leaf={l} perms={perms} onSetMany={onSetMany}/>
                : <LeafRow label={l.label} desc={l.desc} checked={perms.has(l.key)} onChange={()=>onToggleLeaf(l.key)}/>}
          </div>
        );
      })}
    </div>
  );
}
export function CategorizedLeaves({ leaves, perms, onToggleLeaf, onSetMany, usuarios, firmantes, onToggleFirmante }: {
  leaves: PermLeaf[]; perms: Set<string>; onToggleLeaf:(k:string)=>void; onSetMany:(keys:string[], value:boolean)=>void;
  usuarios: Usuario[]; firmantes: Firmantes; onToggleFirmante:(leafKey:string, usuarioId:number)=>void;
}) {
  const buckets = new Map<string, PermLeaf[]>();
  for (const l of leaves) {
    const cat = leafCategory(l.key);
    (buckets.get(cat) ?? buckets.set(cat, []).get(cat)!).push(l);
  }
  const catsOrdenadas = CATEGORY_ORDER.filter(c => buckets.has(c));

  // Solo Exportación y Firma se ganan su propio subtítulo - son las únicas
  // categorías donde hace falta explicar qué se está eligiendo (alcance,
  // formato, firmantes). El resto (Ver, Registrar, Editar, Anular, etc.) son
  // acciones autoexplicativas: se leen bien juntas, sin un título por cada
  // una, respetando el orden de CATEGORY_ORDER (Visualización primero).
  const CON_SUBTITULO = new Set(['Exportación', 'Firma']);
  type Bloque = { cat?: string; leaves: PermLeaf[] };
  const bloques: Bloque[] = [];
  let sueltosAcumulados: PermLeaf[] = [];
  function flushSueltos() {
    if (sueltosAcumulados.length > 0) { bloques.push({ leaves: sueltosAcumulados }); sueltosAcumulados = []; }
  }
  for (const cat of catsOrdenadas) {
    const items = buckets.get(cat)!;
    if (CON_SUBTITULO.has(cat)) { flushSueltos(); bloques.push({ cat, leaves: items }); }
    else { sueltosAcumulados.push(...items); }
  }
  flushSueltos();

  // El subtítulo de una categoría solo aporta si hay más de un bloque en total.
  const mostrarSubtitulo = bloques.length > 1;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {bloques.map((b, i) => (
        <div key={b.cat ?? `sueltos-${i}`}>
          {mostrarSubtitulo && b.cat && (
            <p style={{ fontSize:10, fontWeight:500, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 4px' }}>{b.cat}</p>
          )}
          <LeafGrid leaves={b.leaves} perms={perms} onToggleLeaf={onToggleLeaf} onSetMany={onSetMany}
            usuarios={usuarios} firmantes={firmantes} onToggleFirmante={onToggleFirmante}/>
        </div>
      ))}
    </div>
  );
}
