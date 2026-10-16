'use client';
import { useEffect, useState } from 'react';
import { PageHeader } from '../ui/primitives';
import { fmtNum } from '../ui/formato';
import { radius } from '../ui/tokens';
import { Chart, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, DoughnutController, BarController } from 'chart.js';
import { C2, C3, C4, C5 } from './dashboard/C2';
import { BotonExportarPDF, C6 } from './dashboard/C6';
import { DateFilterModal } from './dashboard/DateFilterModal';
import { F } from './dashboard/datos';
import { C1, CardUsuariosActivos, DesgloseOperacionesPendientes } from './dashboard/piezas';

Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, DoughnutController, BarController);
// Montserrat global para todos los charts
Chart.defaults.font.family = "'Montserrat', sans-serif";
Chart.defaults.font.size = 11;

export default function DashboardPage() {
  const [ready, setReady]     = useState(false);
  const [showFilter, setFilt] = useState(false);
  const [periodo, setPeriodo] = useState('Hoy');

  useEffect(() => { setReady(true); }, []);

  const fechaHoy = new Date().toLocaleDateString('es-CR');

  return (
    <div style={{ height:'100%',display:'flex',flexDirection:'column',overflow:'hidden' }}>
      {/* Exportar = PDF directo (sin selector de formato), imprimiendo solo el
          contenido de #dashboard-print-area - mismo patrón que Analítico e
          Histórico de clientes/proveedores. */}
      <style>{`@media print {
        body * { visibility:hidden; }
        #dashboard-print-area, #dashboard-print-area * { visibility:visible; }
        #dashboard-print-area { position:absolute; left:0; top:0; width:100%; padding:24px; background:#fff !important; }
        #dashboard-print-header { display:block !important; }
        /* Issue: los gráficos (canvas) quedaban cortados a la mitad entre una
           página y la siguiente. Cada tarjeta no se debe partir entre páginas,
           y las filas de 2 columnas pasan a una sola columna para que cada
           tarjeta tenga el ancho completo y quepa entera en su página. */
        .dash-card { break-inside: avoid; page-break-inside: avoid; }
        .dash-row-grid { display: block !important; }
        .dash-row-grid > * { margin-bottom: 12px; }
      }`}</style>

      {/* Header */}
      <PageHeader title="Dashboard" left={
        <button onClick={()=>setFilt(true)}
          style={{ height:30, padding:'0 10px', border:'1px solid #ECECEC', borderRadius:radius.sm, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F, display:'flex', alignItems:'center', gap:6, color:'#475569' }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#475569" strokeWidth="1.3" strokeLinecap="round">
            <rect x="1.5" y="2" width="11" height="11" rx="2"/><path d="M5 1v2M9 1v2M1.5 5.5h11"/>
          </svg>
          <span style={{ fontWeight:400 }}>{periodo}</span>
          <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="#475569"><path d="M11.62 5.22L7.82 9.02C7.37 9.47 6.63 9.47 6.18 9.02L2.38 5.22" strokeLinecap="round"/></svg>
        </button>
      }>
        <BotonExportarPDF onClick={()=>window.print()}/>
      </PageHeader>

      <div id="dashboard-print-area" style={{ flex:1, overflowY:'auto', padding:16, background:'#F9F9F9', display:'flex', flexDirection:'column', gap:12 }}>

        {/* Encabezado solo visible al imprimir/exportar a PDF. */}
        <div id="dashboard-print-header" style={{ display:'none', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
          <div>
            <p style={{ fontSize:16, fontWeight:700, margin:0, fontFamily:F }}>Hotel Fortuna S.A.</p>
            <p style={{ fontSize:12, color:'#757575', margin:'2px 0 0', fontFamily:F }}>Dashboard · {periodo}</p>
          </div>
          <p style={{ fontSize:11, color:'#757575', margin:0, fontFamily:F }}>Generado: {fechaHoy}</p>
        </div>

        {/* Fila 1: Asientos pendientes + Situación actual + desglose de
            operaciones bancarias pendientes (solo lista, sin donut ni número
            grande - esa tarjeta ya tiene su propio número), todo en una sola
            tarjeta. A la par, Usuarios activos igual que antes. */}
        <div className="dash-row-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div className="dash-card" style={{ background:'#fff', border:'1px solid #ECECEC', borderRadius:10, padding:'20px 24px', display:'flex', alignItems:'flex-start', gap:24 }}>
            <div style={{ flexShrink:0 }}>
              <div style={{ fontSize:12, color:'#757575', fontFamily:F, marginBottom:8 }}>Asientos pendientes</div>
              <div style={{ fontSize:44, fontWeight:600, color:'#0F0F0F', fontFamily:F, lineHeight:1, fontVariantNumeric:'tabular-nums', letterSpacing:'-0.5px' }}>{fmtNum(248,2)}</div>
              <div style={{ fontSize:12, color:'#0F0F0F', fontFamily:F, marginTop:6, fontWeight:400 }}>Por contabilizar</div>
            </div>
            <div style={{ width:1, alignSelf:'stretch', background:'#ECECEC', flexShrink:0 }}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, color:'#757575', fontFamily:F, marginBottom:12 }}>Situación actual</div>
              {ready ? <C1/> : <div style={{ height:90, background:'#F9F9F9', borderRadius:radius.md }}/>}
            </div>
            <div style={{ width:1, alignSelf:'stretch', background:'#ECECEC', flexShrink:0 }}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, color:'#757575', fontFamily:F, marginBottom:12 }}>Operaciones bancarias pendientes</div>
              <DesgloseOperacionesPendientes/>
            </div>
          </div>
          <CardUsuariosActivos/>
        </div>

        {/* Fila 2: CXC + CXP */}
        {ready ? (
          <div className="dash-row-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <C2/><C3/>
          </div>
        ) : null}

        {/* Fila 3: Ingresos/Costos/Gastos */}
        {ready ? <C4/> : null}

        {/* Fila 4: Conciliaciones + IVA */}
        {ready ? (
          <div className="dash-row-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <C5/><C6/>
          </div>
        ) : null}

        {!ready && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[1,2,3,4].map(i=>(
              <div key={i} style={{ background:'#fff', border:'1px solid #ECECEC', borderRadius:10, padding:24, height:160, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontSize:12, color:'#ECECEC', fontFamily:F }}>Cargando…</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showFilter && <DateFilterModal onClose={()=>setFilt(false)} onApply={p=>{ setPeriodo(p); }} />}
    </div>
  );
}
