'use client';
import { Button, FormField, Input, Select, Checkbox } from '@/components/ui/formulario';
import { radius , C } from '@/components/ui/tokens';
import { IcClose, IcCheck } from '@/components/ui/icons';
import { GRUPOS_NIIF, TIPOS_ESPECIAL, NIVEL_LABELS, MONEDAS, TIPOS_IMPUESTO } from '../catalogoData';
import { BRAND, F, GRUPOS_PATRIMONIO } from './datos';
import { NiifSearchSelect } from './piezas';
import { useEditForm } from './editForm/useEditForm';
import { SeccionUbicacion } from './editForm/SeccionUbicacion';
import { SeccionDetalle } from './editForm/SeccionDetalle';
import { SeccionTercero } from './editForm/SeccionTercero';

// ── Formulario de edición o alta ──────────────────────────────────────────────────────────
export function EditForm(props: Parameters<typeof useEditForm>[0]) {
  const e = useEditForm(props);
  const { isNew, parentAccount, onCancel, nivel, naturaleza, posteable, errors, prefix, form, segLen, set, account, fullCode, codeErr, grupoLocked, niifLeaf, handleNiifSelect, esPatrimonio, effectiveParent, esClienteOProveedorAuxiliar, handleSubmit } = e;
  return (
    <>
      {/* Encabezado */}
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
              <span style={{ fontSize:10.5, color:C.n700, fontFamily:F }}>Subcuenta de:</span>
              <span style={{ fontSize:10.5, fontWeight:600, color:BRAND, fontFamily:F }}>{parentAccount.code}</span>
              <span style={{ fontSize:10.5, color:'#0F0F0F', fontFamily:F }}>{parentAccount.nombre}</span>
              <span style={{ fontSize:10.5, padding:'1px 5px', borderRadius:4, background:'#ECECEC', color:C.n700, fontFamily:F }}>{NIVEL_LABELS[parentAccount.nivel]}</span>
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
      {isNew && !parentAccount && <SeccionUbicacion e={e} />}



      {/* Derived fields banner - simplificado para auxiliar */}
      {nivel !== 'auxiliar' && (
        <div style={{ margin:'12px 14px 0', padding:10, background:'#F9F9F9', border:`1px solid ${C.n500}`, borderRadius:radius.md, display:'flex', gap:17, flexShrink:0 }}>
          <div>
            <p style={{ fontSize:10.5, color:C.n700, margin:'0 0 2px', fontFamily:F }}>Nivel</p>
            <p style={{ fontSize:11, fontWeight:500, color:C.n900, margin:0, fontFamily:F }}>{NIVEL_LABELS[nivel]??nivel}</p>
          </div>
          <div>
            <p style={{ fontSize:10.5, color:C.n700, margin:'0 0 2px', fontFamily:F }}>Naturaleza</p>
            <p style={{ fontSize:11, fontWeight:500, color:C.n900, margin:0, fontFamily:F }}>{naturaleza}</p>
          </div>
          <div>
            <p style={{ fontSize:10.5, color:C.n700, margin:'0 0 2px', fontFamily:F }}>Acepta movimientos</p>
            <p style={{ fontSize:11, fontWeight:500, color:posteable?BRAND:C.n700, margin:0, fontFamily:F }}>{posteable?'Sí':'No'}</p>
          </div>
        </div>
      )}
      {nivel==='detalle' && <p style={{ fontSize:10.5, color:BRAND, margin:'5px 14px 0', fontFamily:F, lineHeight:1.5 }}>Cuenta final · acepta asientos contables.</p>}
      {nivel==='submajor' && <p style={{ fontSize:10.5, color:C.n700, margin:'5px 14px 0', fontFamily:F, lineHeight:1.5 }}>Sub mayor (Estructura) · subdivide la Mayor. No acepta movimientos.</p>}
      {nivel==='mayor'    && <p style={{ fontSize:10.5, color:C.n700, margin:'5px 14px 0', fontFamily:F, lineHeight:1.5 }}>Mayor · raíz contable (ej. 100). Solo agrupa sub mayores, no acepta movimientos.</p>}
      {nivel==='auxiliar' && <p style={{ fontSize:10.5, color:BRAND, margin:'5px 14px 0', fontFamily:F, lineHeight:1.5 }}>Auxiliar · cuenta de cliente o proveedor. Acepta asientos y centros de costo.</p>}

      <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:12 }}>
        {/* Código */}
        <div>
          <p style={{ fontSize:10.5, fontWeight:500, color:C.n900, margin:'0 0 7px', fontFamily:F }}>Código contable <span style={{ color:C.error }}>*</span></p>

          {/* Campo: prefijo (si hay cuenta madre) y segmento nuevo */}
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
              placeholder={'0'.repeat(segLen)} aria-label={'0'.repeat(segLen)}
              style={{ flex:1, height:33, padding:'0 10px', fontSize:13, fontFamily:F, color:C.n900, background:'#FFFFFF', border:'none', outline:'none', letterSpacing:'.08em' }}
            />
          </div>

          {errors.codeSegment ? (
            <p style={{ fontSize:10.5, color:C.error, margin:'4px 0 0', fontFamily:F }}>{errors.codeSegment}</p>
          ) : (
            <p style={{ fontSize:10.5, color:C.n700, margin:'4px 0 0', fontFamily:F }}>
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
                    <p style={{ fontSize:10.5, color:C.n700, margin:'4px 0 0', fontFamily:F }}>Heredado del padre · no editable</p>
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

          {/* ── Rol especial: se define únicamente en Detalle; Auxiliar hereda (badge abajo) ── */}
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
              <p style={{ fontSize:10.5, color:C.n700, margin:0, fontFamily:F }}>Rol especial heredado del Detalle</p>
              <p style={{ fontSize:11, fontWeight:500, color:BRAND, margin:'1px 0 0', fontFamily:F }}>
                {TIPOS_ESPECIAL.find(t=>t.value===effectiveParent.tipoEspecial)?.label ?? effectiveParent.tipoEspecial}
              </p>
            </div>
          </div>
        )}

        {/* ── Centro de costo: se define únicamente en Detalle; Auxiliar hereda ── */}
        {nivel === 'detalle' && <SeccionDetalle e={e} />}
        {/* Auxiliar: muestra el CC heredado del Detalle (solo lectura) */}
        {nivel === 'auxiliar' && (effectiveParent?.centroCostoObligatorio || effectiveParent?.usaCentroCosto) && (
          <div style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 10px', background:'#F9F9F9', border:`1px solid ${C.n500}`, borderRadius:radius.md }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={BRAND}><path d="M7 1v6M4 10l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/></svg>
            <p style={{ fontSize:10.5, color:C.n700, margin:0, fontFamily:F }}>
              Centro de costo <strong style={{ color:BRAND }}>obligatorio</strong> · heredado del Detalle
            </p>
          </div>
        )}

        {/* Entorno fiscal + cuentas bancarias + días de crédito - Auxiliar bajo Clientes o Proveedores */}
        {esClienteOProveedorAuxiliar && <SeccionTercero e={e} />}

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
