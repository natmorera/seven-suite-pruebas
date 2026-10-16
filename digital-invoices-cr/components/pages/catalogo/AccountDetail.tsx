'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, FormField, Input, Select, InfoBox, Checkbox, Modal, Toast, radius } from '../../ui/primitives';
import { IcClose, IcEdit, IcTrash, IcCheck, IcCopy, IcPlus, IcUser } from '../../ui/icons';
import { C, FONT } from '../../ui/primitives';
import {
  Cuenta, Nivel, GRUPOS_NIIF, TIPOS_ESPECIAL, getNaturaleza, getChildNivel, getChildNivelConfigurable,
  isPosteable, codeExists, buildCodePrefix, suggestNextSegment, suggestNextMayorSegment, NIVEL_LABELS,
  isCCObligatorioBySpec, SEP, LONGITUD,
  MONEDAS, genId, fmt,
  REGIMENES_FISCALES, TIPOS_IDENTIFICACION_FISCAL, MONEDAS_BANCO, TIPOS_CUENTA_BANCO, TIPOS_IMPUESTO,
  EnlaceAjuste, OPERACIONES_AJUSTE,
} from './catalogoData';
import { useCentrosCostoConfig } from './centrosCostoConfig';
import ModalTrasladoSaldo, { TrasladoResult } from './ModalTrasladoSaldo';

const F = FONT;
const BRAND = '#A77600';

const GRUPOS_PATRIMONIO = [
  { value:'001', label:'001 · Capital social'         },
  { value:'002', label:'002 · Reserva legal'          },
  { value:'003', label:'003 · Aporte de socios'       },
  { value:'004', label:'004 · Resultados del período' },
  { value:'005', label:'005 · Utilidades acumuladas'  },
];

// ── Cascada NIIF: Grupo → Sub grupo → Sub sub grupo ────────────────────────────
const NIIF_TREE: Record<string, { label:string; sgs: Record<string, { label:string; ssgs: Record<string, string> }> }> = {
  '1': { label:'1 · Activos', sgs: {
    '1.1': { label:'Activos corrientes', ssgs: { '1.1.1':'Activos corrientes circulantes', '1.1.2':'Otros activos circulantes' } },
    '1.2': { label:'Activos no corrientes', ssgs: { '1.2.1':'Propiedad planta y equipo' } },
  }},
  '2': { label:'2 · Pasivos', sgs: {
    '2.1': { label:'Pasivos corrientes', ssgs: { '2.1.1':'Obligaciones a corto plazo' } },
    '2.2': { label:'Pasivos no corrientes', ssgs: { '2.2.1':'Obligaciones a largo plazo' } },
  }},
  '3': { label:'3 · Patrimonio', sgs: {
    '3.1': { label:'Capital', ssgs: { '3.1.1':'Capital social y reservas' } },
  }},
  '4': { label:'4 · Ingresos', sgs: {
    '4.1': { label:'Ingresos operativos', ssgs: { '4.1.1':'Ingresos por ventas y servicios' } },
  }},
  '5': { label:'5 · Costos', sgs: {
    '5.1': { label:'Costo de ventas', ssgs: { '5.1.1':'Costos directos de operación' } },
  }},
  '6': { label:'6 · Gastos', sgs: {
    '6.1': { label:'Gastos de operación', ssgs: { '6.1.1':'Gastos operativos y administrativos' } },
  }},
};

interface NiifLeaf { grupo:string; sg:string; ssg:string; grupoLabel:string; sgLabel:string; ssgLabel:string; search:string }
const NIIF_LEAVES: NiifLeaf[] = Object.entries(NIIF_TREE).flatMap(([gVal, g]) =>
  Object.entries(g.sgs).flatMap(([sgVal, sg]) =>
    Object.entries(sg.ssgs).map(([ssgVal, ssgLabel]) => {
      const leaf = { grupo:gVal, sg:sgVal, ssg:ssgVal, grupoLabel:g.label, sgLabel:sg.label, ssgLabel, search:'' };
      leaf.search = `${ssgVal} ${ssgLabel} ${sg.label} ${g.label}`.toLowerCase();
      return leaf;
    })
  )
);

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
function NiifSearchSelect({ selected, onSelect }: { selected: NiifLeaf|null; onSelect:(leaf:NiifLeaf)=>void }) {
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
            background: selected?C.brandBg:'#fff', cursor:'pointer', fontFamily:F, textAlign:'left',
            display:'flex', alignItems:'center', gap:9 }}>
          {selected ? (
            <>
              <GrupoBadge n={selected.grupo}/>
              <span style={{ minWidth:0, flex:1 }}>
                <span style={{ display:'block', fontSize:11, fontWeight:600, color:'#0F0F0F', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selected.ssgLabel}</span>
                <span style={{ display:'block', fontSize:9, color:C.n700 }}>{selected.grupoLabel.split('·')[1]?.trim()??selected.grupoLabel} › {selected.sgLabel}</span>
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
              placeholder="Ej. activos corrientes, ingresos…"
              style={{ width:'100%', height:37, padding:'0 10px 0 26px', border:`1px solid ${BRAND}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none' }}/>
          </div>
          <div style={{ position:'absolute', top:40, left:0, right:0, background:'#fff', border:`1px solid ${C.n500}`, borderRadius:radius.md, boxShadow:'0 8px 24px rgba(0,0,0,.12)', maxHeight:280, overflowY:'auto', zIndex:30, padding:'4px 0' }}>
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
                    <div style={{ padding:'3px 10px 3px 35px', fontSize:10, fontWeight:600, color:C.n700, fontFamily:F }}>{sg.sgLabel}</div>
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
function AccountPickerSelect({ groups, selected, onSelect, placeholder, emptyLabel }: {
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
            background: selected?C.brandBg:'#fff', cursor:'pointer', fontFamily:F, textAlign:'left',
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
              placeholder="Buscar por código o nombre…"
              style={{ width:'100%', height:37, padding:'0 10px 0 26px', border:`1px solid ${BRAND}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none' }}/>
          </div>
          <div style={{ position:'absolute', top:40, left:0, right:0, background:'#fff', border:`1px solid ${C.n500}`, borderRadius:radius.md, boxShadow:'0 8px 24px rgba(0,0,0,.12)', maxHeight:240, overflowY:'auto', zIndex:30, padding:'4px 0' }}>
            {filteredGroups.length===0 && <p style={{ padding:'9px 10px', fontSize:11, color:C.n700, margin:0, fontFamily:F }}>{emptyLabel ?? 'Sin resultados'}</p>}
            {filteredGroups.map((g,i)=>(
              <div key={g.parent?.id ?? `grp-${i}`}>
                {showHeaders && (
                  <div style={{ padding:'6px 10px 3px', fontSize:9, fontWeight:700, color:C.n700, textTransform:'uppercase', letterSpacing:'.04em', fontFamily:F }}>
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

function Label({ children }: { children:React.ReactNode }) {
  return <p style={{ fontSize:9, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 5px', fontFamily:F }}>{children}</p>;
}
function Field2({ label, value, color }: { label:string; value:React.ReactNode; color?:string }) {
  return (
    <div>
      <p style={{ fontSize:9, color:C.n700, margin:'0 0 2px', fontFamily:F }}>{label}</p>
      <p style={{ fontSize:11, fontWeight:400, color:color??C.n900, margin:0, fontFamily:F }}>{value}</p>
    </div>
  );
}

// ── View mode ─────────────────────────────────────────────────────────────────
function DetailView({ account, onEdit, onDelete, onAddChild, onClose, onSelect, allNodes, onTraslado, trasladoResult, enlacesAjuste }: {
  account:Cuenta; onEdit:()=>void; onDelete:(id:string)=>void; onAddChild:(p:Cuenta)=>void;
  onClose:()=>void; onSelect:(n:Cuenta)=>void; allNodes:Cuenta[];
  onTraslado:()=>void; trasladoResult:TrasladoResult|null;
  enlacesAjuste?: EnlaceAjuste[];
}) {
  const router = useRouter();
  const { centrosCosto: CENTROS_COSTO } = useCentrosCostoConfig();
  const [confirmDel, setConfirmDel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ccAsignados, setCcAsignados] = useState<string[]>(account.centrosCostoIds??[]);

  useEffect(()=>{ setCcAsignados(account.centrosCostoIds??[]); },[account.id]);

  const isRoot = account.nivel === 'grupo';
  const esCliente = account.tipoEspecial==='02'||account.tipoEspecial==='03';
  const esProveedor = account.tipoEspecial==='04';
  const esAuxiliar = esCliente || esProveedor;
  const esBanco = account.tipoEspecial==='05';
  // esta cuenta ES un cliente/proveedor puntual (nivel auxiliar bajo un
  // Detalle 02/03/04) - tiene entornoFiscal propio y perfil en Clientes/Proveedores.
  const esFichaAuxiliar = esAuxiliar && account.nivel === 'auxiliar';
  const tipoIdLabel = TIPOS_IDENTIFICACION_FISCAL.find(t=>t.value===account.entornoFiscal?.tipoIdentificacion)?.label ?? '';
  // movimientos de ajuste (Catálogo > Movimientos de ajuste) enlazados a esta cuenta
  const ajustesEnlazados = (enlacesAjuste??[]).filter(e => e.cuentaCode === account.code);
  // detalle accounts with tipo 02/03/04 can add "auxiliar" subcuentas (clients/providers)
  const canAddChild = account.nivel !== 'detalle' || esAuxiliar;
  const canDelete = !account.children?.length && !isRoot;
  const esPatrimonio = account.grupo==='3';
  const grupoLabel = GRUPOS_NIIF.find(g=>g.value===account.grupo)?.label??'';
  const monedaLabel = MONEDAS.find(m=>m.value===account.moneda)?.label??'Colón costarricense';
  const espLabel = TIPOS_ESPECIAL.find(t=>t.value===account.tipoEspecial)?.label??'';
  const patriLabel = GRUPOS_PATRIMONIO.find(g=>g.value===account.grupoPatrimonio)?.label;
  const subcuentas = account.children??[];
  const hasCCSection = esBanco || account.centroCostoObligatorio || account.usaCentroCosto;

  return (
    <>
      {/* Header */}
      <div style={{ padding:'0 14px', height:52, borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <p style={{ fontSize:13, fontWeight:600, color:C.n900, margin:0, fontFamily:F, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{account.nombre}</p>
            {account.tipoEspecial && <span style={{ fontSize:9, color:'#7C3AED', background:'rgba(124,58,237,.08)', padding:'2px 6px', borderRadius:4, fontWeight:500, flexShrink:0, fontFamily:F }}>Especial</span>}
            {account.inactiva && <span style={{ fontSize:9, color:C.n700, background:'#F5F5F5', padding:'2px 6px', borderRadius:4, border:'1px solid #E0E0E0', flexShrink:0, fontFamily:F }}>Inactiva</span>}
          </div>
          <p style={{ fontSize:10, color:C.n700, margin:'2px 0 0', fontFamily:F }}>{account.code}</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0, marginLeft:7 }}>
          {!isRoot && <Button variant="primary" icon={<IcEdit className="w-3 h-3"/>} onClick={onEdit} style={{ height:24 }}>Editar</Button>}
          {canAddChild && (
            <Button variant="secondary" icon={<IcPlus className="w-3 h-3"/>} onClick={()=>onAddChild(account)} style={{ height:24 }}>
              {esCliente ? 'Cliente' : esProveedor ? 'Proveedor' : 'Subcuenta'}
            </Button>
          )}
          {canDelete && (
            <button onClick={()=>setConfirmDel(true)} style={{ width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:radius.sm, border:'none', background:'none', cursor:'pointer', color:C.error }}>
              <IcTrash className="w-3.5 h-3.5"/>
            </button>
          )}
          <button onClick={onClose} style={{ width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:radius.sm, border:'none', background:'none', cursor:'pointer', color:C.n700 }}>
            <IcClose className="w-4 h-4"/>
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto' }}>
        {/* NIIF root banner */}
        {isRoot && (
          <div style={{ margin:'14px 14px 0', display:'flex', alignItems:'flex-start', gap:7, padding:'9px 12px', background:C.brandBg, border:`1px solid ${C.brandBd}`, borderRadius:radius.md }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={BRAND}><circle cx="7" cy="7" r="5.83"/><path d="M7 4.67v2.33M7 9.33h.01" strokeLinecap="round"/></svg>
            <span style={{ fontSize:10, color:'#8A6200', fontFamily:F }}>Cuenta raíz NIIF · define la estructura contable base. No se puede editar ni eliminar.</span>
          </div>
        )}

        {/* Datos de la cuenta */}
        <div style={{ padding:'14px 14px 7px' }}>
          <Label>Datos de la cuenta</Label>
          {/* Code box */}
          <div style={{ background:C.n200, borderRadius:radius.md, padding:'9px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div>
              <p style={{ fontSize:9, color:C.n700, margin:'0 0 2px', fontFamily:F }}>Código contable</p>
              <p style={{ fontSize:13, fontWeight:600, color:C.n900, margin:0, fontFamily:F }}>{account.code}</p>
            </div>
            <button onClick={()=>{ navigator.clipboard.writeText(account.code); setCopied(true); setTimeout(()=>setCopied(false),1500); }} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:BRAND, fontSize:10, fontFamily:F }}>
              {copied?<IcCheck className="w-3 h-3"/>:<IcCopy className="w-3 h-3"/>}
              {copied?'Copiado':'Copiar'}
            </button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <Field2 label="Nivel" value={NIVEL_LABELS[account.nivel]??account.nivel}/>
              <p style={{ fontSize:9, color:account.posteable?BRAND:C.n700, margin:'3px 0 0', lineHeight:1.5, fontFamily:F }}>
                {account.nivel==='mayor'&&'Raíz del árbol NIIF. Agrupa grandes categorías. No registra movimientos.'}
                {account.nivel==='submajor'&&'Subdivide la cuenta Mayor en grupos específicos. No registra movimientos.'}
                {account.nivel==='detalle'&&'Cuenta final donde se registran débitos y créditos.'}
              </p>
            </div>
            <Field2 label="Grupo NIIF" value={grupoLabel}/>
            <Field2 label="Naturaleza" value={account.naturaleza}/>
            <Field2 label="Moneda" value={monedaLabel}/>
            <Field2 label="Posteable" value={account.posteable?'Sí · acepta movimientos':'No · agrupadora'} color={account.posteable?BRAND:C.n700}/>
            <Field2 label="Centro de costo" value={(account.centroCostoObligatorio||account.usaCentroCosto)?'Obligatorio':'Opcional'} color={(account.centroCostoObligatorio||account.usaCentroCosto)?BRAND:C.n700}/>
            {account.tipoEspecial && <div style={{ gridColumn:'1/-1' }}><Field2 label="Tipo especial" value={espLabel} color={BRAND}/></div>}
            {esPatrimonio && account.grupoPatrimonio && <div style={{ gridColumn:'1/-1' }}><Field2 label="Grupo de patrimonio" value={patriLabel??'Sin asignar'}/></div>}
            {/* N° de identificación legible en la ficha de cliente/proveedor */}
            {esFichaAuxiliar && (
              <div style={{ gridColumn:'1/-1' }}>
                <Field2
                  label={`N° de identificación${tipoIdLabel?` (${tipoIdLabel})`:''}`}
                  value={account.entornoFiscal?.numeroIdentificacion || 'Sin registrar'}
                  color={account.entornoFiscal?.numeroIdentificacion ? C.n900 : C.n700}
                />
              </div>
            )}
          </div>
          {account.descripcion && <p style={{ fontSize:10, color:C.n700, lineHeight:1.6, margin:'10px 0 0', padding:'10px 0 0', borderTop:`1px solid ${C.n500}`, fontFamily:F }}>{account.descripcion}</p>}
          {/* acceso directo al perfil completo en Clientes / Proveedores */}
          {esFichaAuxiliar && (
            <button onClick={()=>router.push(`/clientes?open=${encodeURIComponent(account.code)}&nombre=${encodeURIComponent(account.nombre)}&tipo=${esCliente?'02':'04'}`)}
              style={{ marginTop:10, width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6, height:30, border:`1px solid ${C.brandBd}`, background:C.brandBg, color:BRAND, borderRadius:radius.sm, fontSize:11, fontWeight:500, cursor:'pointer', fontFamily:F }}>
              <IcUser className="w-3.5 h-3.5"/>
              Ver perfil completo en {esCliente?'Clientes':'Proveedores'}
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke={BRAND} strokeWidth="1.6"><path d="M5.25 2.33L9.92 7L5.25 11.67" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>

        {/* Subcuentas / Auxiliares */}
        {subcuentas.length>0 && (
          <div style={{ padding:'7px 14px', borderTop:`1px solid ${C.n500}` }}>
            {esAuxiliar ? (
              <>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
                  <Label>{esCliente ? `Clientes (${subcuentas.length})` : `Proveedores (${subcuentas.length})`}</Label>
                  {canAddChild && (
                    <button onClick={()=>onAddChild(account)}
                      style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:BRAND, background:C.brandBg, border:`1px solid ${C.brandBd}`, borderRadius:radius.sm, padding:'3px 8px', cursor:'pointer', fontFamily:F }}>
                      <IcPlus className="w-3 h-3"/>
                      {esCliente ? 'Agregar cliente' : 'Agregar proveedor'}
                    </button>
                  )}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {subcuentas.map(child=>(
                    <button key={child.id} onClick={()=>onSelect(child)}
                      style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'9px 10px', background:'#fff', borderRadius:radius.md, border:`1px solid ${C.n500}`, cursor:'pointer', textAlign:'left', fontFamily:F, width:'100%' }}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=C.brandBg}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='#fff'}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background: esCliente ? '#E6F1FB' : '#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <span style={{ fontSize:10, fontWeight:600, color: esCliente ? '#185FA5' : C.successDk }}>
                          {child.nombre.split(' ').slice(0,2).map((w:string)=>w[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:2 }}>
                          <span style={{ fontSize:9, fontWeight:600, color: esCliente ? '#185FA5' : C.successDk, fontFamily:F, background: esCliente ? '#E6F1FB' : '#E1F5EE', padding:'1px 4px', borderRadius:3 }}>
                            {child.code.split('-').pop()}
                          </span>
                          <span style={{ fontSize:9, padding:'1px 5px', borderRadius:3, background:'#F0F0F0', color:C.n700, fontFamily:F }}>{esCliente?'Cliente':'Proveedor'}</span>
                          <span style={{ fontSize:11, fontWeight:500, color:C.n900, fontFamily:F, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{child.nombre}</span>
                        </div>
                        <p style={{ fontSize:10, color:BRAND, margin:0, fontFamily:F, fontWeight:500 }}>
                          {child.code}
                          {/* identificación legible junto al código */}
                          {child.entornoFiscal?.numeroIdentificacion && (
                            <span style={{ color:C.n700, fontWeight:400 }}> · Id. {child.entornoFiscal.numeroIdentificacion}</span>
                          )}
                        </p>
                      </div>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.5" style={{ flexShrink:0, marginTop:7 }}><path d="M5.25 2.33L9.92 7L5.25 11.67" strokeLinecap="round"/></svg>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <Label>Subcuentas ({subcuentas.length})</Label>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {subcuentas.map(child=>(
                    <button key={child.id} onClick={()=>onSelect(child)}
                      style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 10px', background:C.n200, borderRadius:radius.md, border:`1px solid ${C.n500}`, cursor:'pointer', textAlign:'left', fontFamily:F, width:'100%' }}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=C.brandBg}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=C.n200}>
                      <div>
                        <p style={{ fontSize:11, fontWeight:500, color:C.n900, margin:0, fontFamily:F }}>{child.code}</p>
                        <p style={{ fontSize:10, color:C.n700, margin:0, fontFamily:F }}>{child.nombre}</p>
                      </div>
                      <div style={{ display:'flex', gap:4 }}>
                        <span style={{ fontSize:9, padding:'2px 5px', borderRadius:4, background:child.nivel==='detalle'?C.brandBg:'#F5F5F5', color:child.nivel==='detalle'?BRAND:C.n700, fontFamily:F }}>
                          {child.nivel==='detalle'?'Plan':'Estructura'}
                        </span>
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.5"><path d="M5.25 2.33L9.92 7L5.25 11.67" strokeLinecap="round"/></svg>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

                {/* Centros de costo view mode shows only assigned ones, read-only */}
        {hasCCSection && (
          <div style={{ padding:'7px 14px', borderTop:`1px solid ${C.n500}` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
              <Label>Centros de costo{ccAsignados.length>0&&` (${ccAsignados.length})`}</Label>
              {(account.centroCostoObligatorio||account.usaCentroCosto) && (
                <span style={{ fontSize:9, color:BRAND, background:C.brandBg, padding:'2px 7px', borderRadius:10, fontFamily:F }}>Obligatorio</span>
              )}
            </div>
            {ccAsignados.length === 0 ? (
              <p style={{ fontSize:11, color:C.n700, margin:0, fontFamily:F }}>Sin centros de costo asignados. Podés asignarlos al editar la cuenta.</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {CENTROS_COSTO.filter(cc=>ccAsignados.includes(cc.id)).map(cc=>(
                  <div key={cc.id} style={{ display:'flex', alignItems:'center', gap:9, padding:'6px 10px', borderRadius:radius.sm, border:`1px solid ${C.brandBd}`, background:C.brandBg }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:BRAND, flexShrink:0 }}/>
                    <div>
                      <p style={{ fontSize:10, fontWeight:500, color:C.n900, margin:0, fontFamily:F }}>{cc.descripcion}</p>
                      <p style={{ fontSize:9, color:C.n700, margin:0, fontFamily:F }}>{cc.codigo}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chequera - solo cuentas Banco */}
        {esBanco && (
          <div style={{ padding:'7px 14px', borderTop:`1px solid ${C.n500}` }}>
            <Label>Chequera</Label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:7 }}>
              {['Prefijo','Consecutivo','Reporte'].map(f=>(
                <div key={f}>
                  <p style={{ fontSize:9, color:C.n700, margin:'0 0 4px', fontFamily:F }}>{f}</p>
                  <input placeholder="-" style={{ width:'100%', height:26, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:10, fontFamily:F, outline:'none' }}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saldo - solo posteables */}
        {account.posteable && (
          <div style={{ padding:'7px 14px', borderTop:`1px solid ${C.n500}` }}>
            <div style={{ background:C.brandBg, border:`1px solid ${C.brandBd}`, borderRadius:radius.md, padding:12 }}>
              <p style={{ fontSize:9, color:C.n700, margin:'0 0 4px', fontFamily:F }}>Saldo actual</p>
              <div style={{ display:'flex', alignItems:'baseline', gap:5 }}>
                <span style={{ fontSize:11, color:C.brand, fontFamily:F }}>{account.moneda==='USD'?'$':account.moneda==='EUR'?'€':'¢'}</span>
                <span style={{ fontSize:18, fontWeight:600, color:BRAND, fontFamily:F }}>{fmt(account.saldo??0)}</span>
              </div>
              <p style={{ fontSize:9, color:C.n700, margin:'6px 0 0', fontFamily:F }}>
                Al {account.fechaUltimoAsiento ? account.fechaUltimoAsiento : 'último asiento contabilizado (sin movimientos aún)'}
              </p>
            </div>
          </div>
        )}

        {/* Movimientos de ajuste (Catálogo > Movimientos de ajuste) enlazados a esta cuenta */}
        {ajustesEnlazados.length > 0 && (
          <div style={{ padding:'7px 14px', borderTop:`1px solid ${C.n500}` }}>
            <Label>Movimientos de ajuste enlazados ({ajustesEnlazados.length})</Label>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {ajustesEnlazados.map(e=>(
                <div key={e.id} style={{ padding:'8px 10px', background:C.n200, borderRadius:radius.md, border:`1px solid ${C.n500}` }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
                    <span style={{ fontSize:11, fontWeight:500, color:C.n900, fontFamily:F }}>{e.tipoMovimiento}</span>
                    <span style={{ fontSize:9, fontWeight:600, color:e.signo===1?C.successDk:C.error, fontFamily:F }}>{e.signo===1?'Suma':'Resta'}</span>
                  </div>
                  {e.porcentaje !== undefined && (
                    <p style={{ fontSize:10, color:C.n700, margin:'3px 0 0', fontFamily:F }}>
                      Porcentaje: <strong style={{color:C.n900}}>{e.porcentaje}%</strong>
                    </p>
                  )}
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:5 }}>
                    {e.aplicaA.map(op=>(
                      <span key={op} style={{ fontSize:9, padding:'1px 6px', borderRadius:radius.pill, background:'#fff', border:`1px solid ${C.n500}`, color:C.n700, fontFamily:F }}>
                        {OPERACIONES_AJUSTE.find(o=>o.value===op)?.label ?? op}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete */}
        {canDelete && (
          <div style={{ padding:'7px 14px 14px' }}>
            <button onClick={()=>setConfirmDel(true)} style={{ fontSize:11, color:C.error, background:'none', border:`1px solid ${C.error}`, borderRadius:radius.sm, padding:'5px 10px', cursor:'pointer', fontFamily:F }}>
              Eliminar cuenta
            </button>
          </div>
        )}

        {/* Traslado de saldo - only for posteable accounts */}
        {account.posteable && (
          <div style={{ padding:'0 14px 14px', borderTop:`1px solid ${C.n500}`, paddingTop:10 }}>
            {trasladoResult ? (
              // Show completed traslado info
              <div style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', background:'rgba(29,158,117,.08)', border:'1px solid rgba(29,158,117,.25)', borderRadius:radius.md }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="rgba(29,158,117,.15)"/><path d="M5 8.5L7 10.5L11 6" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:10, fontWeight:600, color:C.success, margin:'0 0 2px', fontFamily:F }}>Traslado realizado</p>
                  <p style={{ fontSize:10, color:C.n700, margin:0, fontFamily:F }}>
                    Desde <strong>{trasladoResult.origenCodigo}</strong> el {trasladoResult.fecha}. Ref: {trasladoResult.asientoRef}
                  </p>
                </div>
              </div>
            ) : (
              // Show traslado offer
              <div style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', background:C.n200, border:`1px solid ${C.n500}`, borderRadius:radius.md }}>
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke={C.n700} strokeWidth="1.4">
                  <path d="M3 9h12M9 3l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p style={{ fontSize:10, color:C.n700, margin:0, flex:1, fontFamily:F }}>
                  Puede migrar el saldo de una cuenta existente a esta.
                </p>
                <button onClick={onTraslado}
                  style={{ fontSize:10, color:BRAND, background:'none', border:`1px solid ${C.brandBd}`, borderRadius:radius.sm, padding:'4px 10px', cursor:'pointer', fontFamily:F, whiteSpace:'nowrap' }}>
                  Trasladar saldo
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {confirmDel && (
        <Modal open title="Eliminar cuenta" onClose={()=>setConfirmDel(false)}
          footer={<div style={{ display:'flex', gap:7, justifyContent:'flex-end' }}>
            <Button variant="secondary" onClick={()=>setConfirmDel(false)}>Cancelar</Button>
            <Button variant="danger" onClick={()=>{ onDelete(account.id); setConfirmDel(false); }}>Eliminar</Button>
          </div>}>
          <p style={{ fontSize:11, color:C.n700, fontFamily:F }}>¿Seguro que querés eliminar <strong>{account.nombre}</strong> ({account.code})? Esta acción no se puede deshacer.</p>
        </Modal>
      )}
    </>
  );
}

// ── Edit/Create form ──────────────────────────────────────────────────────────
function EditForm({ account, parentAccount, allNodes, onSave, onCancel, isNew }: {
  account:Cuenta|null; parentAccount:Cuenta|null; allNodes:Cuenta[];
  onSave:(c:Cuenta)=>void; onCancel:()=>void; isNew:boolean;
}) {
  const { centrosCosto: CENTROS_COSTO } = useCentrosCostoConfig();
  // For new accounts: default to 'mayor' unless parent forces a specific child level
  const defaultNivel: Nivel = isNew
    ? (parentAccount ? (getChildNivelConfigurable(parentAccount.nivel) ?? 'mayor') : 'mayor')
    : (account?.nivel ?? 'mayor');

  const [nivelSel, setNivelSel] = useState<Nivel>(defaultNivel);
  const [parentSel, setParentSel] = useState<Cuenta|null>(parentAccount);
  const effectiveParent = parentAccount ?? parentSel;
  const nivel: Nivel = !isNew ? (account?.nivel ?? 'mayor') : nivelSel;

  const esAuxiliar2 = nivel === 'auxiliar';
  const segLen = LONGITUD[nivel] ?? 4;

  // Prefix from parent (if parent is selected)
  const prefix = isNew && effectiveParent ? buildCodePrefix(effectiveParent) : '';
  // siempre se ofrece la sugerencia de código que sigue en el nivel.
  // Mayor no tiene cuenta padre que consultar - se sugiere en base al catálogo completo.
  const suggestion = isNew
    ? (nivel === 'mayor' ? suggestNextMayorSegment(allNodes) : suggestNextSegment(effectiveParent ?? null))
    : '';

  const currentSegment = !isNew && account?.code
    ? account.code.split(SEP).pop() ?? ''
    : suggestion;

  const [form, setForm] = useState({
    nombre:                 account?.nombre??'',
    nombreAlt:              account?.nombreAlt??'',
    codeSegment:            currentSegment,
    grupo:                  account?.grupo??(parentAccount?.grupo??'1'),
    moneda:                 account?.moneda??'CRC',
    centroCostoObligatorio: account?.centroCostoObligatorio??false,
    usaCentroCosto:         account?.usaCentroCosto??false,
    descripcion:            account?.descripcion??'',
    grupoPatrimonio:        account?.grupoPatrimonio??'',
    tipoEspecial:           account?.tipoEspecial??'',
    centrosCostoIds:        account?.centrosCostoIds??[],
    tipoIdentificacion:     account?.entornoFiscal?.tipoIdentificacion??'juridica',
    numeroIdentificacion:   account?.entornoFiscal?.numeroIdentificacion??'',
    regimenFiscal:          account?.entornoFiscal?.regimen??'tradicional',
    diasCredito:            account?.diasCredito!=null ? String(account.diasCredito) : '',
    esCuentaImpuesto:       !!account?.configImpuesto,
    impuestoRol:            account?.configImpuesto?.rol ?? 'debito',
    impuestoTipo:           account?.configImpuesto?.tipoImpuesto ?? 'iva',
  });
  const [bancarias, setBancarias] = useState<{ id:string; banco:string; numero:string; moneda:string; tipo:string }[]>(account?.bancarias??[]);
  function agregarBancaria() {
    setBancarias(b=>[...b, { id:genId(), banco:'', numero:'', moneda:'CRC', tipo:'corriente' }]);
  }
  function actualizarBancaria(id:string, patch:Partial<{banco:string;numero:string;moneda:string;tipo:string}>) {
    setBancarias(b=>b.map(x=>x.id===id?{...x,...patch}:x));
  }
  function eliminarBancaria(id:string) {
    setBancarias(b=>b.filter(x=>x.id!==id));
  }
  // ── Clasificación NIIF - un solo selector con búsqueda ───────────────────────
  const initialLeaf = NIIF_LEAVES.find(l=>l.grupo===form.grupo) ?? null;
  const [niifLeaf, setNiifLeaf] = useState<NiifLeaf|null>(initialLeaf);

  function handleNiifSelect(leaf: NiifLeaf) {
    setNiifLeaf(leaf);
    set('grupo', leaf.grupo);
  }
  const [errors, setErrors] = useState<Record<string,string>>({});

  function set<K extends keyof typeof form>(field:K, value: typeof form[K]) {
    setForm(f=>({...f,[field]:value}));
    if (errors[field]) setErrors(e=>({...e,[field]:''}));
  }

  // El código sugerido solo se conocía al montar el formulario (useState
  // initializer), así que cambiar de nivel (Mayor → Sub mayor, etc.) dejaba el
  // segmento sugerido "viejo" pegado en el input aunque todavía no hubiera
  // cuenta madre seleccionada. Se recalcula cada vez que cambia el nivel o la
  // cuenta madre elegida: Mayor siempre tiene sugerencia; Sub mayor/Detalle solo
  // sugieren una vez que se eligió la cuenta madre, y se vacían mientras tanto.
  useEffect(() => {
    if (!isNew) return;
    if (nivel === 'mayor') {
      set('codeSegment', suggestNextMayorSegment(allNodes));
    } else if (effectiveParent) {
      set('codeSegment', suggestNextSegment(effectiveParent));
    } else {
      set('codeSegment', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, nivel, effectiveParent?.id]);

  // ── Jerarquía de herencia ─────────────────────────────────────────────────
  // Centro de costo y Rol especial: se definen únicamente en Detalle; Auxiliar hereda.
  // Mayor y Sub mayor son puramente estructurales, no aplica ninguno de los dos.
  const ccObligatorioBySpec = isCCObligatorioBySpec(form.grupo, form.tipoEspecial||null);
  const ccEffective = nivel === 'detalle'
    ? (ccObligatorioBySpec || form.centroCostoObligatorio || form.usaCentroCosto)
    : nivel === 'auxiliar'
    ? !!(effectiveParent?.centroCostoObligatorio || effectiveParent?.usaCentroCosto)
    : false;
  const tipoEspecialEffective = nivel === 'detalle'
    ? (form.tipoEspecial || null)
    : nivel === 'auxiliar'
    ? (effectiveParent?.tipoEspecial ?? null)
    : null;

  const fullCode = isNew
    ? (effectiveParent ? prefix + form.codeSegment.trim() : form.codeSegment.trim())
    : (account?.code?.split(SEP).slice(0,-1).concat(form.codeSegment.trim()).join(SEP) ?? form.codeSegment.trim());

  const naturaleza = getNaturaleza(form.grupo);
  const posteable = isPosteable(nivel);
  const grupoLocked = !!parentAccount;
  const esPatrimonio = form.grupo==='3';
  const codeErr = isNew && fullCode && codeExists(allNodes, fullCode, null);
  const esProveedorAuxiliar = nivel === 'auxiliar' && tipoEspecialEffective === '04';
  const esClienteAuxiliar = nivel === 'auxiliar' && (tipoEspecialEffective === '02' || tipoEspecialEffective === '03');
  const esClienteOProveedorAuxiliar = esProveedorAuxiliar || esClienteAuxiliar;

  function validate() {
    const e: Record<string,string> = {};
    if (!form.nombre.trim()) e.nombre='El nombre es obligatorio';
    const seg = form.codeSegment.trim();
    if (!seg) e.codeSegment='El código es obligatorio';
    else if (!/^\d+$/.test(seg)) e.codeSegment='Solo se permiten dígitos';
    // No enforced length - user can configure segment length in Parámetros generales
    else if (codeExists(allNodes, fullCode, account?.id??null)) e.codeSegment='Este código ya existe en el catálogo';
    // La identificación es obligatoria para clientes/proveedores sin importar si se
    // crean acá (Catálogo de cuentas) o desde Clientes/Proveedores - ambas puntas
    // deben quedar igual de completas.
    if (esClienteOProveedorAuxiliar && !form.numeroIdentificacion.trim()) e.numeroIdentificacion='La identificación es obligatoria';
    setErrors(e);
    return Object.keys(e).length===0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave({
      id: account?.id??'_new_'+Date.now(),
      code: fullCode,
      nombre: form.nombre.trim(),
      nombreAlt: form.nombreAlt.trim(),
      grupo: form.grupo,
      moneda: form.moneda,
      naturaleza,
      nivel,
      posteable,
      centroCostoObligatorio: ccEffective,
      usaCentroCosto: ccEffective,
      centrosCostoIds: form.centrosCostoIds,
      descripcion: form.descripcion.trim(),
      grupoPatrimonio: esPatrimonio?(form.grupoPatrimonio||null):null,
      tipoEspecial: tipoEspecialEffective,
      parentId: effectiveParent?.id??account?.parentId??undefined,
      children: account?.children??[],
      expanded: account?.expanded??false,
      saldo: account?.saldo??0,
      configImpuesto: (nivel==='detalle' && form.esCuentaImpuesto)
        ? { rol: form.impuestoRol as 'acreditable'|'debito', tipoImpuesto: form.impuestoTipo }
        : null,
      ...(esClienteOProveedorAuxiliar ? {
        entornoFiscal: {
          tipoIdentificacion: form.tipoIdentificacion,
          numeroIdentificacion: form.numeroIdentificacion.trim(),
          regimen: form.regimenFiscal,
        },
        bancarias,
        diasCredito: form.diasCredito.trim() ? parseInt(form.diasCredito,10) : 0,
      } : {}),
    } as Cuenta);
  }

  return (
    <>
      {/* Header */}
      <div style={{ padding:'0 14px', height:52, borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <p style={{ fontSize:13, fontWeight:600, color:C.n900, margin:0, fontFamily:F }}>
            {isNew
              ? parentAccount?.tipoEspecial==='02'||parentAccount?.tipoEspecial==='03' ? 'Nuevo cliente'
              : parentAccount?.tipoEspecial==='04' ? 'Nuevo proveedor'
              : 'Nueva cuenta'
              : 'Editar cuenta'}
          </p>
          {parentAccount && (
            <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:3 }}>
              <span style={{ fontSize:10, color:C.n700, fontFamily:F }}>Subcuenta de:</span>
              <span style={{ fontSize:10, fontWeight:600, color:BRAND, fontFamily:F }}>{parentAccount.code}</span>
              <span style={{ fontSize:10, color:'#0F0F0F', fontFamily:F }}>{parentAccount.nombre}</span>
              <span style={{ fontSize:9, padding:'1px 5px', borderRadius:4, background:'#F0F0F0', color:C.n700, fontFamily:F }}>{NIVEL_LABELS[parentAccount.nivel]}</span>
            </div>
          )}
        </div>
        <button onClick={onCancel} style={{ width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:radius.sm, border:'none', background:'none', cursor:'pointer', color:C.n700 }}>
          <IcClose className="w-4 h-4"/>
        </button>
      </div>

      {/* Nivel + Clasificación - solo al crear una cuenta raíz (sin cuenta madre
          forzada). Cuando se crea desde "+ Sub" de una cuenta existente, el nivel
          y el grupo ya están determinados por esa cuenta madre: el Header ya
          muestra "Subcuenta de: CODE NOMBRE" y el panel de especificaciones más
          abajo ya informa Nivel/Naturaleza/Acepta movimientos, así que preguntarlo
          de nuevo acá era redundante. */}
      {isNew && !parentAccount && (
        <div style={{ margin:'12px 14px 0', display:'flex', flexDirection:'column', gap:10, flexShrink:0 }}>

          {/* ─── NIVEL CONTABLE - se pregunta primero, tabs tipo pill ─── */}
          <div>
            <p style={{ fontSize:9, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.06em', margin:'0 0 7px', fontFamily:F }}>Nivel contable</p>
            <div style={{ display:'flex', background:'#F0F0F0', borderRadius:radius.md, padding:3, gap:2 }}>
              {(['mayor','submajor','detalle','auxiliar'] as const).map(v => {
                const labels: Record<string,string> = { mayor:'Mayor', submajor:'Sub mayor', detalle:'Detalle', auxiliar:'Auxiliar' };
                return (
                  <button key={v} onClick={() => { setNivelSel(v as Nivel); setParentSel(null); }}
                    style={{ flex:1, height:26, borderRadius:radius.sm, border:'none', cursor:'pointer', fontSize:11, fontFamily:F, fontWeight:500,
                      background: nivelSel === v ? BRAND : 'transparent',
                      color: nivelSel === v ? '#fff' : C.n700,
                      transition:'all .15s',
                    }}>
                    {labels[v] ?? v}
                  </button>
                );
              })}
            </div>
            {nivelSel === 'auxiliar' && (
              <p style={{ fontSize:10, color:C.n700, margin:'6px 0 0', fontFamily:F }}>
                Se usa para crear un cliente o proveedor nuevo, bajo la cuenta Detalle que corresponda.
              </p>
            )}
          </div>

          {/* ─── MAYOR - único nivel donde se pregunta el Grupo NIIF ─── */}
          {nivelSel === 'mayor' && (
            <FormField label="Grupo NIIF *">
              <NiifSearchSelect selected={niifLeaf} onSelect={handleNiifSelect}/>
            </FormField>
          )}

          {/* ─── SUB MAYOR / DETALLE / AUXILIAR - solo se pregunta la cuenta madre; /#5:
              el Grupo NIIF ya viene incluido en esa cuenta madre, así que solo se informa.
              Auxiliar incluida acá: sin este paso, crear un proveedor/cliente desde "Nueva
              cuenta" (sin venir del botón "+" de una fila) no tenía forma de elegir a qué
              cuenta Detalle pertenece, así que nunca se detectaba como proveedor y los campos
              de entorno fiscal / cuentas bancarias / días de crédito no aparecían nunca. ─── */}
          {(nivelSel === 'submajor' || nivelSel === 'detalle' || nivelSel === 'auxiliar') && (() => {
            const lbl = nivelSel === 'submajor' ? 'Cuenta Mayor' : nivelSel === 'detalle' ? 'Cuenta Sub Mayor' : 'Cuenta Detalle';
            const requiredNivel = nivelSel === 'submajor' ? 'mayor' : nivelSel === 'detalle' ? 'submajor' : 'detalle';
            const candidatos = (allNodes as Cuenta[]).filter(n => n.nivel === requiredNivel);
            const groups = nivelSel === 'submajor'
              ? (() => {
                  const map = new Map<string, { label:string; items: Cuenta[] }>();
                  for (const c of candidatos) {
                    const key = c.grupo;
                    if (!map.has(key)) map.set(key, { label: GRUPOS_NIIF.find(g=>g.value===c.grupo)?.label ?? c.grupo, items: [] });
                    map.get(key)!.items.push(c);
                  }
                  return Array.from(map.entries())
                    .sort((a,b)=>a[0].localeCompare(b[0]))
                    .map(([,g])=>({ parent:null, label:g.label, items:[...g.items].sort((a,b)=>a.code.localeCompare(b.code)) }));
                })()
              : (() => {
                  const map = new Map<string, { parent: Cuenta|null; items: Cuenta[] }>();
                  for (const c of candidatos) {
                    const parent = c.parentId ? (allNodes as Cuenta[]).find(n=>n.id===c.parentId) ?? null : null;
                    const key = parent?.id ?? '__sin_padre__';
                    if (!map.has(key)) map.set(key, { parent, items: [] });
                    map.get(key)!.items.push(c);
                  }
                  return Array.from(map.values())
                    .sort((a,b)=>(a.parent?.code??'').localeCompare(b.parent?.code??''))
                    .map(g=>({ ...g, items: [...g.items].sort((a,b)=>a.code.localeCompare(b.code)) }));
                })();
            const grupoHeredadoLabel = parentSel ? (GRUPOS_NIIF.find(g=>g.value===parentSel.grupo)?.label ?? parentSel.grupo) : null;
            return (
              <div>
                <p style={{ fontSize:10, fontWeight:500, color:'#0F0F0F', margin:'0 0 4px', fontFamily:F }}>{lbl} <span style={{ color:C.error }}>*</span></p>
                <AccountPickerSelect
                  groups={groups}
                  selected={parentSel}
                  placeholder="Buscar cuenta padre por código o nombre…"
                  onSelect={c => { setParentSel(c); set('grupo', c.grupo); }}
                  emptyLabel={candidatos.length===0 ? `No hay cuentas ${lbl.replace('Cuenta ','')} creadas todavía.` : undefined}
                />
                {parentSel ? (
                  <p style={{ fontSize:10, color:C.n700, margin:'5px 0 0', fontFamily:F }}>
                    Grupo NIIF: <strong style={{ color:BRAND }}>{grupoHeredadoLabel}</strong>
                  </p>
                ) : (
                  <p style={{ fontSize:10, color:C.n700, margin:'5px 0 0', fontFamily:F }}>
                    {candidatos.length===0 ? `No hay cuentas ${lbl.replace('Cuenta ','')} creadas todavía.` : `Seleccioná la ${lbl.toLowerCase()}.`}
                  </p>
                )}
              </div>
            );
          })()}

        </div>
      )}



      {/* Derived fields banner - simplificado para auxiliar */}
      {nivel !== 'auxiliar' && (
        <div style={{ margin:'12px 14px 0', padding:10, background:'#FAFAFA', border:`1px solid ${C.n500}`, borderRadius:radius.md, display:'flex', gap:17, flexShrink:0 }}>
          <div>
            <p style={{ fontSize:9, color:C.n700, margin:'0 0 2px', fontFamily:F }}>Nivel</p>
            <p style={{ fontSize:11, fontWeight:500, color:C.n900, margin:0, fontFamily:F }}>{NIVEL_LABELS[nivel]??nivel}</p>
          </div>
          <div>
            <p style={{ fontSize:9, color:C.n700, margin:'0 0 2px', fontFamily:F }}>Naturaleza</p>
            <p style={{ fontSize:11, fontWeight:500, color:C.n900, margin:0, fontFamily:F }}>{naturaleza}</p>
          </div>
          <div>
            <p style={{ fontSize:9, color:C.n700, margin:'0 0 2px', fontFamily:F }}>Acepta movimientos</p>
            <p style={{ fontSize:11, fontWeight:500, color:posteable?BRAND:C.n700, margin:0, fontFamily:F }}>{posteable?'Sí':'No'}</p>
          </div>
        </div>
      )}
      {nivel==='detalle' && <p style={{ fontSize:10, color:BRAND, margin:'5px 14px 0', fontFamily:F, lineHeight:1.5 }}>Cuenta final · acepta asientos contables.</p>}
      {nivel==='submajor' && <p style={{ fontSize:10, color:C.n700, margin:'5px 14px 0', fontFamily:F, lineHeight:1.5 }}>Sub mayor (Estructura) · subdivide la Mayor. No acepta movimientos.</p>}
      {nivel==='mayor'    && <p style={{ fontSize:10, color:C.n700, margin:'5px 14px 0', fontFamily:F, lineHeight:1.5 }}>Mayor · raíz contable (ej. 100). Solo agrupa sub mayores, no acepta movimientos.</p>}
      {nivel==='auxiliar' && <p style={{ fontSize:10, color:BRAND, margin:'5px 14px 0', fontFamily:F, lineHeight:1.5 }}>Auxiliar · cuenta de cliente o proveedor. Acepta asientos y centros de costo.</p>}

      <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:12 }}>
        {/* Código */}
        <div>
          <p style={{ fontSize:10, fontWeight:500, color:C.n900, margin:'0 0 7px', fontFamily:F }}>Código contable <span style={{ color:C.error }}>*</span></p>

          {/* Input: prefijo (si hay cuenta madre) + segmento nuevo */}
          <div style={{ display:'flex', border:`1px solid ${errors.codeSegment?C.error:C.n500}`, borderRadius:radius.md, overflow:'hidden' }}>
            {prefix && (
              <div style={{ display:'flex', alignItems:'center', padding:'0 10px', background:'#F5F5F5', borderRight:`1px solid ${C.n500}`, fontSize:13, color:C.n700, fontFamily:F, flexShrink:0, letterSpacing:'.02em' }}>
                {prefix}
              </div>
            )}
            <input
              value={form.codeSegment}
              onChange={e=>{
                const val = e.target.value.replace(/\D/g,'').slice(0, segLen);
                set('codeSegment',val);
              }}
              maxLength={segLen}
              placeholder={'0'.repeat(segLen)}
              style={{ flex:1, height:33, padding:'0 10px', fontSize:13, fontFamily:F, color:C.n900, background:'#fff', border:'none', outline:'none', letterSpacing:'.08em' }}
            />
          </div>

          {errors.codeSegment ? (
            <p style={{ fontSize:10, color:C.error, margin:'4px 0 0', fontFamily:F }}>{errors.codeSegment}</p>
          ) : (
            <p style={{ fontSize:10, color:C.n700, margin:'4px 0 0', fontFamily:F }}>
              {!isNew && <>Editando código <strong>{account?.code}</strong></>}
              {isNew && (fullCode
                ? <>Código completo: <strong style={{ color:!codeErr?BRAND:C.error }}>{fullCode}</strong>{!codeErr?' · disponible':' · ya existe'}</>
                : `Ingresá ${segLen} dígitos${prefix?` (se agrega después de ${prefix})`:''}`)}
            </p>
          )}
        </div>

        {/* ── Datos principales - grid de 2 columnas para evitar scroll ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <FormField label="Nombre" required error={errors.nombre}>
            <Input value={form.nombre} onChange={v=>set('nombre',v)} placeholder="Ej. Caja general colones" error={errors.nombre}/>
          </FormField>
          <FormField label="Nombre alternativo" hint="Para reportes en divisa">
            <Input value={form.nombreAlt} onChange={v=>set('nombreAlt',v)} placeholder="Ej. General cash"/>
          </FormField>

          {/* Grupo NIIF - solo editable al editar una cuenta existente. Al crear una
              subcuenta desde "+ Sub" el grupo ya viene de la cuenta madre (el Header
              ya dice "Subcuenta de: CODE NOMBRE"), así que no se repite acá. */}
          {!isNew && (
            <div style={{ gridColumn:'1/-1' }}>
              <FormField label="Grupo NIIF">
                {grupoLocked ? (
                  <>
                    <Select value={form.grupo} onChange={v=>set('grupo',v)} disabled options={GRUPOS_NIIF.map(g=>({value:g.value,label:g.label}))}/>
                    <p style={{ fontSize:10, color:C.n700, margin:'4px 0 0', fontFamily:F }}>Heredado del padre · no editable</p>
                  </>
                ) : (
                  <NiifSearchSelect selected={niifLeaf} onSelect={handleNiifSelect}/>
                )}
              </FormField>
            </div>
          )}

          {/* Moneda - oculta en auxiliar */}
          {nivel !== 'auxiliar' && (
            <FormField label="Moneda">
              <Select value={form.moneda} onChange={v=>set('moneda',v)} options={MONEDAS.map(m=>({value:m.value,label:m.label}))}/>
            </FormField>
          )}

          {/* Grupo patrimonio */}
          {esPatrimonio && (
            <FormField label="Grupo de patrimonio" hint="Cómo aparece en el Estado de cambios en el patrimonio.">
              <Select value={form.grupoPatrimonio} onChange={v=>set('grupoPatrimonio',v)} options={[{value:'',label:'Sin asignar'},...GRUPOS_PATRIMONIO]}/>
            </FormField>
          )}

          {/* ── Rol especial se define únicamente en Detalle; Auxiliar hereda (badge abajo) ── */}
          {nivel === 'detalle' && (
            <FormField label="Rol especial">
              <Select value={form.tipoEspecial} onChange={v=>set('tipoEspecial',v)} options={[{value:'',label:'Sin rol especial'},...TIPOS_ESPECIAL.filter(t=>t.value)]}/>
            </FormField>
          )}

          {/* Configuración de impuestos (dashboard 1.6) - identifica esta cuenta como
              captadora de impuesto acreditable o débito fiscal, y de qué tipo. El
              indicador de Impuestos del dashboard se arma sumando estas cuentas. */}
          {nivel === 'detalle' && (
            <div style={{ gridColumn:'1/-1' }}>
              <Checkbox checked={form.esCuentaImpuesto} onChange={v=>set('esCuentaImpuesto',v)} label="Es cuenta de impuestos"/>
              {form.esCuentaImpuesto && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:8 }}>
                  <FormField label="Rol">
                    <Select value={form.impuestoRol} onChange={v=>set('impuestoRol', v as 'acreditable'|'debito')} options={[
                      { value:'acreditable', label:'Impuesto acreditable' },
                      { value:'debito',      label:'Impuesto débito fiscal' },
                    ]}/>
                  </FormField>
                  <FormField label="Tipo de impuesto">
                    <Select value={form.impuestoTipo} onChange={v=>set('impuestoTipo',v)} options={TIPOS_IMPUESTO}/>
                  </FormField>
                </div>
              )}
            </div>
          )}
        </div>

        {nivel === 'auxiliar' && effectiveParent?.tipoEspecial && (
          <div style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 10px', background:'#FAFAFA', border:`1px solid ${C.n500}`, borderRadius:radius.md }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={BRAND}><path d="M7 1v6M4 10l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/></svg>
            <div>
              <p style={{ fontSize:9, color:C.n700, margin:0, fontFamily:F }}>Rol especial heredado del Detalle</p>
              <p style={{ fontSize:11, fontWeight:500, color:BRAND, margin:'1px 0 0', fontFamily:F }}>
                {TIPOS_ESPECIAL.find(t=>t.value===effectiveParent.tipoEspecial)?.label ?? effectiveParent.tipoEspecial}
              </p>
            </div>
          </div>
        )}

        {/* ── Centro de costo se define únicamente en Detalle; Auxiliar hereda ── */}
        {nivel === 'detalle' && (
        <div>
          {ccObligatorioBySpec && (
            <div style={{ display:'flex', alignItems:'flex-start', gap:7, padding:'7px 10px', background:C.brandBg, border:`1px solid ${C.brandBd}`, borderRadius:radius.md, marginBottom:7 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={BRAND}><circle cx="7" cy="7" r="5.83"/><path d="M7 4.67v2.33M7 9.33h.01" strokeLinecap="round"/></svg>
              <p style={{ fontSize:10, color:'#8A6200', margin:0, fontFamily:F }}>
                Este tipo de cuenta requiere centro de costo.
              </p>
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:9, opacity:ccObligatorioBySpec?0.6:1, pointerEvents:ccObligatorioBySpec?'none':'auto' }}>
            <input type="checkbox" id="cc-obl" checked={ccEffective} onChange={e=>!ccObligatorioBySpec&&set('centroCostoObligatorio',e.target.checked)} style={{ width:12, height:12, accentColor:BRAND, cursor:'pointer' }}/>
            <label htmlFor="cc-obl" style={{ fontSize:11, color:C.n900, cursor:'pointer', fontFamily:F }}>
              Requiere centro de costo
              {ccObligatorioBySpec && <span style={{ marginLeft:5, fontSize:9, color:BRAND, background:C.brandBg, padding:'1px 5px', borderRadius:4, fontFamily:F }}>Requerido</span>}
            </label>
          </div>
          <p style={{ fontSize:10, color:C.n700, margin:'5px 0 0', fontFamily:F }}>Esta configuración la heredan automáticamente los Auxiliares de esta cuenta.</p>

          {/* Centro de costos - faltaba el selector para elegir cuál(es) centro(s) aplican */}
          {ccEffective && (
            <div style={{ marginTop:10 }}>
              <p style={{ fontSize:10, fontWeight:500, color:C.n900, margin:'0 0 5px', fontFamily:F }}>Centro de costos</p>
              <Select
                value=""
                onChange={id => { if (id && !form.centrosCostoIds.includes(id)) set('centrosCostoIds', [...form.centrosCostoIds, id]); }}
                options={[
                  { value:'', label:'Selecciona el centro de costos' },
                  ...CENTROS_COSTO.filter(cc=>!form.centrosCostoIds.includes(cc.id)).map(cc=>({ value:cc.id, label:`${cc.codigo} · ${cc.descripcion}` })),
                ]}
              />
              {form.centrosCostoIds.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:7 }}>
                  {form.centrosCostoIds.map(id => {
                    const cc = CENTROS_COSTO.find(c=>c.id===id);
                    if (!cc) return null;
                    return (
                      <div key={id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 9px', borderRadius:radius.sm, border:`1px solid ${C.brandBd}`, background:C.brandBg }}>
                        <span style={{ fontSize:10, fontFamily:F, color:'#0F0F0F' }}>{cc.codigo} · {cc.descripcion}</span>
                        <button type="button" onClick={()=>set('centrosCostoIds', form.centrosCostoIds.filter(x=>x!==id))}
                          style={{ display:'flex', alignItems:'center', background:'none', border:'none', cursor:'pointer', color:C.n700 }}>
                          <IcClose className="w-3 h-3"/>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        )}
        {/* Auxiliar: muestra el CC heredado del Detalle (solo lectura) */}
        {nivel === 'auxiliar' && (effectiveParent?.centroCostoObligatorio || effectiveParent?.usaCentroCosto) && (
          <div style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 10px', background:'#FAFAFA', border:`1px solid ${C.n500}`, borderRadius:radius.md }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={BRAND}><path d="M7 1v6M4 10l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/></svg>
            <p style={{ fontSize:10, color:C.n700, margin:0, fontFamily:F }}>
              Centro de costo <strong style={{ color:BRAND }}>obligatorio</strong> · heredado del Detalle
            </p>
          </div>
        )}

        {/* Entorno fiscal + cuentas bancarias + días de crédito - Auxiliar bajo Clientes o Proveedores */}
        {esClienteOProveedorAuxiliar && (
          <div style={{ display:'flex', flexDirection:'column', gap:14, padding:12, background:'#FAFAFA', border:`1px solid ${C.n500}`, borderRadius:radius.md }}>
            <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.06em', margin:0, fontFamily:F }}>
              {esProveedorAuxiliar ? 'Datos del proveedor' : 'Datos del cliente'}
            </p>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <FormField label="Tipo de identificación" required>
                <Select value={form.tipoIdentificacion} onChange={v=>set('tipoIdentificacion',v)} options={TIPOS_IDENTIFICACION_FISCAL}/>
              </FormField>
              <FormField label="N° de identificación" required error={errors.numeroIdentificacion}>
                <Input value={form.numeroIdentificacion} onChange={v=>set('numeroIdentificacion',v)} placeholder="3-101-456789" error={errors.numeroIdentificacion}/>
              </FormField>
              <FormField label="Régimen fiscal">
                <Select value={form.regimenFiscal} onChange={v=>set('regimenFiscal',v)} options={REGIMENES_FISCALES}/>
              </FormField>
              <FormField label="Días de crédito" hint="La fecha de vencimiento de cada factura se calcula sumando estos días.">
                <Input type="number" min="0" value={form.diasCredito} onChange={v=>set('diasCredito',v)} placeholder="0 = contado"/>
              </FormField>
            </div>

            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
                <p style={{ fontSize:10, fontWeight:500, color:C.n900, margin:0, fontFamily:F }}>Cuentas bancarias</p>
                <button type="button" onClick={agregarBancaria} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:BRAND, fontSize:11, fontFamily:F, fontWeight:500 }}>
                  <IcPlus className="w-3 h-3"/> Agregar cuenta
                </button>
              </div>
              {bancarias.length === 0 && (
                <p style={{ fontSize:10, color:C.n700, margin:0, fontFamily:F }}>Sin cuentas bancarias agregadas todavía.</p>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {bancarias.map(b=>(
                  <div key={b.id} style={{ display:'grid', gridTemplateColumns:'1.2fr 1.4fr 0.8fr 0.9fr auto', gap:6, alignItems:'center', padding:8, background:'#fff', border:`1px solid ${C.n500}`, borderRadius:radius.sm }}>
                    <Input value={b.banco} onChange={v=>actualizarBancaria(b.id,{banco:v})} placeholder="Banco"/>
                    <Input value={b.numero} onChange={v=>actualizarBancaria(b.id,{numero:v})} placeholder="N° de cuenta / IBAN"/>
                    <Select value={b.moneda} onChange={v=>actualizarBancaria(b.id,{moneda:v})} options={MONEDAS_BANCO}/>
                    <Select value={b.tipo} onChange={v=>actualizarBancaria(b.id,{tipo:v})} options={TIPOS_CUENTA_BANCO}/>
                    <button type="button" onClick={()=>eliminarBancaria(b.id)} style={{ display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer', color:C.error }}>
                      <IcTrash className="w-3 h-3"/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Descripción */}
        <FormField label="Descripción interna" hint="Nota para el equipo contable.">
          <textarea value={form.descripcion} onChange={e=>set('descripcion',e.target.value)} rows={2}
            placeholder="Describe el uso de esta cuenta..."
            style={{ width:'100%', padding:'7px 9px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, resize:'vertical', outline:'none' }}/>
        </FormField>
      </div>

      <div style={{ borderTop:`1px solid ${C.n500}`, padding:'10px 14px', display:'flex', gap:7, justifyContent:'flex-end', flexShrink:0 }}>
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSubmit} icon={<IcCheck className="w-3 h-3"/>}>
          {isNew?'Crear cuenta':'Guardar cambios'}
        </Button>
      </div>
    </>
  );
}

// ── Orchestrator ──────────────────────────────────────────────────────────────
interface Props {
  mode: 'view'|'edit'|'new';
  account: Cuenta|null;
  parentAccount: Cuenta|null;
  allNodes: Cuenta[];
  onClose: ()=>void;
  onSave: (c:Cuenta)=>void;
  onDelete: (id:string)=>void;
  onAddChild: (p:Cuenta)=>void;
  onModeChange: (m:'view'|'edit'|'new')=>void;
  onSelect: (n:Cuenta)=>void;
  enlacesAjuste?: EnlaceAjuste[];
}
export default function AccountDetail({ mode, account, parentAccount, allNodes, onClose, onSave, onDelete, onAddChild, onModeChange, onSelect, enlacesAjuste }: Props) {
  // Traslado de saldo - state lives here so it persists across mode changes
  const [showTraslado, setShowTraslado] = useState(false);
  const [trasladoCuenta, setTrasladoCuenta] = useState<Cuenta|null>(null);
  const [trasladoResult, setTrasladoResult] = useState<TrasladoResult|null>(null);
  const [toast, setToast] = useState<{message:string;type:'success'|'error'}|null>(null);

  function handleSaveWithTraslado(data: Cuenta) {
    onSave(data);
    onModeChange('view');
    // Traslado is now manual-only - no automatic popup on create
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', fontFamily:F }}>
      {(mode==='edit'||mode==='new') ? (
        <EditForm
          account={mode==='new'?null:account}
          parentAccount={mode==='new'?parentAccount:null}
          allNodes={allNodes}
          isNew={mode==='new'}
          onSave={handleSaveWithTraslado}
          onCancel={()=>{ mode==='new'?onClose():onModeChange('view'); }}
        />
      ) : account ? (
        <>
          <DetailView
            account={account}
            allNodes={allNodes}
            onEdit={()=>onModeChange('edit')}
            onDelete={id=>{ onDelete(id); onClose(); }}
            onAddChild={onAddChild}
            onClose={onClose}
            onSelect={onSelect}
            onTraslado={()=>{ setTrasladoCuenta(account); setShowTraslado(true); }}
            trasladoResult={account.id===trasladoCuenta?.id?trasladoResult:null}
            enlacesAjuste={enlacesAjuste}
          />
        </>
      ) : null}

      {/* Traslado modal */}
      {showTraslado && trasladoCuenta && (
        <ModalTrasladoSaldo
          cuentaDestino={trasladoCuenta}
          cuentas={allNodes}
          onConfirm={(result)=>{
            // Inactivate origin, update destination saldo
            const origen = allNodes.find(c=>c.id===result.origenId);
            if (origen) onSave({...origen, inactiva:true, saldo:0});
            onSave({...trasladoCuenta, saldo:result.origenSaldo});
            setTrasladoResult(result);
            setShowTraslado(false);
            setToast({message:'Traslado realizado y asiento contabilizado.',type:'success'});
            setTimeout(()=>setToast(null),4000);
          }}
          onCancel={()=>setShowTraslado(false)}
        />
      )}

      {toast && (
        <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',zIndex:9999}}>
          <div style={{background:toast.type==='success'?C.success:'#F44336',color:'#fff',padding:'9px 17px',borderRadius:radius.md,fontSize:11,fontFamily:F,boxShadow:'0 4px 16px rgba(0,0,0,.2)'}}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
