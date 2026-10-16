'use client';
import { useRef } from 'react';
import { fmtNum } from '../../ui/formato';
import { MoneyCell } from '../../ui/montos';
import { C, radius } from '../../ui/tokens';
import { Chart } from 'chart.js';
import { F, agingBg, agingColor, agingLabel, useChartJS } from './datos';
import { Card, MoneyAmt } from './piezas';

// ── C2: Cartera clientes vencida ─────────────────────────────────────────────
export function C2() {
  const vencidas: [string,number,number][] = [
    ['Distribuidora La Florida S.A.',  980000, 148],
    ['Hotel Las Palmas S.A.',          750000, 120],
    ['AuraTours S.A.',                 620000,  95],
    ['Grupo Hotelero Central S.A.',    340000,  62],
  ];
  const totalVig = 1440000;
  const totalVen = vencidas.reduce((s,i)=>s+i[1],0);
  const total    = 5490000;
  const GREEN = '#4CAF50', RED = '#F44336';
  return (
    <Card title="Cuentas por cobrar">
      <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:10 }}>
        <span style={{ fontSize:13, color:'#555', fontFamily:F }}>₡</span>
        <span style={{ fontSize:28, fontWeight:600, color:'#0F0F0F', fontFamily:F, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{fmtNum(total,2)}</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <div style={{ width:3, height:16, background:GREEN, borderRadius:2, flexShrink:0 }}/>
            <span style={{ fontSize:10, color:'#555', fontFamily:F }}>Vigentes</span>
          </div>
          <MoneyAmt sym="₡" amount={totalVig} color={GREEN} />
          <div style={{ fontSize:10, color:'#9E9E9E', fontFamily:F, marginTop:1 }}>3 documentos</div>
        </div>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <div style={{ width:3, height:16, background:RED, borderRadius:2, flexShrink:0 }}/>
            <span style={{ fontSize:10, color:'#555', fontFamily:F }}>Vencidas</span>
          </div>
          <MoneyAmt sym="₡" amount={totalVen} color={RED} />
          <div style={{ fontSize:10, color:'#9E9E9E', fontFamily:F, marginTop:1 }}>4 documentos</div>
        </div>
      </div>
      <div style={{ display:'flex', height:5, borderRadius:4, overflow:'hidden', marginBottom:12, background:'#F0F0F0' }}>
        <div style={{ width:`${(totalVig/total*100).toFixed(1)}%`, background:GREEN }}/>
        <div style={{ width:`${(totalVen/total*100).toFixed(1)}%`, background:RED }}/>
      </div>
      {/* Subtítulo con línea */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <span style={{ fontSize:11, fontWeight:600, color:'#0F0F0F', fontFamily:F, whiteSpace:'nowrap' }}>Saldo vencido por cliente</span>
        <div style={{ flex:1, height:1, background:'#ECECEC' }}/>
      </div>
      {/* Tabla: columnas fijas - nombre | ₡ | cifra | período */}
      <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:F }}>
        <thead>
          <tr>
            <th style={{ fontSize:10, color:'#9E9E9E', fontWeight:400, textAlign:'left', paddingBottom:5, fontFamily:F }}>Cliente</th>
            <th style={{ fontSize:10, color:'#9E9E9E', fontWeight:400, textAlign:'right', paddingBottom:5, width:106, fontFamily:F }}>Saldo</th>
            <th style={{ fontSize:10, color:'#9E9E9E', fontWeight:400, textAlign:'left', paddingBottom:5, paddingLeft:10, width:90, fontFamily:F }}>Período</th>
          </tr>
        </thead>
        <tbody>
          {vencidas.map(([n,m,d],i)=>(
            <tr key={i}>
              <td style={{ fontSize:11, color:'#0F0F0F', padding:'3px 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:0 }}>{n}</td>
              <td style={{ fontSize:11, fontWeight:500, color:'#0F0F0F', padding:'3px 0', width:106, whiteSpace:'nowrap' }}><MoneyCell n={m} decimals={2} /></td>
              <td style={{ fontSize:9, paddingLeft:10, verticalAlign:'middle', width:90, whiteSpace:'nowrap' }}>
                <span style={{ padding:'2px 6px', borderRadius:4, background:agingBg(d), color:agingColor(d), fontWeight:600 }}>{agingLabel(d)}</span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop:'1px solid #ECECEC' }}>
            <td style={{ fontSize:11, fontWeight:600, color:'#0F0F0F', paddingTop:6, fontFamily:F }}>Total vencido</td>
            <td style={{ fontSize:12, fontWeight:600, color:'#0F0F0F', paddingTop:6, whiteSpace:'nowrap' }}><MoneyCell n={totalVen} decimals={2} style={{ fontWeight:600 }} /></td>
            <td/>
          </tr>
        </tfoot>
      </table>
    </Card>
  );
}
// ── C3: Cartera proveedores vencida ──────────────────────────────────────────
export function C3() {
  const vencidas: [string,number,number][] = [
    ['Materiales Occidente S.A.',   2000000, 135],
    ['Ferretero Monteverde S.A.',   1800000, 110],
    ['Insumos del Norte Ltda.',      820000,  78],
    ['Proveedor General CR S.A.',    280000,  42],
  ];
  const totalVig = 500000;
  const totalVen = vencidas.reduce((s,i)=>s+i[1],0);
  const total    = 5400000;
  const GREEN = '#4CAF50', RED = '#F44336';
  return (
    <Card title="Cuentas por pagar">
      <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:10 }}>
        <span style={{ fontSize:13, color:'#555', fontFamily:F }}>₡</span>
        <span style={{ fontSize:28, fontWeight:600, color:'#0F0F0F', fontFamily:F, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{fmtNum(total,2)}</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <div style={{ width:3, height:16, background:GREEN, borderRadius:2, flexShrink:0 }}/>
            <span style={{ fontSize:10, color:'#555', fontFamily:F }}>Vigentes</span>
          </div>
          <MoneyAmt sym="₡" amount={totalVig} color={GREEN} />
          <div style={{ fontSize:10, color:'#9E9E9E', fontFamily:F, marginTop:1 }}>2 documentos</div>
        </div>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <div style={{ width:3, height:16, background:RED, borderRadius:2, flexShrink:0 }}/>
            <span style={{ fontSize:10, color:'#555', fontFamily:F }}>Vencidas</span>
          </div>
          <MoneyAmt sym="₡" amount={totalVen} color={RED} />
          <div style={{ fontSize:10, color:'#9E9E9E', fontFamily:F, marginTop:1 }}>4 documentos</div>
        </div>
      </div>
      <div style={{ display:'flex', height:5, borderRadius:4, overflow:'hidden', marginBottom:12, background:'#F0F0F0' }}>
        <div style={{ width:`${(totalVig/total*100).toFixed(1)}%`, background:GREEN }}/>
        <div style={{ width:`${(totalVen/total*100).toFixed(1)}%`, background:RED }}/>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <span style={{ fontSize:11, fontWeight:600, color:'#0F0F0F', fontFamily:F, whiteSpace:'nowrap' }}>Saldo vencido por proveedor</span>
        <div style={{ flex:1, height:1, background:'#ECECEC' }}/>
      </div>
      <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:F }}>
        <thead>
          <tr>
            <th style={{ fontSize:10, color:'#9E9E9E', fontWeight:400, textAlign:'left', paddingBottom:5, fontFamily:F }}>Proveedor</th>
            <th style={{ fontSize:10, color:'#9E9E9E', fontWeight:400, textAlign:'right', paddingBottom:5, width:106, fontFamily:F }}>Saldo</th>
            <th style={{ fontSize:10, color:'#9E9E9E', fontWeight:400, textAlign:'left', paddingBottom:5, paddingLeft:10, width:90, fontFamily:F }}>Período</th>
          </tr>
        </thead>
        <tbody>
          {vencidas.map(([n,m,d],i)=>(
            <tr key={i}>
              <td style={{ fontSize:11, color:'#0F0F0F', padding:'3px 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:0 }}>{n}</td>
              <td style={{ fontSize:11, fontWeight:500, color:'#0F0F0F', padding:'3px 0', width:106, whiteSpace:'nowrap' }}><MoneyCell n={m} decimals={2} /></td>
              <td style={{ fontSize:9, paddingLeft:10, verticalAlign:'middle', width:90, whiteSpace:'nowrap' }}>
                <span style={{ padding:'2px 6px', borderRadius:4, background:agingBg(d), color:agingColor(d), fontWeight:600 }}>{agingLabel(d)}</span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop:'1px solid #ECECEC' }}>
            <td style={{ fontSize:11, fontWeight:600, color:'#0F0F0F', paddingTop:6, fontFamily:F }}>Total vencido</td>
            <td style={{ fontSize:12, fontWeight:600, color:'#0F0F0F', paddingTop:6, whiteSpace:'nowrap' }}><MoneyCell n={totalVen} decimals={2} style={{ fontWeight:600 }} /></td>
            <td/>
          </tr>
        </tfoot>
      </table>
    </Card>
  );
}
// ── C4: Ingresos / costos / gastos ────────────────────────────────────────────
export function C4() {
  const ref = useRef<any>(null);
  const days = ['26/5','27/5','28/5','29/5','30/5','31/5','1/6','2/6'];
  useChartJS(() => {
    const el = document.getElementById('c4') as HTMLCanvasElement; if(!el) return;
    ref.current?.destroy();
    ref.current = new Chart(el, { type:'bar', data:{ labels:days, datasets:[
      { label:'Ingresos', data:[4200000,3800000,5100000,4600000,3900000,5800000,4100000,4900000], backgroundColor:'#6B4C00', borderRadius:3 },
      { label:'Costos',   data:[1200000,1000000,1500000,1300000,1100000,1700000,1200000,1400000], backgroundColor:'#D9B54A', borderRadius:3 },
      { label:'Gastos',   data:[2100000,1900000,2300000,2000000,1800000,2500000,2000000,2200000], backgroundColor:'#EDD47E', borderRadius:3 },
    ]}, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } },
      scales:{ x:{ grid:{ display:false }, ticks:{ font:{ family:"'Montserrat', sans-serif",size:10 }, color:'#757575' } },
               y:{ grid:{ color:'#F5F5F5' }, ticks:{ font:{ family:"'Montserrat', sans-serif",size:10 }, color:'#757575',
                 callback:(v:any)=>fmtNum(Number(v), 0) } } } } });
  });
  return (
    <Card title="Ingresos, costos y gastos" sub="Últimos 8 días al día de operación">
      <div style={{ height:130 }}><canvas id="c4" /></div>
      {/* Leyenda interactiva */}
      {(() => {
        const series = [['#6B4C00','Ingresos'],['#D9B54A','Costos'],['#EDD47E','Gastos']];
        return (
          <div style={{ display:'flex',gap:8 }}>
            {series.map(([bg,l])=>(
              <span key={l} style={{ display:'flex',alignItems:'center',gap:5,fontSize:10,fontFamily:F,cursor:'pointer',padding:'3px 8px',borderRadius:5,border:'none',background:'transparent' }}>
                <span style={{ width:8,height:8,borderRadius:2,background:bg,flexShrink:0 }}/>
                <span style={{ color:'#1A1A1A',fontWeight:500 }}>{l}</span>
              </span>
            ))}
          </div>
        );
      })()}
    </Card>
  );
}
// ── C5: Estado conciliaciones ────────────────────────────────────────────────
export function C5() {
  const legend = (
    <div style={{ display:'flex',gap:10,fontSize:10,color:'#757575',fontFamily:F }}>
      {[['#4CAF50','Cerrada'],['#A77600','En proceso'],['#F44336','Pendiente']].map(([bg,l])=>(
        <span key={l} style={{ display:'flex',alignItems:'center',gap:4 }}>
          <span style={{ width:8,height:8,borderRadius:'50%',background:bg }}/>{l}
        </span>
      ))}
    </div>
  );
  // movsPend: cantidad de movimientos de ese banco/período aún sin conciliar
  // (no el estado de la conciliación en sí, sino cuántas líneas le faltan).
  const items = [
    { bg:'#4CAF50', bank:'Banco Nacional - cta. 001', month:'May 2026', st:'Cerrada',    sBg:'#F0FAF5', sC:C.successDk, movsPend:0 },
    { bg:'#A77600', bank:'BAC Credomatic - cta. 002', month:'May 2026', st:'En proceso', sBg:'#FFF8EC', sC:'#7A5800',   movsPend:1 },
    { bg:'#E07B00', bank:'Banco de Costa Rica',        month:'May 2026', st:'Pendiente', sBg:'#FFF7ED', sC:'#9E4E00',  movsPend:6 },
    { bg:'#F44336', bank:'Scotiabank - cta. 004',      month:'Abr 2026', st:'Pendiente', sBg:C.errorBg, sC:'#9E1A1A',  movsPend:9 },
  ];
  const totalMovsPend = items.reduce((s,it)=>s+it.movsPend,0);
  // Tendencia de movimientos pendientes de conciliar por mes (últimos 6 meses).
  const tendencia = [6,9,4,11,7,16];
  const mesesTendencia = ['Ene','Feb','Mar','Abr','May','Jun'];
  const maxTend = Math.max(...tendencia, 1);
  return (
    <Card title="Estado de conciliaciones bancarias" titleExtra={legend}>
      {totalMovsPend > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#F44336', flexShrink:0 }}/>
          <span style={{ fontSize:11, fontWeight:600, color:'#9E1A1A', fontFamily:F }}>{totalMovsPend} movimientos sin conciliar en total</span>
        </div>
      )}
      {items.map(it=>(
        <div key={it.bank} style={{ display:'flex',alignItems:'center',gap:8,padding:'5px 0',borderBottom:'1px solid #F5F5F5',fontSize:11,fontFamily:F }}>
          <span style={{ width:8,height:8,borderRadius:'50%',background:it.bg,flexShrink:0 }}/>
          <span style={{ flex:1,color:'#0F0F0F',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{it.bank}</span>
          {it.movsPend > 0 && (
            <span style={{ fontSize:10, color:'#9E1A1A', flexShrink:0, whiteSpace:'nowrap' }}>{it.movsPend} sin conciliar</span>
          )}
          <span style={{ fontSize:10,color:'#757575',flexShrink:0 }}>{it.month}</span>
          <span style={{ fontSize:10,padding:'2px 8px',borderRadius:radius.pill,background:it.sBg,color:it.sC,flexShrink:0,whiteSpace:'nowrap' }}>{it.st}</span>
        </div>
      ))}
      {/* Comportamiento de pendientes por mes - mini barras, sin librería de charts */}
      <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid #F5F5F5' }}>
        <p style={{ fontSize:10, color:'#9E9E9E', margin:'0 0 6px', fontFamily:F }}>Pendientes por mes</p>
        <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:40 }}>
          {tendencia.map((v,i)=>(
            <div key={i} title={`${mesesTendencia[i]}: ${v} pendientes`} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
              <div style={{ width:'100%', height:Math.max(3,(v/maxTend)*30), background: i===tendencia.length-1?'#A77600':'#EDD47E', borderRadius:2 }}/>
              <span style={{ fontSize:9, color:'#9E9E9E', fontFamily:F }}>{mesesTendencia[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
