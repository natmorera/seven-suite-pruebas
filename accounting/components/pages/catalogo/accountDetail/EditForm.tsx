'use client';
import { useState, useEffect } from 'react';
import { Button, FormField, Input, Select, Checkbox } from '../../../ui/formulario';
import { radius } from '../../../ui/tokens';
import { IcClose, IcTrash, IcCheck, IcPlus } from '../../../ui/icons';
import { C } from '../../../ui/tokens';
import { Cuenta, Nivel, GRUPOS_NIIF, TIPOS_ESPECIAL, NIVEL_LABELS, isCCObligatorioBySpec, SEP, LONGITUD, MONEDAS, REGIMENES_FISCALES, TIPOS_IDENTIFICACION_FISCAL, MONEDAS_BANCO, TIPOS_CUENTA_BANCO, TIPOS_IMPUESTO } from '../catalogoData';
import { getNaturaleza, getChildNivelConfigurable, isPosteable, codeExists, buildCodePrefix, suggestNextSegment, suggestNextMayorSegment, genId } from '../datos/arbol';
import { useCentrosCostoConfig } from '../centrosCostoConfig';
import { BRAND, F, GRUPOS_PATRIMONIO, NIIF_LEAVES, type NiifLeaf } from './datos';
import { AccountPickerSelect, NiifSearchSelect } from './piezas';

// ── Edit/Create form ──────────────────────────────────────────────────────────
export function EditForm({ account, parentAccount, allNodes, onSave, onCancel, isNew }: {
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
  // Issue #7: siempre se ofrece la sugerencia de código que sigue en el nivel.
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
  // Antes esta sección solo se mostraba para proveedores (tipoEspecial '04'), pero
  // días de crédito, entorno fiscal y cuentas bancarias aplican igual a clientes
  // (tipoEspecial '02'/'03') para calcular el vencimiento de cuentas por cobrar.
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
              <span style={{ fontSize:9, padding:'1px 5px', borderRadius:4, background:'#ECECEC', color:C.n700, fontFamily:F }}>{NIVEL_LABELS[parentAccount.nivel]}</span>
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

          {/* ─── SUB MAYOR / DETALLE / AUXILIAR - solo se pregunta la cuenta madre; Issue #4/#5:
              el Grupo NIIF ya viene incluido en esa cuenta madre, así que solo se informa.
              Auxiliar incluida acá: sin este paso, crear un proveedor/cliente desde "Nueva
              cuenta" (sin venir del botón "+" de una fila) no tenía forma de elegir a qué
              cuenta Detalle pertenece, así que nunca se detectaba como proveedor y los campos
              de entorno fiscal / cuentas bancarias / días de crédito no aparecían nunca. ─── */}
          {(nivelSel === 'submajor' || nivelSel === 'detalle' || nivelSel === 'auxiliar') && (() => {
            const lbl = nivelSel === 'submajor' ? 'Cuenta Mayor' : nivelSel === 'detalle' ? 'Cuenta Sub Mayor' : 'Cuenta Detalle';
            const requiredNivel = nivelSel === 'submajor' ? 'mayor' : nivelSel === 'detalle' ? 'submajor' : 'detalle';
            const candidatos = (allNodes as Cuenta[]).filter(n => n.nivel === requiredNivel);
            // Agrupar por contexto para que la lista se lea como jerarquía en vez de
            // un bloque plano de códigos: las Cuenta Mayor se agrupan por Grupo NIIF
            // (ya que el grupo ya no se pregunta aparte); las Sub mayor se agrupan
            // bajo su Mayor.
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
        <div style={{ margin:'12px 14px 0', padding:10, background:'#F9F9F9', border:`1px solid ${C.n500}`, borderRadius:radius.md, display:'flex', gap:17, flexShrink:0 }}>
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
              <div style={{ display:'flex', alignItems:'center', padding:'0 10px', background:'#F9F9F9', borderRight:`1px solid ${C.n500}`, fontSize:13, color:C.n700, fontFamily:F, flexShrink:0, letterSpacing:'.02em' }}>
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
              style={{ flex:1, height:33, padding:'0 10px', fontSize:13, fontFamily:F, color:C.n900, background:'#FFFFFF', border:'none', outline:'none', letterSpacing:'.08em' }}
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

          {/* ── Rol especial - Issue #6: se define únicamente en Detalle; Auxiliar hereda (badge abajo) ── */}
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
          <div style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 10px', background:'#F9F9F9', border:`1px solid ${C.n500}`, borderRadius:radius.md }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={BRAND}><path d="M7 1v6M4 10l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/></svg>
            <div>
              <p style={{ fontSize:9, color:C.n700, margin:0, fontFamily:F }}>Rol especial heredado del Detalle</p>
              <p style={{ fontSize:11, fontWeight:500, color:BRAND, margin:'1px 0 0', fontFamily:F }}>
                {TIPOS_ESPECIAL.find(t=>t.value===effectiveParent.tipoEspecial)?.label ?? effectiveParent.tipoEspecial}
              </p>
            </div>
          </div>
        )}

        {/* ── Centro de costo - Issue #6: se define únicamente en Detalle; Auxiliar hereda ── */}
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
          <p style={{ fontSize:10, color:C.n700, margin:'5px 0 0', fontFamily:F }}>Esta decisión la heredan automáticamente los Auxiliares de esta cuenta.</p>

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
          <div style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 10px', background:'#F9F9F9', border:`1px solid ${C.n500}`, borderRadius:radius.md }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={BRAND}><path d="M7 1v6M4 10l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/></svg>
            <p style={{ fontSize:10, color:C.n700, margin:0, fontFamily:F }}>
              Centro de costo <strong style={{ color:BRAND }}>obligatorio</strong> · heredado del Detalle
            </p>
          </div>
        )}

        {/* Entorno fiscal + cuentas bancarias + días de crédito - Auxiliar bajo Clientes o Proveedores */}
        {esClienteOProveedorAuxiliar && (
          <div style={{ display:'flex', flexDirection:'column', gap:14, padding:12, background:'#F9F9F9', border:`1px solid ${C.n500}`, borderRadius:radius.md }}>
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
                  <div key={b.id} style={{ display:'grid', gridTemplateColumns:'1.2fr 1.4fr 0.8fr 0.9fr auto', gap:6, alignItems:'center', padding:8, background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:radius.sm }}>
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
