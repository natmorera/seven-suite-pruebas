'use client';
import { useState, useEffect } from 'react';
import { InfoBox } from '../../ui/primitives';
import { Button, FormField, Input, Select } from '../../ui/formulario';
import { radius, shadow } from '../../ui/tokens';
import { IcClose, IcCheck } from '../../ui/icons';
import { C } from '../../ui/tokens';
import { fmt } from './datos/arbol';
import { EJERCICIOS_VIGENTES, F, type Props, codeStyle, todayISO, yearBounds } from './modalTrasladoSaldo/datos';
import { SaldoPill, Steps } from './modalTrasladoSaldo/piezas';

export default function ModalTrasladoSaldo({ cuentaDestino, cuentas, onConfirm, onCancel }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [origenId, setOrigenId] = useState('');
  const [ejercicio, setEjercicio] = useState(EJERCICIOS_VIGENTES[0].value);
  const [fecha, setFecha] = useState(todayISO());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Keep fecha within selected year bounds
  useEffect(() => {
    const { min, max } = yearBounds(ejercicio);
    if (fecha < min) setFecha(min);
    if (fecha > max) setFecha(max);
  }, [ejercicio]);

  // Eligible origins: only posteable accounts (detalle/auxiliar) that are NOT the destination
  // and have non-zero saldo, and share the same naturaleza as destination
  const origenOpts = [
    { value: '', label: '- Seleccionar cuenta de origen -' },
    ...cuentas
      .filter(c =>
        c.posteable &&
        c.id !== cuentaDestino.id &&
        c.saldo !== 0 &&
        c.naturaleza === cuentaDestino.naturaleza
      )
      .map(c => ({
        value: c.id,
        label: `${c.codigo} - ${c.nombre} (saldo: ${c.moneda === 'USD' ? '$' : '₡'} ${fmt(Math.abs(c.saldo))})`,
      })),
  ];

  const cuentaOrigen = cuentas.find(c => c.id === origenId) ?? null;
  const { min: minFecha, max: maxFecha } = yearBounds(ejercicio);

  function validate() {
    const e: Record<string, string> = {};
    if (!origenId) e.origen = 'Debe seleccionar la cuenta de origen.';
    if (!fecha) e.fecha = 'La fecha es requerida.';
    else if (fecha < minFecha || fecha > maxFecha) e.fecha = `La fecha debe estar dentro del ejercicio ${ejercicio}.`;
    if (cuentaOrigen && cuentaOrigen.moneda !== cuentaDestino.moneda)
      e.moneda = 'La moneda de la cuenta origen (CRC) y destino (USD) deben coincidir para realizar el traslado.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (validate()) setStep(2);
  }

  function handleConfirm() {
    if (!cuentaOrigen) return;
    const ref = `TRK-${Date.now().toString().slice(-6)}`;
    onConfirm({
      origenId: cuentaOrigen.id,
      origenCodigo: cuentaOrigen.code || cuentaOrigen.codigo || '',
      origenNombre: cuentaOrigen.nombre,
      origenSaldo: cuentaOrigen.saldo,
      destinoCodigo: cuentaDestino.code || cuentaDestino.codigo || '',
      destinoNombre: cuentaDestino.nombre,
      fecha,
      ejercicio,
      asientoRef: ref,
    });
    setStep(3);
  }

  return (
    // Overlay
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding:17,
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: radius.lg, width: '100%', maxWidth: 580,
        boxShadow: shadow.modal, display: 'flex', flexDirection: 'column',
        maxHeight: '90vh', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding:'16px 21px 12px', borderBottom: `1px solid ${C.n500}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize:14, fontWeight: 600, color: C.n900, margin:0, fontFamily: F }}>
              Traslado de saldo
            </p>
            <p style={{ fontSize:10, color: C.n700, margin:'3px 0 0', fontFamily: F }}>
              Migra el saldo de una cuenta existente a la cuenta nueva.
            </p>
          </div>
          {step < 3 && (
            <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, display: 'flex', padding:4, marginTop: -2 }}>
              <IcClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding:'17px 21px' }}>
          <Steps current={step} />

          {/* ── Step 1: origen + fecha ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap:16 }}>
              <InfoBox>
                Solo se traslada el saldo actual - no el historial de movimientos. El historial permanece visible en el Analítico de cuentas. La cuenta de origen quedará inactiva automáticamente.
              </InfoBox>

              {/* Cuenta destino (read-only - ya viene prellenada) */}
              <div>
                <p style={{ fontSize:10, fontWeight: 500, color: C.n900, margin:'0 0 5px', fontFamily: F }}>
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
                  <span style={{ fontSize:9, color: C.brand, fontFamily: F, background: '#FFFFFF', border: `1px solid ${C.brandBd}`, borderRadius: 4, padding:'2px 7px' }}>Destino</span>
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
                  <span style={{ fontSize:10, color: C.error, fontFamily: F }}>{errors.moneda}</span>
                </div>
              )}

              {/* Preview saldo origen if selected */}
              {cuentaOrigen && !errors.moneda && (
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap:10,
                  padding:'10px 12px', background: C.n200, borderRadius: radius.md, border: `1px solid ${C.n500}`,
                }}>
                  <div>
                    <p style={{ fontSize:9, color: C.n700, margin:'0 0 4px', fontFamily: F }}>Saldo a trasladar</p>
                    <SaldoPill saldo={cuentaOrigen.saldo} moneda={cuentaOrigen.moneda} />
                  </div>
                  <div>
                    <p style={{ fontSize:9, color: C.n700, margin:'0 0 4px', fontFamily: F }}>Moneda</p>
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
                  <p style={{ fontSize:10, fontWeight: 600, color: '#7A5C00', margin:'0 0 3px', fontFamily: F }}>Efectos automáticos al confirmar</p>
                  <ul style={{ fontSize:10, color: '#7A5C00', margin:0, paddingLeft:14, fontFamily: F, lineHeight: 1.6 }}>
                    <li>La cuenta de origen quedará <strong>inactiva</strong> de inmediato.</li>
                    <li>El asiento se <strong>contabiliza</strong> en el momento.</li>
                    <li>El historial de la cuenta origen seguirá visible en el <strong>Analítico</strong>.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: revisión ── */}
          {step === 2 && cuentaOrigen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap:14 }}>
              <p style={{ fontSize:11, color: C.n700, margin:0, fontFamily: F }}>
                Revise los datos antes de confirmar. Esta operación no se puede deshacer fácilmente.
              </p>

              {/* Resumen del asiento */}
              <div style={{ border: `1px solid ${C.n500}`, borderRadius: 10, overflow: 'hidden' }}>
                {/* Header tabla */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', background: C.n200, borderBottom: `1px solid ${C.n500}`, padding:'7px 14px' }}>
                  <span style={{ fontSize:9, color: C.n700, fontWeight: 600, fontFamily: F }}>CUENTA</span>
                  <span style={{ fontSize:9, color: C.n700, fontWeight: 600, fontFamily: F, textAlign: 'right' }}>DÉBITO</span>
                  <span style={{ fontSize:9, color: C.n700, fontWeight: 600, fontFamily: F, textAlign: 'right' }}>CRÉDITO</span>
                </div>

                {/* Línea origen (se acredita si es Deudora, se debita si es Acreedora) */}
                {[
                  {
                    codigo: cuentaOrigen.codigo,
                    nombre: cuentaOrigen.nombre,
                    debito: cuentaOrigen.naturaleza === 'Acreedora' ? Math.abs(cuentaOrigen.saldo) : 0,
                    credito: cuentaOrigen.naturaleza === 'Deudora' ? Math.abs(cuentaOrigen.saldo) : 0,
                    badge: 'Origen',
                  },
                  {
                    codigo: cuentaDestino.codigo || '-',
                    nombre: cuentaDestino.nombre || '-',
                    debito: cuentaDestino.naturaleza === 'Deudora' ? Math.abs(cuentaOrigen.saldo) : 0,
                    credito: cuentaDestino.naturaleza === 'Acreedora' ? Math.abs(cuentaOrigen.saldo) : 0,
                    badge: 'Destino',
                  },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', padding:'10px 14px', borderBottom: i === 0 ? `1px solid ${C.n500}` : 'none', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap:5 }}>
                        <span style={{ fontSize:11, fontWeight: 500, color: C.n900, ...codeStyle }}>{row.codigo}</span>
                        <span style={{ fontSize:9, padding:'1px 5px', borderRadius: 4, background: C.brandBg, color: C.brand, fontFamily: F }}>{row.badge}</span>
                      </div>
                      <span style={{ fontSize:10, color: C.n700, fontFamily: F }}>{row.nombre}</span>
                    </div>
                    <span style={{ fontSize:11, color: row.debito > 0 ? C.n900 : C.n500, textAlign: 'right', ...codeStyle }}>
                      {row.debito > 0 ? fmt(row.debito) : '-'}
                    </span>
                    <span style={{ fontSize:11, color: row.credito > 0 ? C.n900 : C.n500, textAlign: 'right', ...codeStyle }}>
                      {row.credito > 0 ? fmt(row.credito) : '-'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Metadatos del asiento */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap:10, padding:'10px 12px', background: C.n200, borderRadius: radius.md }}>
                <div>
                  <p style={{ fontSize:9, color: C.n700, margin:'0 0 3px', fontFamily: F }}>Fecha</p>
                  <p style={{ fontSize:11, fontWeight: 500, color: C.n900, margin:0, fontFamily: F }}>{fecha}</p>
                </div>
                <div>
                  <p style={{ fontSize:9, color: C.n700, margin:'0 0 3px', fontFamily: F }}>Ejercicio</p>
                  <p style={{ fontSize:11, fontWeight: 500, color: C.n900, margin:0, fontFamily: F }}>{ejercicio}</p>
                </div>
                <div>
                  <p style={{ fontSize:9, color: C.n700, margin:'0 0 3px', fontFamily: F }}>Tipo</p>
                  <p style={{ fontSize:11, fontWeight: 500, color: C.n900, margin:0, fontFamily: F }}>Traslado de saldo</p>
                </div>
              </div>

              {/* Recordatorio de efectos */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap:7, padding:'9px 12px', background: 'rgba(226,75,74,.06)', border: '1px solid rgba(226,75,74,.2)', borderRadius: radius.md }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={C.error} strokeWidth="1.3" style={{ flexShrink: 0, marginTop:1 }}>
                  <circle cx="7" cy="7" r="5.83"/><path d="M7 4.67v2.33M7 9.33h.01" strokeLinecap="round"/>
                </svg>
                <p style={{ fontSize:10, color: C.error, margin:0, fontFamily: F }}>
                  La cuenta <strong style={{ ...codeStyle }}>{cuentaOrigen.codigo}</strong> - {cuentaOrigen.nombre} quedará <strong>inactiva</strong> al confirmar.
                  El asiento se contabilizará de inmediato.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 3: confirmado ── */}
          {step === 3 && cuentaOrigen && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap:17, padding:'14px 0' }}>
              <div style={{
                width: 56, height:56, borderRadius: '50%', background: 'rgba(29,158,117,.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="30" height="24" viewBox="0 0 30 24" fill="none">
                  <path d="M3 12L11 20L27 4" stroke="#1D9E75" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize:14, fontWeight: 600, color: C.n900, margin:'0 0 5px', fontFamily: F }}>Traslado realizado</p>
                <p style={{ fontSize:11, color: C.n700, margin:0, fontFamily: F }}>
                  El saldo fue trasladado y el asiento fue contabilizado.
                </p>
              </div>
              {/* Summary cards */}
              <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap:9 }}>
                {[
                  { label: 'Cuenta origen (inactiva)', code: cuentaOrigen.codigo, name: cuentaOrigen.nombre, color: C.n700 },
                  { label: 'Cuenta destino', code: cuentaDestino.codigo || '-', name: cuentaDestino.nombre || '-', color: C.brand },
                ].map(card => (
                  <div key={card.code} style={{ padding:'9px 12px', background: C.n200, borderRadius: radius.md, border: `1px solid ${C.n500}` }}>
                    <p style={{ fontSize:9, color: C.n700, margin:'0 0 4px', fontFamily: F }}>{card.label}</p>
                    <p style={{ fontSize:11, fontWeight: 600, color: card.color, margin:'0 0 2px', ...codeStyle }}>{card.code}</p>
                    <p style={{ fontSize:10, color: C.n700, margin:0, fontFamily: F }}>{card.name}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap:14, width: '100%', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize:9, color: C.n700, margin:'0 0 4px', fontFamily: F }}>Saldo trasladado</p>
                  <SaldoPill saldo={cuentaOrigen.saldo} moneda={cuentaOrigen.moneda} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize:9, color: C.n700, margin:'0 0 4px', fontFamily: F }}>Fecha contabilización</p>
                  <span style={{ fontSize:11, fontWeight: 500, color: C.n900, fontFamily: F }}>{fecha}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 21px', borderTop: `1px solid ${C.n500}`, display: 'flex', justifyContent: 'flex-end', gap:7, flexShrink: 0 }}>
          {step === 1 && (
            <>
              <Button variant="secondary" onClick={onCancel}>Cancelar - sin traslado</Button>
              <Button onClick={handleNext} icon={<IcCheck className="w-3 h-3" />}>
                Continuar
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="secondary" onClick={() => setStep(1)}>Atrás</Button>
              <Button onClick={handleConfirm} icon={<IcCheck className="w-3 h-3" />}>
                Confirmar traslado
              </Button>
            </>
          )}
          {step === 3 && (
            <Button onClick={onCancel}>Cerrar</Button>
          )}
        </div>
      </div>
    </div>
  );
}
