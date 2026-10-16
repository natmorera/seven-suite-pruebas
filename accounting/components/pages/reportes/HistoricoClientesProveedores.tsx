'use client';
import { useState } from 'react';
import { Toast, PageHeader } from '../../ui/primitives';
import { C, radius } from '../../ui/tokens';
import { Pagination } from '../../ui/tabla';
import { Button } from '../../ui/formulario';
import { ModalSeleccionarCuenta } from './historicoClientesProveedores/ModalSeleccionarCuenta';
import { VistaPreviaModal } from './historicoClientesProveedores/VistaPreviaModal';
import { BRAND, CLIENTES_EC, type CuentaCP, F, PROVEEDORES_EC, type RangoCP } from './historicoClientesProveedores/datos';
import { EnviarCorreoModal } from './historicoClientesProveedores/modales';
import { AntiguedadSaldos, EstadoCuenta, FilterBtn, RadioGroup } from './historicoClientesProveedores/piezas';

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HistoricoClientesProveedores() {
  const [tipo,   setTipo]   = useState<'clientes'|'proveedores'>('clientes');
  const [cuentaId, setCuentaId] = useState('');
  const [rangoCP, setRangoCP] = useState<RangoCP|null>(null);
  const [vista,  setVista]  = useState<'estado'|'antiguedad'>('estado');
  // Issue 4.4: por defecto la Antigüedad de saldos consolida cada cliente/proveedor
  // en un solo subtotal - útil cuando se consulta un rango grande. Esta opción
  // permite mantener el detalle de cada documento en vez de que todo quede
  // consolidado, tanto en pantalla como en el PDF/Excel exportado.
  const [detallePorDocumento, setDetallePorDocumento] = useState(true);
  const [ordenar,setOrdenar]= useState('Nombre');
  const [moneda, setMoneda] = useState('COL');
  const [showVista, setShowVista] = useState(false);
  const [showCorreo, setShowCorreo] = useState(false);
  const [toast, setToast] = useState<string|null>(null);
  const [modalCuentaOpen, setModalCuentaOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // Sin período aplicado por defecto: los movimientos de ejemplo abarcan de 2022
  // a 2026, así que forzar un rango por defecto (p. ej. "este mes") los ocultaba
  // todos y solo dejaba ver el Total, sin ninguna fila. Se activa un rango cuando
  // el usuario elige uno explícitamente.
  const [periodoDesde, setPeriodoDesde] = useState('');
  const [periodoHasta, setPeriodoHasta] = useState('');
  const [periodoQuick, setPeriodoQuick] = useState('');

  function aplicarPeriodoRapido(label: string) {
    const hoy = new Date(2026, 5, 2); // "hoy" de referencia del mock de datos (2 jun 2026)
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    let desde: Date, hasta: Date;
    switch (label) {
      case 'Hoy': desde = hasta = hoy; break;
      case 'Esta semana': { const s = new Date(hoy); s.setDate(hoy.getDate()-hoy.getDay()); const e = new Date(s); e.setDate(s.getDate()+6); desde=s; hasta=e; break; }
      case 'Este mes': desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1); hasta = new Date(hoy.getFullYear(), hoy.getMonth()+1, 0); break;
      case 'Mes anterior': desde = new Date(hoy.getFullYear(), hoy.getMonth()-1, 1); hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0); break;
      case 'Este trimestre': { const q = Math.floor(hoy.getMonth()/3); desde = new Date(hoy.getFullYear(), q*3, 1); hasta = new Date(hoy.getFullYear(), q*3+3, 0); break; }
      case 'Este año': desde = new Date(hoy.getFullYear(), 0, 1); hasta = new Date(hoy.getFullYear(), 11, 31); break;
      default: return;
    }
    setPeriodoDesde(iso(desde)); setPeriodoHasta(iso(hasta)); setPeriodoQuick(label);
  }

  // 'DD/MM/YYYY' -> comparable timestamp
  function parseFechaDDMMYYYY(s: string): number {
    const [d, m, y] = s.split('/').map(Number);
    return new Date(y, (m||1)-1, d||1).getTime();
  }
  function dentroDePeriodo(fecha: string): boolean {
    const t = parseFechaDDMMYYYY(fecha);
    const desdeT = periodoDesde ? new Date(periodoDesde+'T00:00:00').getTime() : -Infinity;
    const hastaT = periodoHasta ? new Date(periodoHasta+'T23:59:59').getTime() : Infinity;
    return t >= desdeT && t <= hastaT;
  }

  const dataEC = tipo==='clientes' ? CLIENTES_EC : PROVEEDORES_EC;
  const ordenadoAlpha = [...dataEC].sort((a,b)=>a.nombre.localeCompare(b.nombre));

  // Issue #1: la cuenta filtra por una sola o por rango (alfabético por nombre)
  let cuentasBase: CuentaCP[];
  if (cuentaId) {
    cuentasBase = dataEC.filter(d=>d.id===cuentaId);
  } else if (rangoCP) {
    const iDesde = ordenadoAlpha.findIndex(d=>d.id===rangoCP.desde);
    const iHasta = ordenadoAlpha.findIndex(d=>d.id===rangoCP.hasta);
    const lo = Math.min(iDesde,iHasta), hi = Math.max(iDesde,iHasta);
    cuentasBase = (lo>=0 && hi>=0) ? ordenadoAlpha.slice(lo, hi+1) : dataEC;
  } else {
    cuentasBase = dataEC;
  }
  const cuentasFiltradas = cuentasBase.filter(d =>
    !searchQ || d.nombre.toLowerCase().includes(searchQ.toLowerCase()) || d.id.includes(searchQ));

  const idsAntiguedad = cuentasFiltradas.map(d=>d.id);
  const totalPaginas = Math.max(1, Math.ceil(cuentasFiltradas.length / pageSize));
  const paginaActual = Math.min(page, totalPaginas);
  const cuentasPagina = cuentasFiltradas.slice((paginaActual-1)*pageSize, paginaActual*pageSize);
  const idsAntiguedadPagina = cuentasPagina.map(d=>d.id);

  // Issue #29: aplicar el período a los movimientos de cada cuenta (solo afecta
  // la vista "Estado de cuenta"; Antigüedad de saldos se calcula sobre saldos totales)
  const conPeriodoAplicado = (lista: CuentaCP[]) =>
    vista === 'estado'
      ? lista.map(c => ({ ...c, movimientos: c.movimientos.filter(m => dentroDePeriodo(m.fecha)) }))
      : lista;
  const cuentasPaginaVista = conPeriodoAplicado(cuentasPagina);
  const cuentasFiltradasVista = conPeriodoAplicado(cuentasFiltradas);

  const cuentaLabel = cuentaId
    ? (dataEC.find(d=>d.id===cuentaId)?.nombre.slice(0,20) + '…')
    : rangoCP
      ? `${ordenadoAlpha.find(d=>d.id===rangoCP.desde)?.nombre.slice(0,10)}… – ${ordenadoAlpha.find(d=>d.id===rangoCP.hasta)?.nombre.slice(0,10)}…`
      : 'Cuenta';

  // El período solo afecta a "Estado de cuenta"; en "Antigüedad de saldos" se
  // calcula sobre saldos totales, así que mostrarlo ahí sería engañoso.
  const periodoLabel = vista === 'estado'
    ? (periodoDesde || periodoHasta
        ? `${periodoDesde?periodoDesde.split('-').reverse().join('/'):'…'} – ${periodoHasta?periodoHasta.split('-').reverse().join('/'):'…'}${periodoQuick?` (${periodoQuick})`:''}`
        : 'Todo el historial')
    : 'No aplica (saldos totales a la fecha)';

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', fontFamily:F, background:'#FFFFFF', overflow:'hidden' }}>

      {/* ── Header ── */}
      <PageHeader title="Históricos Clientes / Proveedores">
        {/* Issue #4: un solo botón Exportar, con vista previa antes de imprimir/descargar */}
        {/* Issue: esta pantalla no tenía ningún botón en color principal - las
            dos acciones eran neutras. "Exportar" es la acción central acá (no
            hay "crear" en un reporte de solo lectura), así que pasa a ser el
            botón principal y queda al extremo derecho. */}
        <Button variant="secondary" onClick={()=>setShowCorreo(true)} icon={
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1.5 3.5h11a1 1 0 011 1v6a1 1 0 01-1 1h-11a1 1 0 01-1-1v-6a1 1 0 011-1z"/><path d="M1 4l6 4.5L13 4"/>
          </svg>
        }>Enviar por correo</Button>
        <Button onClick={()=>setShowVista(true)} icon={
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 1v8M4 6l3 3 3-3M2 10v1.5A1.5 1.5 0 003.5 13h7A1.5 1.5 0 0012 11.5V10"/>
          </svg>
        }>Exportar</Button>
      </PageHeader>

      {showCorreo && (
        <EnviarCorreoModal
          tipo={tipo}
          vista={vista}
          cuentaLabel={cuentaLabel}
          periodoLabel={periodoLabel}
          onClose={()=>setShowCorreo(false)}
          onEnviar={(correo)=>{ setShowCorreo(false); setToast(`${vista==='estado'?'Estado de cuenta':'Antigüedad de saldos'} enviado a ${correo}`); }}
        />
      )}
      {toast && <Toast message={toast} type="success" onClose={()=>setToast(null)}/>}

      {/* ── Tabs bajo el header ── */}
      <div style={{ background:'#FFFFFF', borderBottom:`1px solid ${C.n500}`, padding:'0 24px',
        display:'flex', alignItems:'center', gap:0, flexShrink:0, height:42 }}>
        {(['estado','antiguedad'] as const).map(v=>{
          const label = v==='estado' ? 'Estado de cuenta' : 'Antigüedad de saldos';
          const active = vista===v;
          return (
            <button key={v} onClick={()=>setVista(v)}
              style={{ height:42, padding:'0 16px', border:'none', borderBottom:`2px solid ${active?BRAND:'transparent'}`,
                background:'transparent', cursor:'pointer', fontSize:13, fontFamily:F,
                fontWeight:active?500:400, color:active?BRAND:'#757575', whiteSpace:'nowrap' }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Barra de filtros ── */}
      {/* Issue #2 y #3: buscador primero, luego el resto de filtros reordenado
          (Clientes/Proveedores, Cuenta, Período, Moneda, Ordenar por) */}
      <div style={{ background:'#FFFFFF', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px',
        display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap' }}>

        {/* Buscador */}
        <div style={{ position:'relative' }}>
          <svg style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
            width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#757575" strokeWidth="1.4" strokeLinecap="round">
            <circle cx="6" cy="6" r="4"/><path d="M10.5 10.5L8.5 8.5"/>
          </svg>
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder={tipo==='clientes'?'Buscar cliente…':'Buscar proveedor…'}
            style={{ height:32, paddingLeft:28, paddingRight:10, width:200, border:`1px solid ${C.n500}`,
              borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none' }}/>
        </div>

        <div style={{ width:1, height:20, background:`${C.n500}`, flexShrink:0 }}/>

        {/* Clientes / Proveedores radios */}
        {(['clientes','proveedores'] as const).map(t=>(
          <label key={t} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12, fontFamily:F,
            color:tipo===t?BRAND:'#757575' }}>
            <span onClick={()=>{ setTipo(t); setCuentaId(''); setRangoCP(null); }} style={{ width:15,height:15,borderRadius:'50%',
              border:`2px solid ${tipo===t?BRAND:'#ECECEC'}`, background:tipo===t?BRAND:'#FFFFFF',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor:'pointer' }}>
              {tipo===t&&<span style={{ width:5,height:5,borderRadius:'50%',background:'#FFFFFF' }}/>}
            </span>
            {t==='clientes'?'Clientes':'Proveedores'}
          </label>
        ))}

        <div style={{ width:1, height:20, background:`${C.n500}`, flexShrink:0 }}/>

        {/* Cuenta - una o rango, sin selector de nivel (Issue #1) */}
        <button onClick={()=>setModalCuentaOpen(true)}
          style={{ height:32, padding:'0 12px', border:`1px solid ${(cuentaId||rangoCP)?BRAND:C.n500}`, borderRadius:4,
            background:(cuentaId||rangoCP)?'#FFF8EC':'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F,
            display:'flex', alignItems:'center', gap:5, color:(cuentaId||rangoCP)?BRAND:'#757575', whiteSpace:'nowrap' }}>
          {cuentaLabel}
          <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 5L7 9L11 5"/></svg>
        </button>

        {/* Período */}
        <FilterBtn label="Período" active={!!(periodoDesde || periodoHasta)}>
          <p style={{ fontSize:11, fontWeight:600, color:'#757575', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>Período de fecha</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
            {['Hoy','Esta semana','Este mes','Mes anterior','Este trimestre','Este año'].map(p=>(
              <button key={p} onClick={()=>aplicarPeriodoRapido(p)} style={{ height:28, border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:periodoQuick===p?BRAND:'#FFFFFF',
                color:periodoQuick===p?'#FFFFFF':'#757575', fontSize:12, fontFamily:F, cursor:'pointer' }}>{p}</button>
            ))}
          </div>
          <p style={{ fontSize:11, color:'#757575', margin:'0 0 6px', fontFamily:F }}>Rango personalizado</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div>
              <p style={{ fontSize:11, color:'#757575', margin:'0 0 3px' }}>Desde</p>
              <input type="date" value={periodoDesde} onChange={e=>{setPeriodoDesde(e.target.value); setPeriodoQuick('');}} style={{ width:'100%', height:30, padding:'0 8px', border:`1px solid ${BRAND}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none', color:BRAND }}/>
            </div>
            <div>
              <p style={{ fontSize:11, color:'#757575', margin:'0 0 3px' }}>Hasta</p>
              <input type="date" value={periodoHasta} onChange={e=>{setPeriodoHasta(e.target.value); setPeriodoQuick('');}} style={{ width:'100%', height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none' }}/>
            </div>
          </div>
        </FilterBtn>

        {/* Moneda */}
        <FilterBtn label="Moneda">
          <p style={{ fontSize:11, fontWeight:600, color:'#757575', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>Moneda</p>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ fontSize:12, fontFamily:F, color:'#757575' }}>Seleccionar todos</span>
            <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Seleccionar todos</button>
          </div>
          {[{v:'USD',l:'USD - Dólar americano',n:3},{v:'COL',l:'CRC - Colón costarricense',n:3}].map(m=>(
            <label key={m.v} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, padding:'6px 0',
              borderBottom:`1px solid #ECECEC`, cursor:'pointer', fontFamily:F }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:16, height:16,borderRadius:4,border:`1px solid ${moneda===m.v?BRAND:'#ECECEC'}`,
                  background:moneda===m.v?BRAND:'#FFFFFF', display:'flex', alignItems:'center', justifyContent:'center' }}
                  onClick={()=>setMoneda(m.v)}>
                  {moneda===m.v&&<svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                </div>
                <span style={{ fontSize:12, color:'#0F0F0F' }}>{m.l}</span>
              </div>
              <span style={{ fontSize:11, color:'#757575' }}>{m.n}</span>
            </label>
          ))}
        </FilterBtn>

        {/* Ordenar por */}
        <FilterBtn label="Ordenar por" align="right">
          <p style={{ fontSize:11, fontWeight:600, color:'#757575', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>Ordenar por</p>
          <RadioGroup name="ordenar" value={ordenar} onChange={setOrdenar}
            options={['Nombre','Código','Saldo','Días vencido'].map(v=>({label:v,value:v}))}/>
        </FilterBtn>

        {/* Mostrar detalle por documento - solo tiene sentido en Antigüedad de saldos;
            en Estado de cuenta el detalle cronológico siempre se muestra completo. */}
        {vista==='antiguedad' && (
          <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:12, color:'#0F0F0F', fontFamily:F }}>
            <div onClick={()=>setDetallePorDocumento(v=>!v)}
              style={{ width:16, height:16, borderRadius:4, border:`1px solid ${detallePorDocumento?BRAND:'#ECECEC'}`,
                background:detallePorDocumento?BRAND:'#FFFFFF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {detallePorDocumento && <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/></svg>}
            </div>
            <span onClick={()=>setDetallePorDocumento(v=>!v)}>Mostrar detalle por documento</span>
          </label>
        )}
      </div>

      {/* Contenido */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        {vista==='estado'
          ? <EstadoCuenta cuentas={cuentasPaginaVista}/>
          : <AntiguedadSaldos ids={idsAntiguedadPagina} detallePorDocumento={detallePorDocumento}/>
        }
      </div>

      {/* Footer paginación */}
      <div style={{ borderTop:`1px solid ${C.n500}`, padding:'8px 24px', flexShrink:0, background:'#FFFFFF' }}>
        <Pagination page={paginaActual} pageSize={pageSize} total={cuentasFiltradas.length} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      {showVista && (
        <VistaPreviaModal tipo={tipo} vista={vista} cuentas={cuentasFiltradasVista} idsAntiguedad={idsAntiguedad} detallePorDocumento={detallePorDocumento} onClose={()=>setShowVista(false)}/>
      )}
      {modalCuentaOpen && (
        <ModalSeleccionarCuenta tipo={tipo} cuentaId={cuentaId} rango={rangoCP}
          onSelectCuenta={id=>{ setCuentaId(id); setRangoCP(null); }}
          onSelectRango={r=>{ setRangoCP(r); setCuentaId(''); }}
          onClose={()=>setModalCuentaOpen(false)}/>
      )}
    </div>
  );
}
