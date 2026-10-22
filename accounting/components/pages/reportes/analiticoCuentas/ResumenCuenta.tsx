'use client';
import { C, radius } from '@/components/ui/tokens';
import { BRAND, F, fmt2 } from './datos';
import { type EstadoAnalitico } from './useAnalitico';

// Encabezado con los datos y saldos de la cuenta consultada
export function ResumenCuenta({ e }: { e: EstadoAnalitico }) {
  const { cuentaSel, esAuxiliar, sym, saldoInicial, setCuentaSel } = e;
  if (!cuentaSel) return null;
  return (
          <div style={{ padding:'12px 24px', borderBottom:`1px solid ${C.n500}`,
            background:C.brandBg, display:'flex', gap:32, alignItems:'flex-start', flexShrink:0 }}>
            <div>
              <p style={{ fontSize:10.5, color:C.n700, textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 2px', fontFamily:F }}>CUENTA</p>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:13, fontWeight:700, color:BRAND, fontFamily:F }}>{cuentaSel.code}</span>
                {cuentaSel.banco && <span style={{ fontSize:12, color:'#0F0F0F', fontFamily:F }}>{cuentaSel.banco}</span>}
                <span style={{ fontSize:10.5, padding:'1px 7px', borderRadius:radius.lg, background:esAuxiliar?'rgba(91,33,182,.1)':C.n200,
                  color:esAuxiliar?'#5B21B6':C.n700, fontFamily:F, fontWeight:500 }}>
                  {esAuxiliar ? 'Auxiliar' : 'Detalle'}
                </span>
              </div>
            </div>
            <div>
              <p style={{ fontSize:10.5, color:C.n700, textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 2px', fontFamily:F }}>Período</p>
              <p style={{ fontSize:12, color:'#0F0F0F', margin:0, fontFamily:F }}>00/00/000 - 00/00/000</p>
            </div>
            <div>
              <p style={{ fontSize:10.5, color:C.n700, textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 2px', fontFamily:F }}>Moneda</p>
              <p style={{ fontSize:12, color:'#0F0F0F', margin:0, fontFamily:F }}>{cuentaSel.moneda} {sym}</p>
            </div>
            {/* Saldo inicial junto al encabezado de la cuenta, visible sin hacer scroll. */}
            <div>
              <p style={{ fontSize:10.5, color:C.n700, textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 2px', fontFamily:F }}>Saldo inicial</p>
              <p style={{ fontSize:12, color:'#0F0F0F', margin:0, fontFamily:F, fontWeight:600 }}>{sym} {fmt2(saldoInicial)}</p>
            </div>
            <button onClick={()=>setCuentaSel(null)}
              style={{ marginLeft:'auto', height:30, padding:'0 12px', border:`1px solid ${C.brandBd}`, borderRadius:7,
                background:'#FFFFFF', cursor:'pointer', fontSize:11, color:BRAND, fontFamily:F }}>
              × Todas las cuentas
            </button>
          </div>
  );
}
