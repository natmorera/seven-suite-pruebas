'use client';
import { radius , C } from '@/components/ui/tokens';
import { fmt } from '../datos/arbol';
import { F, codeStyle } from '../modalTrasladoSaldo/datos';
import { type EstadoTrasladoSaldo } from './useTrasladoSaldo';

// Paso 2 del traslado: cuenta de destino
export function PasoDestino({ e }: { e: EstadoTrasladoSaldo }) {
  const { cuentaOrigen, cuentaDestino, fecha, ejercicio } = e;
  if (!cuentaOrigen) return null;
  return (
            <div style={{ display: 'flex', flexDirection: 'column', gap:14 }}>
              <p style={{ fontSize:11, color: C.n700, margin:0, fontFamily: F }}>
                Revise los datos antes de confirmar. Esta operación no se puede deshacer fácilmente.
              </p>

              {/* Resumen del asiento */}
              <div style={{ border: `1px solid ${C.n500}`, borderRadius: 10, overflow: 'hidden' }}>
                {/* Encabezado de la tabla */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', background: C.n200, borderBottom: `1px solid ${C.n500}`, padding:'7px 14px' }}>
                  <span style={{ fontSize:10.5, color: C.n700, fontWeight: 600, fontFamily: F }}>CUENTA</span>
                  <span style={{ fontSize:10.5, color: C.n700, fontWeight: 600, fontFamily: F, textAlign: 'right' }}>DÉBITO</span>
                  <span style={{ fontSize:10.5, color: C.n700, fontWeight: 600, fontFamily: F, textAlign: 'right' }}>CRÉDITO</span>
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
                        <span style={{ fontSize:10.5, padding:'1px 5px', borderRadius: 4, background: C.brandBg, color: C.brand, fontFamily: F }}>{row.badge}</span>
                      </div>
                      <span style={{ fontSize:10.5, color: C.n700, fontFamily: F }}>{row.nombre}</span>
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
                  <p style={{ fontSize:10.5, color: C.n700, margin:'0 0 3px', fontFamily: F }}>Fecha</p>
                  <p style={{ fontSize:11, fontWeight: 500, color: C.n900, margin:0, fontFamily: F }}>{fecha}</p>
                </div>
                <div>
                  <p style={{ fontSize:10.5, color: C.n700, margin:'0 0 3px', fontFamily: F }}>Ejercicio</p>
                  <p style={{ fontSize:11, fontWeight: 500, color: C.n900, margin:0, fontFamily: F }}>{ejercicio}</p>
                </div>
                <div>
                  <p style={{ fontSize:10.5, color: C.n700, margin:'0 0 3px', fontFamily: F }}>Tipo</p>
                  <p style={{ fontSize:11, fontWeight: 500, color: C.n900, margin:0, fontFamily: F }}>Traslado de saldo</p>
                </div>
              </div>

              {/* Recordatorio de efectos */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap:7, padding:'9px 12px', background: 'rgba(226,75,74,.06)', border: '1px solid rgba(226,75,74,.2)', borderRadius: radius.md }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={C.error} strokeWidth="1.3" style={{ flexShrink: 0, marginTop:1 }}>
                  <circle cx="7" cy="7" r="5.83"/><path d="M7 4.67v2.33M7 9.33h.01" strokeLinecap="round"/>
                </svg>
                <p style={{ fontSize:10.5, color: C.error, margin:0, fontFamily: F }}>
                  La cuenta <strong style={{ ...codeStyle }}>{cuentaOrigen.codigo}</strong> - {cuentaOrigen.nombre} quedará <strong>inactiva</strong> al confirmar.
                  El asiento se contabilizará de inmediato.
                </p>
              </div>
            </div>
  );
}
