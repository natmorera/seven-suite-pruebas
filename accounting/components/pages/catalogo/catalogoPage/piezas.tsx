'use client';
import { useState } from 'react';
import { Section, RowAction } from '@/components/ui/primitives';
import { Button, Select } from '@/components/ui/formulario';
import { radius, TABLA, PAGE_PAD , C } from '@/components/ui/tokens';
import { SearchInput } from '@/components/ui/filtros';
import { IcPlus, IcTrash } from '@/components/ui/icons';
import { type Cuenta, TIPOS_ESPECIAL } from '../catalogoData';
import { flattenTree } from '../datos/arbol';
import { F } from './datos';

// ── Pestaña de cuentas especiales ────────────────────────────────────────────────────
export function TabCuentasEspeciales({ cuentas, onUpdateCuenta }: { cuentas: Cuenta[]; onUpdateCuenta: (updated: Partial<Cuenta>&{id:string}) => void }) {
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
    <div style={{ flex:1, overflowY:'auto', padding:PAGE_PAD, display:'flex', flexDirection:'column', gap:16, fontFamily:F }}>
      <Section title="Asignar cuenta especial" hint="Marcá una cuenta de detalle como caja, banco, clientes, proveedores, etc.">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
          <div>
            <p style={{ fontSize:11, fontWeight:500, color:C.n900, margin:'0 0 4px', fontFamily:F }}>Tipo de cuenta especial</p>
            <Select ariaLabel="Tipo de cuenta especial" value={tipo} onChange={setTipo}
              options={[{ value:'', label:'Seleccionar tipo' }, ...TIPOS_ESPECIAL.filter(t=>t.value).map(t=>({ value:t.value, label:t.label }))]} />
          </div>
          <div>
            <p style={{ fontSize:11, fontWeight:500, color:C.n900, margin:'0 0 4px', fontFamily:F }}>Cuenta contable</p>
            <Select ariaLabel="Cuenta contable" value={cuentaId} onChange={setCuentaId}
              options={[{ value:'', label:'Seleccionar cuenta' }, ...detalle.map(n=>({ value:n.id, label:`${n.code} · ${n.nombre}` }))]} />
          </div>
        </div>
        <Button icon={<IcPlus className="w-3 h-3"/>} disabled={!tipo||!cuentaId} onClick={asignar}>Asignar</Button>
      </Section>
      <Section title="Cuentas especiales asignadas" hint="Cuentas del catálogo que tienen un tipo especial.">
      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
        <div style={{ flex:1 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar cuenta…" width="100%" />
        </div>
        <div style={{ width:180, flexShrink:0 }}>
          <Select ariaLabel="Tipo de cuenta especial" value={filterTipo} onChange={setFilter}
            options={[{ value:'all', label:'Todos los tipos' }, ...TIPOS_ESPECIAL.filter(t=>t.value).map(t=>({ value:t.value, label:t.label }))]} />
        </div>
      </div>
      <div style={TABLA.wrap}>
        <table className="tabla" style={TABLA.table}>
          <thead><tr style={TABLA.headRow}>
            {['Tipo especial','Código','Nombre / Razón social','Moneda','Acciones'].map(h=><th key={h} style={TABLA.th}>{h}</th>)}
          </tr></thead>
          <tbody>
            {visible.length===0&&<tr><td colSpan={5} style={TABLA.empty}>No hay cuentas especiales configuradas.</td></tr>}
            {visible.map(n=>(
              <tr key={n.id} style={{ borderTop:'1px solid #ECECEC' }}>
                <td style={{ padding:'8px 12px' }}><span style={{ color:C.brand, fontFamily:F }}>{tipoLabel(n.tipoEspecial??'')}</span></td>
                <td style={{ padding:'8px 12px', fontFamily:F }}>{n.code}</td>
                <td style={{ padding:'8px 12px', fontFamily:F }}>{n.nombre}</td>
                <td style={{ padding:'8px 12px', fontFamily:F }}>{n.moneda}</td>
                <td style={{ padding:'8px 12px', textAlign:'right' }}>
                  <div style={{ display:'flex', justifyContent:'flex-end' }}><RowAction title="Quitar" danger onClick={()=>onUpdateCuenta({id:n.id, tipoEspecial:null})}><IcTrash className="w-3.5 h-3.5"/></RowAction></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </Section>
    </div>
  );
}
// ── Badges ────────────────────────────────────────────────────────────────────
export function BadgeBank()  { return <span style={{ display:'inline-flex',alignItems:'center',padding:'0 6px',height:16,borderRadius:radius.pill,fontSize:10.5,fontWeight:500,fontFamily:F,border:'1px solid #EED89A',background:'#FFF8EC',color:'#A77600',whiteSpace:'nowrap',verticalAlign:'middle',marginLeft:4 }}>Banco</span>; }
export function BadgeCli({ label='Clientes' }: { label?: string }) { return <span style={{ display:'inline-flex',alignItems:'center',padding:'0 6px',height:16,borderRadius:radius.pill,fontSize:10.5,fontWeight:500,fontFamily:F,border:'1px solid #B5D4F4',background:'#E6F1FB',color:'#185FA5',whiteSpace:'nowrap',verticalAlign:'middle',marginLeft:4 }}>{label}</span>; }
export function BadgePro({ label='Proveedores' }: { label?: string }) { return <span style={{ display:'inline-flex',alignItems:'center',padding:'0 6px',height:16,borderRadius:radius.pill,fontSize:10.5,fontWeight:500,fontFamily:F,border:'1px solid #9FE1CB',background:'#E1F5EE',color:C.successDk,whiteSpace:'nowrap',verticalAlign:'middle',marginLeft:4 }}>{label}</span>; }
export function BadgeIva()  { return <span style={{ display:'inline-flex',alignItems:'center',padding:'0 6px',height:16,borderRadius:radius.pill,fontSize:10.5,fontWeight:500,fontFamily:F,border:'1px solid #F5C4B3',background:'#FAECE7',color:'#993C1D',whiteSpace:'nowrap',verticalAlign:'middle',marginLeft:4 }}>IVA</span>; }
export function BadgeInv()  { return <span style={{ display:'inline-flex',alignItems:'center',padding:'0 6px',height:16,borderRadius:radius.pill,fontSize:10.5,fontWeight:500,fontFamily:F,border:'1px solid #AFA9EC',background:'#EEEDFE',color:'#534AB7',whiteSpace:'nowrap',verticalAlign:'middle',marginLeft:4 }}>Inventario</span>; }
export function DotPost()   { return <span style={{ display:'inline-block',width:5,height:5,borderRadius:'50%',background:'#4CAF50',marginLeft:4,verticalAlign:'middle',flexShrink:0 }}/>; }
