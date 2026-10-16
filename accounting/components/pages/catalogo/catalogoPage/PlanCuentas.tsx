'use client';
import { useState } from 'react';
import { radius, TABLA } from '../../../ui/tokens';
import { SearchInput } from '../../../ui/filtros';
import { Select, Checkbox } from '../../../ui/formulario';
import { C } from '../../../ui/tokens';
import { Cuenta, GRUPOS_NIIF } from '../catalogoData';
import { flattenTree } from '../datos/arbol';
import { AccountRow } from './AccountRow';
import { F } from './datos';

// ── Plan de cuentas ───────────────────────────────────────────────────────────
export function PlanCuentas({ cuentas, onToggle, onSelect, onAddChild, selectedId }: {
  cuentas: Cuenta[]; onToggle:(id:string)=>void; onSelect:(n:Cuenta)=>void;
  onAddChild:(p:Cuenta)=>void; selectedId:string|null;
}) {
  const [search, setSearch]     = useState('');
  const [filterGrupo, setFG]    = useState('all');
  const [filterNivel, setFN]    = useState('all');
  const [filterEsp, setFE]      = useState(false);   // toggle "Solo especiales"
  const [filterCC, setFCC]      = useState(false);   // toggle "Solo con centro de costo"

  // Issue #10: "Sub grupo" y "Sub sub grupo" son clasificación NIIF fija (no
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

  const allFlat = flatVisible(cuentas);
  const q = search.toLowerCase();
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
      <div style={{ background:'#FFFFFF', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', flexShrink:0 }}>
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
      <div style={{ flex:1, overflowY:'auto', background:'#FFFFFF' }}>
        <table className="tabla" style={TABLA.table}>
          <thead style={{ position:'sticky', top:0, zIndex:2 }}>
            <tr style={TABLA.headRow}>
              <th style={{ ...TABLA.th, width:200 }}>Código</th>
              <th style={TABLA.th}>Nombre de la cuenta</th>
              <th style={{ ...TABLA.th, width:110 }}>Moneda Cta. / Identificación</th>
              <th style={{ ...TABLA.th, width:160 }}>Saldo ₡</th>
              <th style={{ ...TABLA.th, width:120 }}>Tipo especial</th>
              <th style={{ width:60 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} style={TABLA.empty}>
                {hasFilter ? 'Sin resultados.' : 'No hay cuentas. Creá la primera.'}
              </td></tr>
            )}
            {rows.map(c => (
              <AccountRow key={c.id} node={c as any} selectedId={selectedId}
                onToggle={onToggle} onSelect={onSelect} onAddChild={onAddChild}/>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
