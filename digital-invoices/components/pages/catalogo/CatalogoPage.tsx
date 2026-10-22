'use client';
import { useCatalogo, cambiarCatalogo } from './catalogoStore';
import { useEffect, useState, useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { PageHeader, TabBar, Button, Toast, Modal, radius, SearchInput, Select, Checkbox } from '../../ui/primitives';
import { IcPlus, IcImport, IcSearch, IcChevronDown, IcChevronRight } from '../../ui/icons';
import { C, FONT } from '../../ui/primitives';
import {
  Cuenta, CUENTAS_INIT, GRUPOS_NIIF, TIPOS_ESPECIAL, TIPOS_IDENTIFICACION_FISCAL,
  flattenTree, flattenAll, toggleNodeExpanded, addNodeToTree, updateNodeInTree,
  removeNodeFromTree, codeExists, genId, isCCObligatorioBySpec,
  buildCodePrefix, suggestNextSegment, getChildNivel, isPosteable,
  getNaturaleza, fmt, SEP, LONGITUD, canAddChild, NIVEL_LABELS, getChildNivelConfigurable,
  EnlaceAjuste, ENLACES_AJUSTE_INIT,
} from './catalogoData';
import AccountDetail from './AccountDetail';
import { TabCentrosCosto } from './CatalogoTabs';
import { TabGrupoPatrimonio, TabAjustes } from './CatalogoTabs2';
import { simboloLocal } from '@/lib/paisActual';

const F = FONT;
const BRAND = '#A77600';

// Formatea saldo: negativo entre paréntesis, miles con coma
function fmtSaldo(n: number): string {
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
  return n < 0 ? `(${abs})` : abs;
}

// ── Cuentas especiales tab ────────────────────────────────────────────────────
function TabCuentasEspeciales({ cuentas, onUpdateCuenta }: { cuentas: Cuenta[]; onUpdateCuenta: (updated: Partial<Cuenta>&{id:string}) => void }) {
  const flat = flattenTree(cuentas);
  const detalle = flat.filter(n => n.nivel === 'detalle');
  const especiales = flat.filter(n => n.tipoEspecial).sort((a,b) => (a.tipoEspecial??'').localeCompare(b.tipoEspecial??''));
  const [tipo, setTipo] = useState('');
  const [cuentaId, setCuentaId] = useState('');
  const [search, setSearch] = useState('');
  const [filterTipo, setFilter] = useState('all');
  const tipoLabel = (v:string) => TIPOS_ESPECIAL.find(t=>t.value===v)?.label ?? v;
  const visible = especiales
    .filter(n => filterTipo==='all'||n.tipoEspecial===filterTipo)
    .filter(n => !search||n.nombre.toLowerCase().includes(search.toLowerCase())||(n.code||'').includes(search));
  function asignar() {
    if (!tipo||!cuentaId) return;
    onUpdateCuenta({ id:cuentaId, tipoEspecial:tipo });
    setTipo(''); setCuentaId('');
  }
  return (
    <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:14, background:'#F5F5F5', fontFamily:F }}>
      <div style={{ background:'#fff', border:`1px solid ${C.n500}`, borderRadius:radius.md, padding:16 }}>
        <p style={{ fontSize:13, fontWeight:500, margin:'0 0 12px', fontFamily:F }}>Asignar cuenta especial</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
          <div>
            <p style={{ fontSize:11, fontWeight:500, color:C.n900, margin:'0 0 4px', fontFamily:F }}>Tipo de cuenta especial</p>
            <Select value={tipo} onChange={setTipo}
              options={[{ value:'', label:'Seleccionar tipo' }, ...TIPOS_ESPECIAL.filter(t=>t.value).map(t=>({ value:t.value, label:t.label }))]} />
          </div>
          <div>
            <p style={{ fontSize:11, fontWeight:500, color:C.n900, margin:'0 0 4px', fontFamily:F }}>Cuenta contable</p>
            <Select value={cuentaId} onChange={setCuentaId}
              options={[{ value:'', label:'Seleccionar cuenta' }, ...detalle.map(n=>({ value:n.id, label:`${n.code} · ${n.nombre}` }))]} />
          </div>
        </div>
        <Button icon={<IcPlus className="w-3 h-3"/>} disabled={!tipo||!cuentaId} onClick={asignar}>Asignar</Button>
      </div>
      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
        <div style={{ flex:1 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar cuenta…" width="100%" />
        </div>
        <div style={{ width:180, flexShrink:0 }}>
          <Select value={filterTipo} onChange={setFilter}
            options={[{ value:'all', label:'Todos los tipos' }, ...TIPOS_ESPECIAL.filter(t=>t.value).map(t=>({ value:t.value, label:t.label }))]} />
        </div>
      </div>
      <div style={{ background:'#fff', border:`1px solid ${C.n500}`, borderRadius:radius.md, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
          <thead><tr style={{ background:C.n200, borderBottom:`1px solid ${C.n500}` }}>
            {['Tipo especial','Código','Nombre / Razón social','Moneda',''].map(h=><th key={h} style={{ padding:'8px 14px', textAlign:'left', fontWeight:500, fontSize:11, color:C.n700, fontFamily:F }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {visible.length===0&&<tr><td colSpan={5} style={{ padding:24, textAlign:'center', color:C.n700, fontSize:12, fontFamily:F }}>No hay cuentas especiales configuradas.</td></tr>}
            {visible.map(n=>(
              <tr key={n.id} style={{ borderTop:`1px solid ${C.n500}` }}>
                <td style={{ padding:'8px 14px' }}><span style={{ fontSize:11, color:C.brand, fontWeight:500, fontFamily:F }}>{tipoLabel(n.tipoEspecial??'')}</span></td>
                <td style={{ padding:'8px 14px', fontFamily:F }}>{n.code}</td>
                <td style={{ padding:'8px 14px', fontFamily:F }}>{n.nombre}</td>
                <td style={{ padding:'8px 14px', color:C.n700, fontFamily:F }}>{n.moneda}</td>
                <td style={{ padding:'8px 14px', textAlign:'right' }}>
                  <button onClick={()=>onUpdateCuenta({id:n.id, tipoEspecial:null})} style={{ fontSize:12, color:C.error, background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Quitar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Badges ────────────────────────────────────────────────────────────────────
function BadgeBank()  { return <span style={{ display:'inline-flex',alignItems:'center',padding:'0 6px',height:16,borderRadius:radius.pill,fontSize:9,fontWeight:500,fontFamily:F,border:'1px solid #EED89A',background:'#FFF8EC',color:'#A77600',whiteSpace:'nowrap',verticalAlign:'middle',marginLeft:4 }}>Banco</span>; }
function BadgeCli({ label='Clientes' }: { label?: string }) { return <span style={{ display:'inline-flex',alignItems:'center',padding:'0 6px',height:16,borderRadius:radius.pill,fontSize:9,fontWeight:500,fontFamily:F,border:'1px solid #B5D4F4',background:'#E6F1FB',color:'#185FA5',whiteSpace:'nowrap',verticalAlign:'middle',marginLeft:4 }}>{label}</span>; }
function BadgePro({ label='Proveedores' }: { label?: string }) { return <span style={{ display:'inline-flex',alignItems:'center',padding:'0 6px',height:16,borderRadius:radius.pill,fontSize:9,fontWeight:500,fontFamily:F,border:'1px solid #9FE1CB',background:'#E1F5EE',color:C.successDk,whiteSpace:'nowrap',verticalAlign:'middle',marginLeft:4 }}>{label}</span>; }
function BadgeIva()  { return <span style={{ display:'inline-flex',alignItems:'center',padding:'0 6px',height:16,borderRadius:radius.pill,fontSize:9,fontWeight:500,fontFamily:F,border:'1px solid #F5C4B3',background:'#FAECE7',color:'#993C1D',whiteSpace:'nowrap',verticalAlign:'middle',marginLeft:4 }}>IVA</span>; }
function BadgeInv()  { return <span style={{ display:'inline-flex',alignItems:'center',padding:'0 6px',height:16,borderRadius:radius.pill,fontSize:9,fontWeight:500,fontFamily:F,border:'1px solid #AFA9EC',background:'#EEEDFE',color:'#534AB7',whiteSpace:'nowrap',verticalAlign:'middle',marginLeft:4 }}>Inventario</span>; }
function DotPost()   { return <span style={{ display:'inline-block',width:5,height:5,borderRadius:'50%',background:'#4CAF50',marginLeft:4,verticalAlign:'middle',flexShrink:0 }}/>; }

// ── Moneda Cta. compuesta: "₡ - COL" / "$ - USD" ─────────────────────────────
function MonCta({ moneda }: { moneda: string }) {
  const sym = moneda === 'USD' ? '$' : simboloLocal();
  const cod = moneda === 'USD' ? 'USD' : 'COL';
  return <span style={{ fontFamily:F, fontSize:11, color:'#555', whiteSpace:'nowrap' }}>{sym} - {cod}</span>;
}

// ── Row component ─────────────────────────────────────────────────────────────
// indent px por nivel - igual al HTML de referencia
const IND: Record<string,number> = { grupo:12, subgrupo:16, subsubgrupo:32, mayor:16, submajor:32, detalle:32, auxiliar:48 };

function AccountRow({ node, selectedId, onToggle, onSelect, onAddChild }: {
  node: Cuenta & {depth:number}; selectedId:string|null;
  onToggle:(id:string)=>void; onSelect:(n:Cuenta)=>void; onAddChild:(p:Cuenta)=>void;
}) {
  const [hov, setHov] = useState(false);
  const sel = selectedId === node.id;
  const hasKids = !!(node.children?.length);
  const nivel = node.nivel;
  const canAdd = canAddChild(nivel, node.tipoEspecial);
  const ind = IND[nivel] ?? 52;

  // Chevron button shared
  const chevron = (color = '#999') => hasKids
    ? <button onClick={e=>{e.stopPropagation();onToggle(node.id);}} style={{ background:'none',border:'none',cursor:'pointer',color,display:'flex',alignItems:'center',padding:0,flexShrink:0,marginRight:4 }}>
        {node.expanded ? <IcChevronDown className="w-3 h-3"/> : <IcChevronRight className="w-3 h-3"/>}
      </button>
    : <span style={{ width:16, display:'inline-block', flexShrink:0 }}/>;

  // Sub button on hover
  const subBtn = () => (hov||sel) && canAdd
    ? <button onClick={e=>{e.stopPropagation();onAddChild(node);}}
        style={{ display:'flex',alignItems:'center',gap:3,height:19,padding:'0 7px',fontSize:9,fontFamily:F,color:BRAND,background:'#FFF8EC',border:'1px solid #EED89A',borderRadius:4,cursor:'pointer',whiteSpace:'nowrap' }}>
        <IcPlus className="w-2.5 h-2.5"/> Sub
      </button>
    : null;

  // ── grupo NIIF: encabezado de sección ──
  if (nivel === 'grupo') {
    const label = `${node.grupo} · ${node.nombre.toUpperCase()}`;
    return (
      <tr style={{ background: hov ? '#F5F5F5' : '#FAFAFA', cursor:'pointer', borderBottom:'1px solid #E8E8E8' }}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>onToggle(node.id)}>
        <td colSpan={6} style={{ padding:0, height:38 }}>
          <div style={{ display:'flex', alignItems:'center', paddingLeft:12, height:'100%', gap:5 }}>
            <button onClick={e=>{e.stopPropagation();onToggle(node.id);}} style={{ background:'none',border:'none',cursor:'pointer',color:'#555',display:'flex',alignItems:'center',padding:0,flexShrink:0 }}>
              {node.expanded ? <IcChevronDown className="w-3 h-3"/> : <IcChevronRight className="w-3 h-3"/>}
            </button>
            <span style={{ fontFamily:F, fontSize:11, fontWeight:600, color:'#333', letterSpacing:'.04em' }}>{label}</span>
          </div>
        </td>
      </tr>
    );
  }

  // ── subgrupo ──
  if (nivel === 'subgrupo') return (
    <tr style={{ background: hov ? '#FFFBF2' : '#fff', borderBottom:'1px solid #E8E8E8', cursor:'pointer' }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>onToggle(node.id)}>
      <td colSpan={6} style={{ padding:0, height:31 }}>
        <div style={{ display:'flex', alignItems:'center', paddingLeft:ind, height:'100%' }}>
          {chevron()}
          <span style={{ fontFamily:F, fontSize:11, fontWeight:500, color:'#555' }}>{node.nombre}</span>
        </div>
      </td>
    </tr>
  );

  // ── subsubgrupo ──
  if (nivel === 'subsubgrupo') return (
    <tr style={{ background: hov ? '#FFFBF2' : '#fff', borderBottom:'1px solid #F0F0F0', cursor:'pointer' }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>onToggle(node.id)}>
      <td colSpan={6} style={{ padding:0, height:30 }}>
        <div style={{ display:'flex', alignItems:'center', paddingLeft:ind, height:'100%' }}>
          {chevron()}
          <span style={{ fontFamily:F, fontSize:10, fontWeight:400, color:'#888', fontStyle:'italic' }}>{node.nombre}</span>
        </div>
      </td>
    </tr>
  );

  // ── auxiliar ── (código corto: solo último segmento)
  if (nivel === 'auxiliar') {
    const shortCode = (node.code||'').split('-').pop() ?? node.code;
    const isCli = node.tipoEspecial !== '04';
    return (
      <tr style={{ background: sel ? '#FFF8EC' : hov ? '#FFFBF2' : '#fff', borderBottom:'1px solid #F0F0F0', cursor:'pointer' }}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>onSelect(node)}>
        {/* código corto, gris */}
        <td style={{ paddingLeft:ind, paddingRight:10, height:28 }}>
          <span style={{ fontFamily:F, fontSize:10, color:'#9E9E9E', fontVariantNumeric:'tabular-nums' }}>{shortCode}</span>
        </td>
        {/* nombre + badge */}
        <td style={{ padding:'0 10px', height:28, fontSize:10, fontFamily:F, color:'#555' }}>
          {node.nombre}
          {isCli ? <BadgeCli label="Cliente"/> : <BadgePro label="Proveedor"/>}
        </td>
        <td style={{ padding:'0 10px', height:28, fontSize:10, fontFamily:F, color:'#555', whiteSpace:'nowrap' }}>
          {node.entornoFiscal?.numeroIdentificacion
            ? <><span style={{ color:'#9E9E9E' }}>{TIPOS_IDENTIFICACION_FISCAL.find(t=>t.value===node.entornoFiscal!.tipoIdentificacion)?.label ?? ''}</span> {node.entornoFiscal.numeroIdentificacion}</>
            : <span style={{ color:'#C62828' }}>Sin identificación</span>}
        </td>
        {/* saldo sym */}
        <td style={{ padding:'0 10px', height:28, fontSize:10, fontFamily:F, color:'#555' }}>{simboloLocal()}</td>
        {/* tipo especial */}
        <td style={{ padding:'0 10px', height:28 }}></td>
        {/* acciones */}
        <td style={{ padding:'0 7px', height:28, width:60 }}>{subBtn()}</td>
      </tr>
    );
  }

  // ── mayor ──
  if (nivel === 'mayor') {
    const monCta = node.moneda === 'USD' ? '$ - USD' : `${simboloLocal()} - COL`;
    return (
      <tr style={{ background: sel ? '#FFF8EC' : hov ? '#FFFBF2' : '#fff', borderBottom:'1px solid #F0F0F0', cursor:'pointer' }}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>onSelect(node)}>
        <td style={{ paddingLeft:ind, paddingRight:10, height:38 }}>
          <div style={{ display:'flex', alignItems:'center' }}>
            {chevron("#555")}
            {/* Mayor: código en negro, bold, Montserrat */}
            <span style={{ fontFamily:F, fontSize:11, fontWeight:600, color:'#1A1A1A', fontVariantNumeric:'tabular-nums', letterSpacing:'.01em' }}>{node.code}</span>
          </div>
        </td>
        <td style={{ padding:'0 10px', height:38, fontFamily:F, fontWeight:600, color:'#0F0F0F', fontSize:11 }}>{node.nombre}</td>
        <td style={{ padding:'0 10px', height:38, fontFamily:F, fontSize:11, color:'#555', fontWeight:500 }}>{monCta}</td>
        <td style={{ padding:'0 10px', height:38, minWidth:130 }}>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:4 }}>
            <span style={{ fontSize:10, color:'#9E9E9E', fontFamily:F, flexShrink:0 }}>{node.moneda==='USD'?'$':simboloLocal()}</span>
            <span style={{ fontSize:11, fontVariantNumeric:'tabular-nums', fontFamily:F, color:'#0F0F0F', textAlign:'right', flex:1 }}>{fmtSaldo(node.saldo)}</span>
          </div>
        </td>
        <td style={{ padding:'0 10px', height:38 }}></td>
        <td style={{ padding:'0 7px', height:38, width:60 }}>{subBtn()}</td>
      </tr>
    );
  }

  // ── submajor ──
  if (nivel === 'submajor') {
    const monCta = node.moneda === 'USD' ? '$ - USD' : `${simboloLocal()} - COL`;
    return (
      <tr style={{ background: sel ? '#FFF8EC' : hov ? '#FFFBF2' : '#fff', borderBottom:'1px solid #F0F0F0', cursor:'pointer' }}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>onSelect(node)}>
        <td style={{ paddingLeft:ind, paddingRight:10, height:35 }}>
          <div style={{ display:'flex', alignItems:'center' }}>
            {chevron("#999")}
            <span style={{ fontFamily:F, fontSize:11, fontWeight:500, color:'#555', fontVariantNumeric:'tabular-nums' }}>{node.code}</span>
          </div>
        </td>
        <td style={{ padding:'0 10px', height:35, fontFamily:F, fontWeight:500, color:'#333', fontSize:11 }}>{node.nombre}</td>
        <td style={{ padding:'0 10px', height:35, fontFamily:F, fontSize:11, color:'#777' }}>{monCta}</td>
        <td style={{ padding:'0 10px', height:35, minWidth:130 }}>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:4 }}>
            <span style={{ fontSize:10, color:'#9E9E9E', fontFamily:F, flexShrink:0 }}>{node.moneda==='USD'?'$':simboloLocal()}</span>
            <span style={{ fontSize:11, fontVariantNumeric:'tabular-nums', fontFamily:F, color:'#555', textAlign:'right', flex:1 }}>{fmtSaldo(node.saldo)}</span>
          </div>
        </td>
        <td style={{ padding:'0 10px', height:35 }}></td>
        <td style={{ padding:'0 7px', height:35, width:60 }}>{subBtn()}</td>
      </tr>
    );
  }

  // ── detalle ──
  const isAuxActivo = (node.tipoEspecial==='02'||node.tipoEspecial==='03'||node.tipoEspecial==='04') && hasKids;
  const monCta = node.moneda === 'USD' ? '$ - USD' : `${simboloLocal()} - COL`;
  const tipoLabel = node.tipoEspecial ? TIPOS_ESPECIAL.find(t=>t.value===node.tipoEspecial)?.label.replace(/^[^·]*·\s*/,'') ?? '' : '';
  return (
    <tr style={{ background: sel ? '#FFF8EC' : hov ? '#FFFBF2' : '#fff', borderBottom:'1px solid #F0F0F0', cursor:'pointer' }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>onSelect(node)}>
      <td style={{ paddingLeft:ind, paddingRight:10, height:35 }}>
        <div style={{ display:'flex', alignItems:'center' }}>
          {hasKids
            ? <button onClick={e=>{e.stopPropagation();onToggle(node.id);}} style={{ background:'none',border:'none',cursor:'pointer',color:BRAND,display:'flex',alignItems:'center',padding:0,flexShrink:0,marginRight:4 }}>
                {node.expanded ? <IcChevronDown className="w-3 h-3"/> : <IcChevronRight className="w-3 h-3"/>}
              </button>
            : <span style={{ width:16, display:'inline-block', flexShrink:0 }}/>
          }
          {/* Detalle: código en dorado Montserrat */}
          <span style={{ fontFamily:F, fontSize:11, fontWeight:500, color:BRAND, fontVariantNumeric:'tabular-nums' }}>{node.code}</span>
        </div>
      </td>
      <td style={{ padding:'0 10px', height:35, fontFamily:F, color:'#1A1A1A', fontSize:11 }}>
        {node.nombre}
        {isAuxActivo && (node.tipoEspecial==='04' ? <BadgePro label="Auxiliar activo"/> : <BadgeCli label="Auxiliar activo"/>)}
        {node.tipoEspecial==='05' && <BadgeBank/>}
        {node.tipoEspecial==='07' && <BadgeInv/>}
        {node.tipoEspecial==='08' && <BadgeIva/>}
        {node.posteable && <DotPost/>}
      </td>
      <td style={{ padding:'0 10px', height:35, fontFamily:F, fontSize:11, color:'#777' }}>{monCta}</td>
      <td style={{ padding:'0 10px', height:35, minWidth:130 }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:4 }}>
          <span style={{ fontSize:10, color:'#9E9E9E', fontFamily:F, flexShrink:0 }}>{node.moneda==='USD'?'$':simboloLocal()}</span>
          <span style={{ fontSize:11, fontVariantNumeric:'tabular-nums', fontFamily:F, color:'#0F0F0F', textAlign:'right', flex:1 }}>{fmtSaldo(node.saldo)}</span>
        </div>
      </td>
      <td style={{ padding:'0 10px', height:35, fontFamily:F, fontSize:10, color:'#888', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
        {node.tipoEspecial ? `${node.tipoEspecial} · ${tipoLabel}` : ''}
      </td>
      <td style={{ padding:'0 7px', height:35, width:60 }}>{subBtn()}</td>
    </tr>
  );
}

// ── Plan de cuentas ───────────────────────────────────────────────────────────
function PlanCuentas({ cuentas, onToggle, onSelect, onAddChild, selectedId }: {
  cuentas: Cuenta[]; onToggle:(id:string)=>void; onSelect:(n:Cuenta)=>void;
  onAddChild:(p:Cuenta)=>void; selectedId:string|null;
}) {
  const [search, setSearch]     = useState('');
  const [filterGrupo, setFG]    = useState('all');
  const [filterNivel, setFN]    = useState('all');
  const [filterEsp, setFE]      = useState(false);   // toggle "Solo especiales"
  const [filterCC, setFCC]      = useState(false);   // toggle "Solo con centro de costo"

  // "Sub grupo" y "Sub sub grupo" son clasificación NIIF fija (no
  // administrable por el usuario) y en el caso típico un Sub grupo envuelve un
  // único Sub sub grupo con un nombre casi idéntico (ej. "Activos corrientes" →
  // "Activos corrientes circulantes"). Mostrar ambos como filas colapsables
  // separadas se leía como jerarquía duplicada/confusa. Cuando el Sub grupo
  // tiene un solo hijo, se "pliega" y se muestra directamente ese Sub sub
  // grupo en su lugar - un nivel colapsable menos, sin perder información.
  function flatVisible(nodes: Cuenta[]): Cuenta[] {
    const r: Cuenta[] = [];
    for (const n of nodes) {
      if (n.nivel === 'subgrupo' && (n.children?.length ?? 0) === 1) {
        const only = n.children![0];
        r.push(only);
        if (only.expanded && only.children?.length) r.push(...flatVisible(only.children));
        continue;
      }
      r.push(n);
      if (n.expanded && n.children?.length) r.push(...flatVisible(n.children));
    }
    return r;
  }

  const q = search.toLowerCase();
  // Al buscar se recorre todo el árbol (también lo que está colapsado); sin
  // búsqueda se muestra solo lo desplegado.
  const allFlat = q ? flattenAll(cuentas) : flatVisible(cuentas);
  const rows = allFlat.filter(c => {
    if (q && !(c.code||'').toLowerCase().includes(q) && !c.nombre.toLowerCase().includes(q)) return false;
    if (filterGrupo !== 'all' && c.grupo !== filterGrupo) return false;
    if (filterNivel !== 'all' && c.nivel !== filterNivel) return false;
    if (filterEsp && !c.tipoEspecial) return false;
    if (filterCC && !(c.centroCostoObligatorio || c.usaCentroCosto)) return false;
    return true;
  });
  const hasFilter = q || filterGrupo !== 'all' || filterNivel !== 'all' || filterEsp || filterCC;
  const totalCuentas = flattenTree(cuentas).length;

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      {/* ── Barra de filtros ── */}
      <div style={{ background:'#fff', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', flexShrink:0 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar código o nombre…" width={220} />

        <div style={{ width:180, flexShrink:0 }}>
          <Select value={filterGrupo} onChange={setFG}
            options={[{ value:'all', label:'Todas las categorías' }, ...GRUPOS_NIIF.map(g=>({ value:g.value, label:g.label }))]} />
        </div>

        <div style={{ width:150, flexShrink:0 }}>
          <Select value={filterNivel} onChange={setFN}
            options={[
              { value:'all', label:'Todos los niveles' },
              { value:'mayor', label:'Mayor' },
              { value:'submajor', label:'Sub mayor' },
              { value:'detalle', label:'Detalle' },
            ]} />
        </div>

        <Checkbox label="Solo especiales" checked={filterEsp} onChange={setFE} />
        <Checkbox label="Con centro de costo" checked={filterCC} onChange={setFCC} />

        {hasFilter && (
          <button onClick={()=>{setSearch('');setFG('all');setFN('all');setFE(false);setFCC(false);}}
            style={{ height:28, padding:'0 10px', border:'none', background:C.errorBg, color:C.error, borderRadius:radius.sm, cursor:'pointer', fontSize:11, fontFamily:F, flexShrink:0 }}>
            × Limpiar filtros
          </button>
        )}

        <span style={{ marginLeft:'auto', fontSize:12, fontFamily:F, color:C.n700, flexShrink:0 }}>{totalCuentas} cuentas</span>
      </div>


      {/* ── Tabla ── */}
      <div style={{ flex:1, overflowY:'auto', background:'#fff' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11, fontFamily:F }}>
          <thead style={{ position:'sticky', top:0, zIndex:2 }}>
            <tr style={{ background:'#fff', borderBottom:'1px solid #EBEBEB' }}>
              <th style={{ padding:'7px 10px', textAlign:'left', fontSize:10, fontWeight:500, fontFamily:F, color:'#888', width:200, whiteSpace:'nowrap' }}>Código</th>
              <th style={{ padding:'7px 10px', textAlign:'left', fontSize:10, fontWeight:500, fontFamily:F, color:'#888' }}>Nombre de la cuenta</th>
              <th style={{ padding:'7px 10px', textAlign:'left', fontSize:10, fontWeight:500, fontFamily:F, color:'#888', width:110, whiteSpace:'nowrap' }}>Moneda Cta. / Identificación</th>
              <th style={{ padding:'7px 10px', textAlign:'left', fontSize:10, fontWeight:500, fontFamily:F, color:'#888', width:160, whiteSpace:'nowrap' }}>Saldo {simboloLocal()}</th>
              <th style={{ padding:'7px 10px', textAlign:'left', fontSize:10, fontWeight:500, fontFamily:F, color:'#888', width:120, whiteSpace:'nowrap' }}>Tipo especial</th>
              <th style={{ width:60 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} style={{ padding:42, textAlign:'center', color:'#9E9E9E', fontSize:11, fontFamily:F }}>
                {hasFilter ? 'Sin resultados.' : 'No hay cuentas. Creá la primera.'}
              </td></tr>
            )}
            {rows.map(c => (
              <AccountRow key={c.id} node={c as Cuenta & { depth: number }} selectedId={selectedId}
                onToggle={onToggle} onSelect={onSelect} onAddChild={onAddChild}/>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Modales ───────────────────────────────────────────────────────────────────
function ModalExIm({ onClose }: { onClose:()=>void }) {
  const [tab, setTab] = useState<'exportar'|'importar'>('exportar');
  const [file, setFile] = useState('');
  return (
    <Modal open title="Exportar / Importar - Plan de cuentas" onClose={onClose}
      footer={<div style={{ display:'flex', gap:7, justifyContent:'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        {tab==='exportar'?<Button>Exportar Excel</Button>:<Button disabled={!file}>Importar</Button>}
      </div>}>
      <div style={{ display:'flex', gap:0, marginBottom:14, borderBottom:`1px solid ${C.n500}` }}>
        {(['exportar','importar'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'7px 14px', fontSize:11, fontFamily:F, border:'none', background:'none', cursor:'pointer', color:tab===t?BRAND:C.n700, borderBottom:`2px solid ${tab===t?BRAND:'transparent'}` }}>
            {t==='exportar'?'Exportar':'Importar'}
          </button>
        ))}
      </div>
      {tab==='exportar'
        ? <p style={{ fontSize:11, color:C.n700, fontFamily:F }}>Descarga el catálogo completo en formato Excel.</p>
        : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <p style={{ fontSize:11, color:C.n700, fontFamily:F }}>El archivo debe seguir el formato de la plantilla.</p>
            {file
              ? <div style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 12px', border:`1px solid ${C.success}`, borderRadius:radius.md, background:'rgba(76,175,80,.05)' }}>
                  <span style={{ color:C.success }}>✓</span>
                  <span style={{ fontSize:11, flex:1, fontFamily:F }}>{file}</span>
                  <button onClick={()=>setFile('')} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700 }}>✕</button>
                </div>
              : <label style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:7, padding:28, border:`2px dashed ${C.n500}`, borderRadius:radius.md, cursor:'pointer', background:C.n200 }}>
                  <span style={{ fontSize:12, fontWeight:500, color:C.n900, fontFamily:F }}>Arrastrá tu archivo acá</span>
                  <span style={{ fontSize:10, color:C.n700, fontFamily:F }}>Solo .xlsx</span>
                  <input type="file" accept=".xlsx" style={{ display:'none' }} onChange={e=>setFile(e.target.files?.[0]?.name||'')}/>
                </label>
            }
            <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Descargar plantilla</button>
          </div>
      }
    </Modal>
  );
}

function ModalEstructura({ onClose }: { onClose:()=>void }) {
  return (
    <Modal open title="Estructura del código contable" onClose={onClose}>
      <p style={{ fontSize:11, color:C.n700, margin:'0 0 14px', fontFamily:F }}>
        El código contable se construye concatenando los segmentos de cada nivel con el separador configurado en Parámetros generales.
      </p>
      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
        {[
          { nivel:'1. Mayor',       ejemplo:'100',                  color:'#E6F1FB', text:'#0C447C', seg:'3 dígitos' },
          { nivel:'2. Sub mayor',   ejemplo:'100-001',              color:'#EAF3DE', text:'#3B6D11', seg:'3 dígitos' },
          { nivel:'3. Detalle',     ejemplo:'100-001-0001',         color:'#FAEEDA', text:'#633806', seg:'4 dígitos' },
          { nivel:'4. ID auxiliar', ejemplo:'100-001-0001-CLI0001', color:'#EEEDFE', text:'#3C3489', seg:'CLI/PRO-XXXX', nota:'Solo cuentas con rol 02 o 04' },
        ].map(r=>(
          <div key={r.nivel} style={{ display:'flex', alignItems:'center', gap:10, padding:10, borderRadius:radius.md, border:`1px solid ${C.n500}` }}>
            <span style={{ background:r.color, color:r.text, fontSize:9, fontWeight:600, fontFamily:F, padding:'3px 9px', borderRadius:4, minWidth:90, textAlign:'center', flexShrink:0 }}>{r.nivel}</span>
            <div style={{ flex:1 }}>
              <span style={{ fontSize:11, fontFamily:F, color:C.n900 }}>{r.ejemplo}</span>
              {'nota' in r && r.nota && <p style={{ fontSize:9, color:C.n700, margin:'2px 0 0', fontFamily:F }}>{r.nota}</p>}
            </div>
            <span style={{ fontSize:10, color:C.n700, fontFamily:F, flexShrink:0 }}>{r.seg}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

const TABS = ['Plan de cuentas','Centros de costo','Cuentas especiales','Movimientos de ajuste','Grupo de patrimonio'];

// Aviso cuando se llega desde el asistente inicial («Crear mi plan»)
function AvisoAsistente() {
  const desdeAsistente = useSyncExternalStore(() => () => {}, () => { try { return sessionStorage.getItem('onboarding-plan-propio') === '1'; } catch { return false; } }, () => false);
  if (!desdeAsistente) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 24px', background:'#EEF6F7', borderBottom:'1px solid #B5D8DD', fontSize:12.5, flexShrink:0 }}>
      <span style={{ flex:1 }}>Estás creando tu plan de cuentas desde el asistente inicial. Cuando termines, vuelve para asociar las cuentas de facturación.</span>
      <Link href="/onboarding-contable"><Button>Volver al asistente</Button></Link>
    </div>
  );
}

export default function CatalogoPage() {
  const [tab, setTab] = useState(0);
  // El catálogo se guarda en la base y lo comparte toda la aplicación
  const cuentas = useCatalogo();
  const setCuentas = cambiarCatalogo;
  // Las cuentas auxiliares (nivel 4) de clientes y proveedores creadas desde
  // Clientes/Proveedores o desde Facturación (importar compras, receptor
  // nuevo) viven en la base de terceros: se agregan acá bajo su cuenta de
  // detalle para que el catálogo las muestre.
  useEffect(() => {
    let vivo = true;
    fetch('/api/clientes').then(r => r.json()).then((rows: { id: string; nombre: string; tipo: string; con_cuenta?: number | null; numero_identificacion?: string; datos_json?: string | null; activo?: number | null }[]) => {
      if (!vivo || !Array.isArray(rows)) return;
      const aux: { code: string; parent: string; nombre: string; esProv: boolean; id: string; activo: boolean; ced: string }[] = [];
      for (const r of rows) {
        if (Number(r.con_cuenta ?? 1) !== 1 || !r.datos_json) continue;
        try {
          const p = JSON.parse(r.datos_json) as { cuentaCode?: string; auxId?: string };
          if (p.cuentaCode && p.auxId) aux.push({ code: `${p.cuentaCode}-${p.auxId}`, parent: p.cuentaCode, nombre: r.nombre, esProv: r.tipo === 'proveedor', id: r.id, activo: r.activo == null || Number(r.activo) === 1, ced: r.numero_identificacion ?? '' });
        } catch { /* perfil ilegible */ }
      }
      const insertar = (nodes: Cuenta[]): Cuenta[] => nodes.map(n => {
        const hijos = n.children ? insertar(n.children) : n.children;
        const mios = aux.filter(a => a.parent === n.code && n.nivel === 'detalle');
        if (!mios.length) return hijos === n.children ? n : { ...n, children: hijos };
        const lista = [...(hijos ?? [])];
        for (const a of mios) {
          const i = lista.findIndex(c => c.code === a.code);
          const nodo: Cuenta = {
            id: 'ter-' + a.id, code: a.code, nombre: a.nombre, nivel: 'auxiliar', grupo: n.grupo, naturaleza: n.naturaleza, posteable: true,
            saldo: i >= 0 ? lista[i].saldo : 0, parentId: n.id, tipoEspecial: a.esProv ? '04' : '02', children: [], centroCostoObligatorio: false, inactiva: !a.activo,
            entornoFiscal: { tipoIdentificacion: '', numeroIdentificacion: a.ced, regimen: '' },
          };
          if (i >= 0) lista[i] = { ...lista[i], nombre: a.nombre, entornoFiscal: lista[i].entornoFiscal ?? nodo.entornoFiscal }; else lista.push(nodo);
        }
        lista.sort((x, y) => x.code.localeCompare(y.code));
        return { ...n, children: lista };
      });
      setCuentas(cs => insertar(cs));
    }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  const [selectedNode, setSelectedNode] = useState<Cuenta|null>(null);
  const [panelMode, setPanelMode] = useState<'view'|'edit'|'new'>('view');
  const [panelOpen, setPanelOpen] = useState(false);
  const [parentForNew, setParentForNew] = useState<Cuenta|null>(null);
  const [toast, setToast] = useState<{message:string;type:'success'|'error'}|null>(null);
  const [showIO, setShowIO] = useState(false);
  const [showEst, setShowEst] = useState(false);
  const [showNuevoCentro, setShowNuevoCentro] = useState(false);
  // se sube acá para que AccountDetail pueda mostrar, en el detalle de
  // una cuenta, los movimientos de ajuste que la tienen enlazada.
  const [ajustes, setAjustes] = useState<EnlaceAjuste[]>(() => ENLACES_AJUSTE_INIT.map(e=>({...e})));
  // los botones de Movimientos de ajuste viven en el header - se
  // avisan a TabAjustes con un contador que se incrementa en cada click.
  const [ajusteAddSignal, setAjusteAddSignal] = useState(0);
  const [ajusteSaveSignal, setAjusteSaveSignal] = useState(0);
  const [patrimonioAddSignal, setPatrimonioAddSignal] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lista plana de TODAS las cuentas (sin depender de qué esté expandido en el árbol
  // visual) - la necesitan el selector de cuenta padre y la validación de código
  // duplicado dentro de AccountDetail.
  const flatAll = useMemo(() => flattenAll(cuentas), [cuentas]);

  function showToast(msg:string, type:'success'|'error'='success') {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({message:msg,type});
    toastTimer.current = setTimeout(()=>setToast(null),3000);
  }

  const handleToggle = useCallback((id:string)=>setCuentas(p=>toggleNodeExpanded(p,id)),[]);

  function handleSelect(node:Cuenta) {
    const full = flattenTree(cuentas).find(n=>n.id===node.id)??node;
    setSelectedNode(full); setParentForNew(null); setPanelMode('view'); setPanelOpen(true);
  }
  function handleAddChild(parent:Cuenta) {
    const full = flattenTree(cuentas).find(n=>n.id===parent.id)??parent;
    setParentForNew(full); setSelectedNode(null); setPanelMode('new'); setPanelOpen(true);
  }
  function handleNewRoot() {
    setParentForNew(null); setSelectedNode(null); setPanelMode('new'); setPanelOpen(true);
  }
  function handleSave(data:Cuenta) {
    if (!data.id || data.id.startsWith('_new_')) {
      const newId = genId();
      const n = {...data, id:newId};
      setCuentas(p=>addNodeToTree(p, data.parentId??null, n));
      showToast(`Cuenta "${n.nombre}" creada.`);
      setSelectedNode(n); setPanelMode('view');
    } else {
      setCuentas(p=>updateNodeInTree(p, data));
      showToast(`Cuenta "${data.nombre}" actualizada.`);
      setSelectedNode(data); setPanelMode('view');
    }
  }
  function handleDelete(id:string) {
    const node = flattenTree(cuentas).find(n=>n.id===id);
    setCuentas(p=>removeNodeFromTree(p,id));
    showToast(`Cuenta "${node?.nombre}" eliminada.`,'error');
    setPanelOpen(false); setSelectedNode(null);
  }
  function handleTabChange(i:number) {
    setTab(i); setPanelOpen(false); setSelectedNode(null); setParentForNew(null);
  }

  // buttons now in PageHeader

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F }}>
      <AvisoAsistente />
      <PageHeader title="Catálogo de cuentas">
        {tab===0 && <>
          <Button variant="secondary" onClick={()=>setShowEst(true)}>Estructura del código</Button>
          <Button variant="secondary" icon={<IcImport className="w-3 h-3"/>} onClick={()=>setShowIO(true)}>Exportar / Importar</Button>
          <Button icon={<IcPlus className="w-3 h-3"/>} onClick={handleNewRoot}>Nueva cuenta</Button>
        </>}
        {tab===1 && <Button icon={<IcPlus className="w-3 h-3"/>} onClick={()=>setShowNuevoCentro(true)}>Nuevo centro de costo</Button>}
        {tab===3 && <>
          <Button variant="secondary" icon={<IcPlus className="w-3 h-3"/>} onClick={()=>setAjusteAddSignal(s=>s+1)}>Agregar movimiento</Button>
          <Button onClick={()=>{ setAjusteSaveSignal(s=>s+1); showToast('Configuración de movimientos de ajuste guardada.'); }}>Guardar configuración</Button>
        </>}
        {/* el botón "Nuevo" de Grupo de patrimonio se mueve al header */}
        {tab===4 && <Button icon={<IcPlus className="w-3 h-3"/>} onClick={()=>setPatrimonioAddSignal(s=>s+1)}>Nuevo</Button>}
      </PageHeader>
      <TabBar tabs={TABS} active={tab} onChange={handleTabChange}/>

      {tab===0 && (
        <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', position:'relative' }}>
          <PlanCuentas cuentas={cuentas} onToggle={handleToggle} onSelect={handleSelect}
            onAddChild={handleAddChild} selectedId={selectedNode?.id??null}/>
          {panelOpen && (
            <>
              <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.2)', zIndex:200 }}
                onClick={()=>{setPanelOpen(false);setSelectedNode(null);}}/>
              <aside style={{ position:'fixed', right:0, top:0, height:'100vh', width:640, background:'#fff', borderLeft:`1px solid ${C.n500}`, zIndex:201, display:'flex', flexDirection:'column', boxShadow:'-4px 0 24px rgba(0,0,0,.15)' }}
                onClick={e=>e.stopPropagation()}>
                <AccountDetail
                  mode={panelMode} account={selectedNode} parentAccount={parentForNew}
                  allNodes={flatAll}
                  onClose={()=>{setPanelOpen(false);setSelectedNode(null);setParentForNew(null);}}
                  onSave={handleSave} onDelete={handleDelete} onAddChild={handleAddChild}
                  onModeChange={setPanelMode} onSelect={handleSelect}
                  enlacesAjuste={ajustes}
                />
              </aside>
            </>
          )}
        </div>
      )}

      {tab===1 && <TabCentrosCosto cuentas={cuentas} triggerNuevo={showNuevoCentro} onNuevoDone={()=>setShowNuevoCentro(false)}/>}
      {tab===2 && <TabCuentasEspeciales cuentas={cuentas} onUpdateCuenta={data=>setCuentas(p=>updateNodeInTree(p,data as Cuenta))}/>}
      {tab===3 && (
        <TabAjustes
          rows={ajustes} onChange={setAjustes}
          addSignal={ajusteAddSignal} onAddHandled={()=>{}}
          saveSignal={ajusteSaveSignal} onSaveHandled={()=>{}}
        />
      )}
      {tab===4 && <TabGrupoPatrimonio addSignal={patrimonioAddSignal} onAddHandled={()=>{}}/>}

      {toast && <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:999 }}><Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)}/></div>}
      {showIO && <ModalExIm onClose={()=>setShowIO(false)}/>}
      {showEst && <ModalEstructura onClose={()=>setShowEst(false)}/>}
    </div>
  );
}
