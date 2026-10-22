'use client';
import { FormField, Input, Select } from '@/components/ui/formulario';
import { radius , C } from '@/components/ui/tokens';
import { IcTrash, IcPlus } from '@/components/ui/icons';
import { REGIMENES_FISCALES, TIPOS_IDENTIFICACION_FISCAL, MONEDAS_BANCO, TIPOS_CUENTA_BANCO } from '../../catalogoData';
import { BRAND, F } from '../datos';
import { type EstadoEditForm } from './useEditForm';

// Datos del cliente o proveedor de una cuenta auxiliar
export function SeccionTercero({ e }: { e: EstadoEditForm }) {
  const { esProveedorAuxiliar, form, set, errors, agregarBancaria, bancarias, actualizarBancaria, eliminarBancaria } = e;
  return (
          <div style={{ display:'flex', flexDirection:'column', gap:14, padding:12, background:'#F9F9F9', border:`1px solid ${C.n500}`, borderRadius:radius.md }}>
            <p style={{ fontSize:10.5, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.06em', margin:0, fontFamily:F }}>
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
                <p style={{ fontSize:10.5, fontWeight:500, color:C.n900, margin:0, fontFamily:F }}>Cuentas bancarias</p>
                <button type="button" onClick={agregarBancaria} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:BRAND, fontSize:11, fontFamily:F, fontWeight:500 }}>
                  <IcPlus className="w-3 h-3"/> Agregar cuenta
                </button>
              </div>
              {bancarias.length === 0 && (
                <p style={{ fontSize:10.5, color:C.n700, margin:0, fontFamily:F }}>Sin cuentas bancarias agregadas todavía.</p>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {bancarias.map(b=>(
                  <div key={b.id} style={{ display:'grid', gridTemplateColumns:'1.2fr 1.4fr 0.8fr 0.9fr auto', gap:6, alignItems:'center', padding:8, background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:radius.sm }}>
                    <Input value={b.banco} onChange={v=>actualizarBancaria(b.id,{banco:v})} placeholder="Banco"/>
                    <Input value={b.numero} onChange={v=>actualizarBancaria(b.id,{numero:v})} placeholder="N° de cuenta / IBAN"/>
                    <Select ariaLabel="Moneda de la cuenta" value={b.moneda} onChange={v=>actualizarBancaria(b.id,{moneda:v})} options={MONEDAS_BANCO}/>
                    <Select ariaLabel="Tipo de cuenta bancaria" value={b.tipo} onChange={v=>actualizarBancaria(b.id,{tipo:v})} options={TIPOS_CUENTA_BANCO}/>
                    <button type="button" onClick={()=>eliminarBancaria(b.id)} style={{ display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer', color:C.error }}>
                      <IcTrash className="w-3 h-3"/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
  );
}
