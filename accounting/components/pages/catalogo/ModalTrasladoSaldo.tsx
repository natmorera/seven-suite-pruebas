'use client';
import { Button } from '@/components/ui/formulario';
import { radius, shadow , C } from '@/components/ui/tokens';
import { IcClose, IcCheck } from '@/components/ui/icons';
import { F, codeStyle } from './modalTrasladoSaldo/datos';
import { SaldoPill, Steps } from './modalTrasladoSaldo/piezas';
import { useTrasladoSaldo } from './trasladoSaldo/useTrasladoSaldo';
import { PasoOrigen } from './trasladoSaldo/PasoOrigen';
import { PasoDestino } from './trasladoSaldo/PasoDestino';

export default function ModalTrasladoSaldo(props: Parameters<typeof useTrasladoSaldo>[0]) {
  const e = useTrasladoSaldo(props);
  const { step, onCancel, cuentaOrigen, cuentaDestino, fecha, handleNext, setStep, handleConfirm } = e;
  return (
    // Fondo
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding:17,
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: radius.lg, width: '100%', maxWidth: 580,
        boxShadow: shadow.modal, display: 'flex', flexDirection: 'column',
        maxHeight: '90vh', overflow: 'hidden',
      }}>
        {/* Encabezado */}
        <div style={{
          padding:'16px 21px 12px', borderBottom: `1px solid ${C.n500}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize:14, fontWeight: 600, color: C.n900, margin:0, fontFamily: F }}>
              Traslado de saldo
            </p>
            <p style={{ fontSize:10.5, color: C.n700, margin:'3px 0 0', fontFamily: F }}>
              Migra el saldo de una cuenta existente a la cuenta nueva.
            </p>
          </div>
          {step < 3 && (
            <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, display: 'flex', padding:4, marginTop: -2 }}>
              <IcClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, overflowY: 'auto', padding:'17px 21px' }}>
          <Steps current={step} />

          {/* ── Paso 1: origen y fecha ── */}
          {step === 1 && <PasoOrigen e={e} />}

          {/* ── Paso 2: revisión ── */}
          {step === 2 && cuentaOrigen && <PasoDestino e={e} />}

          {/* ── Paso 3: confirmado ── */}
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
              {/* Tarjetas de resumen */}
              <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap:9 }}>
                {[
                  { label: 'Cuenta origen (inactiva)', code: cuentaOrigen.codigo, name: cuentaOrigen.nombre, color: C.n700 },
                  { label: 'Cuenta destino', code: cuentaDestino.codigo || '-', name: cuentaDestino.nombre || '-', color: C.brand },
                ].map(card => (
                  <div key={card.code} style={{ padding:'9px 12px', background: C.n200, borderRadius: radius.md, border: `1px solid ${C.n500}` }}>
                    <p style={{ fontSize:10.5, color: C.n700, margin:'0 0 4px', fontFamily: F }}>{card.label}</p>
                    <p style={{ fontSize:11, fontWeight: 600, color: card.color, margin:'0 0 2px', ...codeStyle }}>{card.code}</p>
                    <p style={{ fontSize:10.5, color: C.n700, margin:0, fontFamily: F }}>{card.name}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap:14, width: '100%', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize:10.5, color: C.n700, margin:'0 0 4px', fontFamily: F }}>Saldo trasladado</p>
                  <SaldoPill saldo={cuentaOrigen.saldo} moneda={cuentaOrigen.moneda} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize:10.5, color: C.n700, margin:'0 0 4px', fontFamily: F }}>Fecha contabilización</p>
                  <span style={{ fontSize:11, fontWeight: 500, color: C.n900, fontFamily: F }}>{fecha}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie */}
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
