'use client';
import { InfoBox } from '@/components/ui/primitives';
import { FormField, Input, Select } from '@/components/ui/formulario';
import { radius , C } from '@/components/ui/tokens';
import { EJERCICIOS_VIGENTES, F, codeStyle } from '../modalTrasladoSaldo/datos';
import { SaldoPill } from '../modalTrasladoSaldo/piezas';
import { type EstadoTrasladoSaldo } from './useTrasladoSaldo';

// Paso 1 del traslado: cuenta de origen y monto
export function PasoOrigen({ e }: { e: EstadoTrasladoSaldo }) {
  const { cuentaDestino, errors, origenId, setOrigenId, setErrors, origenOpts, cuentaOrigen, ejercicio, setEjercicio, minFecha, maxFecha, fecha, setFecha } = e;
  return (
            <div style={{ display: 'flex', flexDirection: 'column', gap:16 }}>
              <InfoBox>
                Solo se traslada el saldo actual - no el historial de movimientos. El historial permanece visible en el Analítico de cuentas. La cuenta de origen quedará inactiva automáticamente.
              </InfoBox>

              {/* Cuenta destino (solo lectura, viene precargada) */}
              <div>
                <p style={{ fontSize:10.5, fontWeight: 500, color: C.n900, margin:'0 0 5px', fontFamily: F }}>
                  Cuenta destino <span style={{ color: C.n700, fontWeight: 400 }}>(nueva cuenta)</span>
                </p>
                <div style={{
                  display: 'flex', alignItems: 'center', gap:9, padding:'9px 12px',
                  background: C.brandBg, border: `1px solid ${C.brandBd}`, borderRadius: radius.md,
                }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize:11, fontWeight: 600, color: C.brand, ...codeStyle }}>{cuentaDestino.codigo || '-'}</span>
                    <span style={{ fontSize:11, color: C.n900, fontFamily: F, marginLeft:7 }}>{cuentaDestino.nombre || '-'}</span>
                  </div>
                  <span style={{ fontSize:10.5, color: C.brand, fontFamily: F, background: '#FFFFFF', border: `1px solid ${C.brandBd}`, borderRadius: 4, padding:'2px 7px' }}>Destino</span>
                </div>
              </div>

              {/* Cuenta origen */}
              <FormField label="Cuenta de origen" required error={errors.origen}
                hint="Debe ser una cuenta posteable con saldo distinto de cero y misma naturaleza que el destino.">
                <Select
                  value={origenId}
                  onChange={v => { setOrigenId(v); setErrors(e => ({ ...e, origen: '', moneda: '' })); }}
                  options={origenOpts}
                  error={errors.origen}
                />
              </FormField>

              {/* Error de moneda */}
              {errors.moneda && (
                <div style={{ display: 'flex', alignItems: 'center', gap:5, padding:'7px 10px', background: 'rgba(244,67,54,.07)', border: '1px solid rgba(244,67,54,.25)', borderRadius: radius.md }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={C.error}><circle cx="7" cy="7" r="5.83"/><path d="M7 4.67v2.33M7 9.33h.01" strokeLinecap="round"/></svg>
                  <span style={{ fontSize:10.5, color: C.error, fontFamily: F }}>{errors.moneda}</span>
                </div>
              )}

              {/* Saldo de la cuenta de origen elegida */}
              {cuentaOrigen && !errors.moneda && (
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap:10,
                  padding:'10px 12px', background: C.n200, borderRadius: radius.md, border: `1px solid ${C.n500}`,
                }}>
                  <div>
                    <p style={{ fontSize:10.5, color: C.n700, margin:'0 0 4px', fontFamily: F }}>Saldo a trasladar</p>
                    <SaldoPill saldo={cuentaOrigen.saldo} moneda={cuentaOrigen.moneda} />
                  </div>
                  <div>
                    <p style={{ fontSize:10.5, color: C.n700, margin:'0 0 4px', fontFamily: F }}>Moneda</p>
                    <span style={{ fontSize:11, color: C.n900, fontFamily: F }}>
                      {cuentaOrigen.moneda === 'USD' ? 'Dólar estadounidense' : cuentaOrigen.moneda === 'EUR' ? 'Euro' : 'Colón costarricense'}
                    </span>
                  </div>
                </div>
              )}

              {/* Separador */}
              <div style={{ borderTop: `1px dashed ${C.n500}` }} />

              {/* Ejercicio fiscal */}
              <FormField label="Ejercicio fiscal"
                hint="El asiento se contabilizará en el ejercicio seleccionado. Solo se muestran ejercicios vigentes.">
                <Select
                  value={ejercicio}
                  onChange={v => setEjercicio(v)}
                  options={EJERCICIOS_VIGENTES}
                />
              </FormField>

              {/* Fecha de contabilización */}
              <FormField label="Fecha de contabilización" required error={errors.fecha}
                hint={`Debe estar dentro del año ${ejercicio} (${minFecha} - ${maxFecha}).`}>
                <Input
                  type="date"
                  value={fecha}
                  onChange={v => { setFecha(v); setErrors(e => ({ ...e, fecha: '' })); }}
                  min={minFecha}
                  max={maxFecha}
                  error={errors.fecha}
                />
              </FormField>

              {/* Warning sobre comportamiento automático */}
              <div style={{
                display: 'flex', gap:9, padding:'10px 12px',
                background: 'rgba(239,159,39,.08)', border: '1px solid rgba(239,159,39,.3)', borderRadius: radius.md,
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#A07000" strokeWidth="1.3" style={{ flexShrink: 0, marginTop:1 }}>
                  <path d="M8 1.33L14.67 13.33H1.33L8 1.33z" strokeLinejoin="round"/>
                  <path d="M8 6.67v2.67M8 11.33h.01" strokeLinecap="round"/>
                </svg>
                <div>
                  <p style={{ fontSize:10.5, fontWeight: 600, color: '#7A5C00', margin:'0 0 3px', fontFamily: F }}>Efectos automáticos al confirmar</p>
                  <ul style={{ fontSize:10.5, color: '#7A5C00', margin:0, paddingLeft:14, fontFamily: F, lineHeight: 1.6 }}>
                    <li>La cuenta de origen quedará <strong>inactiva</strong> de inmediato.</li>
                    <li>El asiento se <strong>contabiliza</strong> en el momento.</li>
                    <li>El historial de la cuenta origen seguirá visible en el <strong>Analítico</strong>.</li>
                  </ul>
                </div>
              </div>
            </div>
  );
}
