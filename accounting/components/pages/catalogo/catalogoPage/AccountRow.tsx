'use client';
import { useState } from 'react';
import { IcPlus, IcChevronDown, IcChevronRight } from '../../../ui/icons';
import { C } from '../../../ui/tokens';
import { Cuenta, TIPOS_ESPECIAL, TIPOS_IDENTIFICACION_FISCAL } from '../catalogoData';
import { canAddChild } from '../datos/arbol';
import { BRAND, F, IND, fmtSaldo } from './datos';
import { BadgeBank, BadgeCli, BadgeInv, BadgeIva, BadgePro, DotPost } from './piezas';

export function AccountRow({ node, selectedId, onToggle, onSelect, onAddChild }: {
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
  const Chevron = ({ color='#757575' }: { color?: string }) => hasKids
    ? <button onClick={e=>{e.stopPropagation();onToggle(node.id);}} style={{ background:'none',border:'none',cursor:'pointer',color,display:'flex',alignItems:'center',padding:0,flexShrink:0,marginRight:4 }}>
        {node.expanded ? <IcChevronDown className="w-3 h-3"/> : <IcChevronRight className="w-3 h-3"/>}
      </button>
    : <span style={{ width:16, display:'inline-block', flexShrink:0 }}/>;

  // Sub button on hover
  const SubBtn = () => (hov||sel) && canAdd
    ? <button onClick={e=>{e.stopPropagation();onAddChild(node);}}
        style={{ display:'flex',alignItems:'center',gap:3,height:19,padding:'0 7px',fontSize:9,fontFamily:F,color:BRAND,background:'#FFF8EC',border:'1px solid #EED89A',borderRadius:4,cursor:'pointer',whiteSpace:'nowrap' }}>
        <IcPlus className="w-2.5 h-2.5"/> Sub
      </button>
    : null;

  // ── grupo NIIF - header de sección estilo Figma ──
  if (nivel === 'grupo') {
    const label = `${node.grupo} · ${node.nombre.toUpperCase()}`;
    return (
      <tr style={{ background: hov ? '#F9F9F9' : '#F9F9F9', cursor:'pointer', borderBottom:'1px solid #ECECEC' }}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>onToggle(node.id)}>
        <td colSpan={6} style={{ padding:0, height:38 }}>
          <div style={{ display:'flex', alignItems:'center', paddingLeft:12, height:'100%', gap:5 }}>
            <button onClick={e=>{e.stopPropagation();onToggle(node.id);}} style={{ background:'none',border:'none',cursor:'pointer',color:'#757575',display:'flex',alignItems:'center',padding:0,flexShrink:0 }}>
              {node.expanded ? <IcChevronDown className="w-3 h-3"/> : <IcChevronRight className="w-3 h-3"/>}
            </button>
            <span style={{ fontFamily:F, fontSize:11, fontWeight:600, color:'#0F0F0F', letterSpacing:'.04em' }}>{label}</span>
          </div>
        </td>
      </tr>
    );
  }

  // ── subgrupo ──
  if (nivel === 'subgrupo') return (
    <tr style={{ background: hov ? C.n200 : '#FFFFFF', borderBottom:'1px solid #ECECEC', cursor:'pointer' }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>onToggle(node.id)}>
      <td colSpan={6} style={{ padding:0, height:31 }}>
        <div style={{ display:'flex', alignItems:'center', paddingLeft:ind, height:'100%' }}>
          <Chevron/>
          <span style={{ fontFamily:F, fontSize:11, fontWeight:500, color:'#757575' }}>{node.nombre}</span>
        </div>
      </td>
    </tr>
  );

  // ── subsubgrupo ──
  if (nivel === 'subsubgrupo') return (
    <tr style={{ background: hov ? C.n200 : '#FFFFFF', borderBottom:'1px solid #ECECEC', cursor:'pointer' }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>onToggle(node.id)}>
      <td colSpan={6} style={{ padding:0, height:30 }}>
        <div style={{ display:'flex', alignItems:'center', paddingLeft:ind, height:'100%' }}>
          <Chevron/>
          <span style={{ fontFamily:F, fontSize:10, fontWeight:400, color:'#757575', fontStyle:'italic' }}>{node.nombre}</span>
        </div>
      </td>
    </tr>
  );

  // ── auxiliar ── (código corto: solo último segmento)
  if (nivel === 'auxiliar') {
    const shortCode = (node.code||'').split('-').pop() ?? node.code;
    const isCli = node.tipoEspecial !== '04';
    return (
      <tr style={{ background: sel ? C.brandBg : hov ? C.n200 : '#FFFFFF', borderBottom:'1px solid #ECECEC', cursor:'pointer' }}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>onSelect(node)}>
        {/* código corto, gris */}
        <td style={{ paddingLeft:ind, paddingRight:12, height:28 }}>
          <span style={{ fontFamily:F, fontSize:10, color:'#757575', fontVariantNumeric:'tabular-nums' }}>{shortCode}</span>
        </td>
        {/* nombre + badge */}
        <td style={{ padding:'0 12px', height:28, fontSize:10, fontFamily:F, color:'#757575' }}>
          {node.nombre}
          {isCli ? <BadgeCli label="Cliente"/> : <BadgePro label="Proveedor"/>}
        </td>
        {/* moneda cta - vacía para cuentas normales; para auxiliares de cliente/proveedor
            se usa para mostrar la identificación, que antes no aparecía en ningún lado del árbol */}
        <td style={{ padding:'0 12px', height:28, fontSize:10, fontFamily:F, color:'#757575', whiteSpace:'nowrap' }}>
          {node.entornoFiscal?.numeroIdentificacion
            ? <><span style={{ color:'#757575' }}>{TIPOS_IDENTIFICACION_FISCAL.find(t=>t.value===node.entornoFiscal!.tipoIdentificacion)?.label ?? ''}</span> {node.entornoFiscal.numeroIdentificacion}</>
            : <span style={{ color:'#C62828' }}>Sin identificación</span>}
        </td>
        {/* saldo sym */}
        <td style={{ padding:'0 12px', height:28, fontSize:10, fontFamily:F, color:'#757575' }}>₡</td>
        {/* tipo especial */}
        <td style={{ padding:'0 12px', height:28 }}></td>
        {/* acciones */}
        <td style={{ padding:'0 7px', height:28, width:60 }}><SubBtn/></td>
      </tr>
    );
  }

  // ── mayor ──
  if (nivel === 'mayor') {
    const monCta = node.moneda === 'USD' ? '$ - USD' : '₡ - COL';
    return (
      <tr style={{ background: sel ? C.brandBg : hov ? C.n200 : '#FFFFFF', borderBottom:'1px solid #ECECEC', cursor:'pointer' }}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>onSelect(node)}>
        <td style={{ paddingLeft:ind, paddingRight:12, height:38 }}>
          <div style={{ display:'flex', alignItems:'center' }}>
            <Chevron color="#757575"/>
            {/* Mayor: código en negro, bold, Montserrat */}
            <span style={{ fontFamily:F, fontSize:11, fontWeight:600, color:'#0F0F0F', fontVariantNumeric:'tabular-nums', letterSpacing:'.01em' }}>{node.code}</span>
          </div>
        </td>
        <td style={{ padding:'0 12px', height:38, fontFamily:F, fontWeight:600, color:'#0F0F0F', fontSize:11 }}>{node.nombre}</td>
        <td style={{ padding:'0 12px', height:38, fontFamily:F, fontSize:11, color:'#757575', fontWeight:500 }}>{monCta}</td>
        <td style={{ padding:'0 12px', height:38, minWidth:130 }}>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:4 }}>
            <span style={{ fontSize:10, color:'#757575', fontFamily:F, flexShrink:0 }}>{node.moneda==='USD'?'$':'₡'}</span>
            <span style={{ fontSize:11, fontVariantNumeric:'tabular-nums', fontFamily:F, color:'#0F0F0F', textAlign:'right', flex:1 }}>{fmtSaldo(node.saldo)}</span>
          </div>
        </td>
        <td style={{ padding:'0 12px', height:38 }}></td>
        <td style={{ padding:'0 7px', height:38, width:60 }}><SubBtn/></td>
      </tr>
    );
  }

  // ── submajor ──
  if (nivel === 'submajor') {
    const monCta = node.moneda === 'USD' ? '$ - USD' : '₡ - COL';
    return (
      <tr style={{ background: sel ? C.brandBg : hov ? C.n200 : '#FFFFFF', borderBottom:'1px solid #ECECEC', cursor:'pointer' }}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>onSelect(node)}>
        <td style={{ paddingLeft:ind, paddingRight:12, height:35 }}>
          <div style={{ display:'flex', alignItems:'center' }}>
            <Chevron color="#757575"/>
            <span style={{ fontFamily:F, fontSize:11, fontWeight:500, color:'#757575', fontVariantNumeric:'tabular-nums' }}>{node.code}</span>
          </div>
        </td>
        <td style={{ padding:'0 12px', height:35, fontFamily:F, fontWeight:500, color:'#0F0F0F', fontSize:11 }}>{node.nombre}</td>
        <td style={{ padding:'0 12px', height:35, fontFamily:F, fontSize:11, color:'#757575' }}>{monCta}</td>
        <td style={{ padding:'0 12px', height:35, minWidth:130 }}>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:4 }}>
            <span style={{ fontSize:10, color:'#757575', fontFamily:F, flexShrink:0 }}>{node.moneda==='USD'?'$':'₡'}</span>
            <span style={{ fontSize:11, fontVariantNumeric:'tabular-nums', fontFamily:F, color:'#757575', textAlign:'right', flex:1 }}>{fmtSaldo(node.saldo)}</span>
          </div>
        </td>
        <td style={{ padding:'0 12px', height:35 }}></td>
        <td style={{ padding:'0 7px', height:35, width:60 }}><SubBtn/></td>
      </tr>
    );
  }

  // ── detalle ──
  const isAuxActivo = (node.tipoEspecial==='02'||node.tipoEspecial==='03'||node.tipoEspecial==='04') && hasKids;
  const monCta = node.moneda === 'USD' ? '$ - USD' : '₡ - COL';
  const tipoLabel = node.tipoEspecial ? TIPOS_ESPECIAL.find(t=>t.value===node.tipoEspecial)?.label.replace(/^[^·]*·\s*/,'') ?? '' : '';
  return (
    <tr style={{ background: sel ? C.brandBg : hov ? C.n200 : '#FFFFFF', borderBottom:'1px solid #ECECEC', cursor:'pointer' }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>onSelect(node)}>
      <td style={{ paddingLeft:ind, paddingRight:12, height:35 }}>
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
      <td style={{ padding:'0 12px', height:35, fontFamily:F, color:'#0F0F0F', fontSize:11 }}>
        {node.nombre}
        {isAuxActivo && (node.tipoEspecial==='04' ? <BadgePro label="Auxiliar activo"/> : <BadgeCli label="Auxiliar activo"/>)}
        {node.tipoEspecial==='05' && <BadgeBank/>}
        {node.tipoEspecial==='07' && <BadgeInv/>}
        {node.tipoEspecial==='08' && <BadgeIva/>}
        {node.posteable && <DotPost/>}
      </td>
      <td style={{ padding:'0 12px', height:35, fontFamily:F, fontSize:11, color:'#757575' }}>{monCta}</td>
      <td style={{ padding:'0 12px', height:35, minWidth:130 }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:4 }}>
          <span style={{ fontSize:10, color:'#757575', fontFamily:F, flexShrink:0 }}>{node.moneda==='USD'?'$':'₡'}</span>
          <span style={{ fontSize:11, fontVariantNumeric:'tabular-nums', fontFamily:F, color:'#0F0F0F', textAlign:'right', flex:1 }}>{fmtSaldo(node.saldo)}</span>
        </div>
      </td>
      <td style={{ padding:'0 12px', height:35, fontFamily:F, fontSize:10, color:'#757575', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
        {node.tipoEspecial ? `${node.tipoEspecial} · ${tipoLabel}` : ''}
      </td>
      <td style={{ padding:'0 7px', height:35, width:60 }}><SubBtn/></td>
    </tr>
  );
}
