'use client';
import { C, radius } from '@/components/ui/tokens';
import { BRAND } from '../datos';
import { type EstadoGestion } from './useGestion';

// Opción de generar cheque cuando el banco del pago tiene chequera
export function SeccionChequera({ e }: { e: EstadoGestion }) {
  const { generarCheque, setGenerarCheque } = e;
  return (
                <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                  border:`1px solid ${generarCheque ? C.brandBd : C.n500}`,
                  borderRadius:radius.md, background: generarCheque ? C.brandBg : '#FFFFFF', cursor:'pointer' }}
                  onClick={() => setGenerarCheque(v => !v)}>
                  <span style={{ position:'relative', width:16, height:16, flexShrink:0 }}>
                    <input type="checkbox" aria-label="Seleccionar" checked={generarCheque} onChange={e => setGenerarCheque(e.target.checked)}
                      onClick={e => e.stopPropagation()}
                      style={{ position:'absolute', opacity:0, width:16, height:16, margin:0, cursor:'pointer' }}/>
                    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', width:16, height:16, borderRadius:4,
                      border:`1.5px solid ${generarCheque ? BRAND : C.n500}`,
                      background: generarCheque ? BRAND : '#FFFFFF', transition:'all .12s' }}>
                      {generarCheque && (
                        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2.33 7L5.25 9.92L11.67 4.08"/>
                        </svg>
                      )}
                    </span>
                  </span>
                  <div>
                    <p style={{ fontSize:12, fontWeight:600, margin:0, color: generarCheque ? BRAND : '#0F0F0F' }}>Generar cheque</p>
                    <p style={{ fontSize:11, color:C.n700, margin:0 }}>Este banco tiene chequera habilitada. Se generará un cheque al aplicar.</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={generarCheque ? BRAND : C.n700} strokeWidth="1.4" style={{ marginLeft:'auto', flexShrink:0 }}>
                    <rect x="1" y="3" width="12" height="8" rx="1.5"/><path d="M4 6h4M4 8.5h2" strokeLinecap="round"/>
                  </svg>
                </div>
  );
}
