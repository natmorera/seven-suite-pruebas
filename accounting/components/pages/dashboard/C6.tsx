'use client';
import { useRef } from 'react';
import { fmtNum } from '../../ui/formato';
import { CUENTAS_INIT } from '../catalogo/datos/cuentasIniciales';
import { flattenAll } from '../catalogo/datos/arbol';
import { Chart } from 'chart.js';
import { F, useChartJS } from './datos';
import { Card } from './piezas';

// ── C6: IVA ───────────────────────────────────────────────────────────────────
// Antes usaba una cuenta fija de IVA hardcodeada. Ahora toma las cuentas que se
// configuraron en el Catálogo de cuentas como "cuenta de impuestos" (rol
// acreditable / débito fiscal) y suma su saldo actual - si el cliente usa más
// de una cuenta para captar el impuesto, todas se contemplan.
export function C6() {
  const ref = useRef<any>(null);
  const cuentasImpuesto = flattenAll(CUENTAS_INIT).filter(c => c.configImpuesto);
  const totalAcreditable = cuentasImpuesto.filter(c => c.configImpuesto?.rol==='acreditable').reduce((s,c)=>s+(c.saldo||0),0);
  const totalDebito      = cuentasImpuesto.filter(c => c.configImpuesto?.rol==='debito').reduce((s,c)=>s+(c.saldo||0),0);
  const sinConfigurar = cuentasImpuesto.length === 0;
  // Serie histórica ilustrativa que termina en el saldo real de hoy (no hay
  // ledger mensual de impuestos todavía para calcular los 6 meses reales).
  const serieAcreditable = [0.76,0.67,0.98,0.86,0.93,1].map(f=>Math.round(totalAcreditable*f));
  const serieDebito      = [0.80,0.71,0.93,0.86,0.91,1].map(f=>Math.round(totalDebito*f));
  useChartJS(() => {
    const el = document.getElementById('c6') as HTMLCanvasElement; if(!el || sinConfigurar) return;
    ref.current?.destroy();
    ref.current = new Chart(el, { type:'bar', data:{ labels:['Ene','Feb','Mar','Abr','May','Jun'], datasets:[
      { label:'Crédito fiscal', data:serieAcreditable, backgroundColor:'#6B4C00', borderRadius:3 },
      { label:'Débito fiscal',  data:serieDebito,      backgroundColor:'#D9B54A', borderRadius:3 },
    ]}, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } },
      scales:{ x:{ grid:{ display:false }, ticks:{ font:{ family:"'Montserrat', sans-serif",size:10 }, color:'#757575' } },
               y:{ grid:{ color:'#F5F5F5' }, ticks:{ font:{ family:"'Montserrat', sans-serif",size:10 }, color:'#757575',
                 callback:(v:any)=>fmtNum(Number(v), 0) } } } } });
  }, [totalAcreditable, totalDebito, sinConfigurar]);
  if (sinConfigurar) {
    return (
      <Card title="Impuestos de ventas (IVA)">
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, padding:'20px 8px', textAlign:'center' }}>
          <span style={{ fontSize:12, color:'#757575', fontFamily:F }}>Todavía no hay cuentas configuradas como cuenta de impuestos.</span>
          <span style={{ fontSize:11, color:'#9E9E9E', fontFamily:F }}>Configuralas desde el Catálogo de cuentas (Rol especial → Es cuenta de impuestos).</span>
        </div>
      </Card>
    );
  }
  return (
    <Card title="Impuestos de ventas (IVA)">
      <div style={{ height:130 }}><canvas id="c6" /></div>
      <div style={{ display:'flex',gap:8 }}>
        {[['#6B4C00','Crédito fiscal'],['#D9B54A','Débito fiscal']].map(([bg,l])=>(
          <span key={l} style={{ display:'flex',alignItems:'center',gap:5,fontSize:10,fontFamily:F,cursor:'pointer',padding:'3px 8px',borderRadius:5,border:'none',background:'transparent' }}>
            <span style={{ width:8,height:8,borderRadius:2,background:bg,flexShrink:0 }}/>
            <span style={{ color:'#1A1A1A',fontWeight:500 }}>{l}</span>
          </span>
        ))}
      </div>
      {/* Cuentas que alimentan el indicador - antes iba todo en una sola línea
          (código + nombre + rol + monto) y en una tarjeta angosta se
          amontonaba todo junto, sin espacio para leerlo. Ahora cada cuenta
          es un bloque de 2 líneas: código + rol arriba, nombre + monto abajo. */}
      <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid #F5F5F5', display:'flex', flexDirection:'column', gap:6 }}>
        {cuentasImpuesto.map(c=>(
          <div key={c.id} style={{ padding:'6px 8px', background:'#FAFAFA', borderRadius:6, fontFamily:F }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:2 }}>
              <span style={{ color:'#9E9E9E', fontFamily:'monospace', fontSize:10 }}>{c.code}</span>
              <span style={{ fontSize:9.5, fontWeight:600, padding:'1px 7px', borderRadius:999,
                color: c.configImpuesto?.rol==='acreditable'?'#6B4C00':'#A77600',
                background: c.configImpuesto?.rol==='acreditable'?'#F3ECDD':'#FFF3DC' }}>
                {c.configImpuesto?.rol==='acreditable'?'Acreditable':'Débito fiscal'}
              </span>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:8 }}>
              <span style={{ fontSize:11, color:'#333', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nombre}</span>
              <span style={{ fontSize:12, fontWeight:600, color:'#0F0F0F', flexShrink:0, fontVariantNumeric:'tabular-nums' }}>₡ {fmtNum(c.saldo||0,2)}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
// ── Exportar (PDF único - sin selector de formato) ─────────────────────────
export function BotonExportarPDF({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ height:32, padding:'0 12px', border:'1px solid #ECECEC', borderRadius:4, background:'#fff', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F, display:'flex', alignItems:'center', gap:10, color:'#475569' }}>
      <svg className="w-4 h-4" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <path d="M7 1v8M4 6l3 3 3-3M2 10v1.5A1.5 1.5 0 003.5 13h7A1.5 1.5 0 0012 11.5V10"/>
      </svg>
      Exportar
    </button>
  );
}
