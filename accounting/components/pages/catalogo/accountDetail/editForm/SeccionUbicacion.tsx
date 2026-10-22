'use client';
import { FormField } from '@/components/ui/formulario';
import { radius , C } from '@/components/ui/tokens';
import { type Cuenta, type Nivel, GRUPOS_NIIF } from '../../catalogoData';
import { BRAND, F } from '../datos';
import { AccountPickerSelect, NiifSearchSelect } from '../piezas';
import { type EstadoEditForm } from './useEditForm';

// Cuenta nueva sin padre: nivel y ubicación dentro del catálogo
export function SeccionUbicacion({ e }: { e: EstadoEditForm }) {
  const { setNivelSel, setParentSel, nivelSel, niifLeaf, handleNiifSelect, allNodes, parentSel, set } = e;
  return (
        <div style={{ margin:'12px 14px 0', display:'flex', flexDirection:'column', gap:10, flexShrink:0 }}>

          {/* ─── NIVEL CONTABLE - se pregunta primero, tabs tipo pill ─── */}
          <div>
            <p style={{ fontSize:10.5, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.06em', margin:'0 0 7px', fontFamily:F }}>Nivel contable</p>
            <div style={{ display:'flex', background:'#ECECEC', borderRadius:radius.md, padding:3, gap:2 }}>
              {(['mayor','submajor','detalle','auxiliar'] as const).map(v => {
                const labels: Record<string,string> = { mayor:'Mayor', submajor:'Sub mayor', detalle:'Detalle', auxiliar:'Auxiliar' };
                return (
                  <button key={v} onClick={() => { setNivelSel(v as Nivel); setParentSel(null); }}
                    style={{ flex:1, height:26, borderRadius:radius.sm, border:'none', cursor:'pointer', fontSize:11, fontFamily:F, fontWeight:500,
                      background: nivelSel === v ? BRAND : 'transparent',
                      color: nivelSel === v ? '#FFFFFF' : C.n700,
                      transition:'all .15s',
                    }}>
                    {labels[v] ?? v}
                  </button>
                );
              })}
            </div>
            {nivelSel === 'auxiliar' && (
              <p style={{ fontSize:10.5, color:C.n700, margin:'6px 0 0', fontFamily:F }}>
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

          {/* ─── SUB MAYOR / DETALLE / AUXILIAR - solo se pregunta la cuenta madre; el Grupo NIIF ya viene incluido en esa cuenta madre, así que solo se informa.
              Auxiliar incluida acá: sin este paso, crear un proveedor/cliente desde "Nueva
              cuenta" (sin venir del botón "+" de una fila) no tenía forma de elegir a qué
              cuenta Detalle pertenece, así que nunca se detectaba como proveedor y los campos
              de entorno fiscal / cuentas bancarias / días de crédito no aparecían nunca. ─── */}
          {(nivelSel === 'submajor' || nivelSel === 'detalle' || nivelSel === 'auxiliar') && (() => {
            const lbl = nivelSel === 'submajor' ? 'Cuenta Mayor' : nivelSel === 'detalle' ? 'Cuenta Sub Mayor' : 'Cuenta Detalle';
            const requiredNivel = nivelSel === 'submajor' ? 'mayor' : nivelSel === 'detalle' ? 'submajor' : 'detalle';
            const candidatos = (allNodes as Cuenta[]).filter(n => n.nivel === requiredNivel);
            // Se agrupa por contexto para que la lista se lea como jerarquía: las cuentas
            // mayores por grupo NIIF y las sub mayores bajo su mayor.
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
                <p style={{ fontSize:10.5, fontWeight:500, color:'#0F0F0F', margin:'0 0 4px', fontFamily:F }}>{lbl} <span style={{ color:C.error }}>*</span></p>
                <AccountPickerSelect
                  groups={groups}
                  selected={parentSel}
                  placeholder="Buscar cuenta padre por código o nombre…"
                  onSelect={c => { setParentSel(c); set('grupo', c.grupo); }}
                  emptyLabel={candidatos.length===0 ? `No hay cuentas ${lbl.replace('Cuenta ','')} creadas todavía.` : undefined}
                />
                {parentSel ? (
                  <p style={{ fontSize:10.5, color:C.n700, margin:'5px 0 0', fontFamily:F }}>
                    Grupo NIIF: <strong style={{ color:BRAND }}>{grupoHeredadoLabel}</strong>
                  </p>
                ) : (
                  <p style={{ fontSize:10.5, color:C.n700, margin:'5px 0 0', fontFamily:F }}>
                    {candidatos.length===0 ? `No hay cuentas ${lbl.replace('Cuenta ','')} creadas todavía.` : `Seleccioná la ${lbl.toLowerCase()}.`}
                  </p>
                )}
              </div>
            );
          })()}

        </div>
  );
}
