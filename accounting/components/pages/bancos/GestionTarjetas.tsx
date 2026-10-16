'use client';
import { useState } from 'react';
import { PageHeader, Modal, Toast } from '../../ui/primitives';
import { C, PAGE_PAD, radius, TABLA } from '../../ui/tokens';
import { fmtNum } from '../../ui/formato';
import { Pagination } from '../../ui/tabla';
import { BotonExportarUnico, ExportListModal } from '../../ui/exportar';
import { MoneyHeaderCells, MoneyCells, MoneyCellsStack } from '../../ui/montos';
import { BulkActionBar, SearchInput, FilterDropdown } from '../../ui/filtros';
import { NuevaLiquidacionModal } from './gestionTarjetas/NuevaLiquidacionModal';
import { AFILIADOS, BRAND, CUENTAS_TRANSITO, ESTADO_STYLE, F, LIQUIDACIONES_INIT, type Liquidacion, fmt2 } from './gestionTarjetas/datos';
import { CorreoLiquidacionModal, DetalleLiquidacionModal } from './gestionTarjetas/modales';
import { FechasFilter } from './gestionTarjetas/piezas';

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GestionTarjetas() {
  const [liqs, setLiqs] = useState<Liquidacion[]>(LIQUIDACIONES_INIT);
  const [showNew, setShowNew] = useState(false);
  const [showExportar, setShowExportar] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  function toggleSel(id:number) { setSelected(p=>{ const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; }); }
  function toggleSelAll(ids:number[]) { setSelected(p=> p.size===ids.length ? new Set() : new Set(ids)); }
  const [searchQ, setSearch] = useState('');
  const [filtFecha, setFiltFecha] = useState<{from:string;to:string}>({from:'',to:''});
  const [filtAfiliado, setFiltAfiliado] = useState<Set<string>>(new Set());
  const [filtCuenta, setFiltCuenta] = useState<Set<string>>(new Set());
  const [filtMoneda, setFiltMoneda] = useState<Set<string>>(new Set());
  const [filtUsuario, setFiltUsuario] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<string|null>(null);
  const [detalleLiq, setDetalleLiq] = useState<Liquidacion|null>(null);
  const [correoLiq, setCorreoLiq] = useState<Liquidacion|null>(null);
  const [anularLiq, setAnularLiq] = useState<Liquidacion|null>(null);
  const [imprimirLiq, setImprimirLiq] = useState<Liquidacion|null>(null);

  function anular(liq: Liquidacion) {
    setLiqs(p=>p.map(l=>l.id===liq.id?{...l,estado:'Anulada'}:l));
    setAnularLiq(null); setDetalleLiq(null);
    setToast(`Liquidación ${liq.consecutivo} anulada.`);
  }
  function imprimir(liq: Liquidacion) {
    setImprimirLiq(liq);
    setTimeout(()=>window.print(), 50);
  }

  const filtered = liqs.filter(l => {
    if (searchQ && !l.consecutivo.toLowerCase().includes(searchQ.toLowerCase()) && !l.afiliado.toLowerCase().includes(searchQ.toLowerCase())) return false;
    if (filtAfiliado.size > 0 && !filtAfiliado.has(l.afiliadoCode)) return false;
    if (filtCuenta.size > 0 && !filtCuenta.has(l.cuentaTransito)) return false;
    if (filtMoneda.size > 0 && !filtMoneda.has(l.moneda)) return false;
    if (filtUsuario.size > 0 && !filtUsuario.has(l.usuario)) return false;
    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginaActual = Math.min(page, totalPaginas);
  const paginated = filtered.slice((paginaActual-1)*pageSize, paginaActual*pageSize);

  const totalCRC = filtered.filter(l=>l.moneda==='CRC').reduce((s,l)=>s+l.importe,0);
  const totalUSD = filtered.filter(l=>l.moneda==='USD').reduce((s,l)=>s+l.importe,0);

  const IcEdit = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-9 9H2v-3l9-9z"/></svg>;
  const IcPrint = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6V2h8v4"/><rect x="1" y="6" width="14" height="6" rx="1.5"/><path d="M4 9v5h8V9"/></svg>;

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#F9F9F9' }}>
      {/* Header */}
      <PageHeader title="Gestión de tarjetas">
        <BotonExportarUnico onClick={()=>setShowExportar(true)}/>
        <button onClick={()=>setShowNew(true)} style={{ height:34, padding:'0 14px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:F, display:'flex', alignItems:'center', gap:6 }}>
          + Nueva liquidación
        </button>
      </PageHeader>

      {/* Filtros */}
      <div style={{ background:'#FFFFFF', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px', display:'flex', gap:10, alignItems:'center', flexShrink:0, flexWrap:'wrap' }}>
        <SearchInput value={searchQ} onChange={setSearch} placeholder="Buscar por consecutivo…" width={220} />
        <FechasFilter value={filtFecha} onChange={setFiltFecha} onClear={()=>setFiltFecha({from:'',to:''})}/>
        <FilterDropdown label="Afiliado" options={AFILIADOS.map(a=>a.code)} selected={filtAfiliado} onApply={setFiltAfiliado} onClear={()=>setFiltAfiliado(new Set())}/>
        <FilterDropdown label="Cuenta en tránsito" options={CUENTAS_TRANSITO} selected={filtCuenta} onApply={setFiltCuenta} onClear={()=>setFiltCuenta(new Set())}/>
        <FilterDropdown label="Moneda" options={['CRC','USD']} selected={filtMoneda} onApply={setFiltMoneda} onClear={()=>setFiltMoneda(new Set())}/>
        <FilterDropdown label="Usuario" options={['jperez','sblandon','yader','glopez']} selected={filtUsuario} onApply={setFiltUsuario} onClear={()=>setFiltUsuario(new Set())}/>
      </div>

      {/* Barra de acciones masivas */}
      <BulkActionBar count={selected.size} onClose={()=>setSelected(new Set())} actions={[
        { label:'Anular', variant:'outline', onClick:()=>{ setLiqs(p=>p.map(l=>selected.has(l.id)?{...l,estado:'Anulada'}:l)); setSelected(new Set()); } },
        { label:'Contabilizar', onClick:()=>{ setLiqs(p=>p.map(l=>selected.has(l.id)?{...l,estado:'Contabilizada'}:l)); setSelected(new Set()); } },
      ]}/>

      {/* Table */}
      <div style={{ flex:1, overflowY:'auto', background:'#FFFFFF', padding:`0 ${PAGE_PAD-12}px` }}>
        <table className="tabla" style={TABLA.table}>
          <thead style={{ position:'sticky', top:0, background:'#FFFFFF', zIndex:2 }}>
            <tr style={TABLA.headRow}>
              <th style={{ ...TABLA.th, width:36, padding:'10px 0 10px 12px' }}>
                <input type="checkbox" checked={selected.size>0 && selected.size===paginated.length} onChange={()=>toggleSelAll(paginated.map(l=>l.id))} style={{ width:14, height:14, accentColor:BRAND, cursor:'pointer' }}/>
              </th>
              {['Consecutivo','Afiliado','Fecha','Cuenta en tránsito','Referencia','Moneda'].map(h=>(
                <th key={h} style={TABLA.th}>{h}</th>
              ))}
              <MoneyHeaderCells label="Importe"/>
              {['Usuario','Acciones'].map(h=>(
                <th key={h} style={TABLA.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map(l=>{
              const sym = l.moneda==='USD'?'$':'₡';
              const [stColor, stBg] = ESTADO_STYLE[l.estado];
              return (
                <tr key={l.id} style={{ borderBottom:'1px solid #ECECEC', background:selected.has(l.id)?C.brandBg:'#FFFFFF', cursor:'pointer' }}
                  onClick={()=>setDetalleLiq(l)}
                  onMouseEnter={e=>{ if(!selected.has(l.id)) e.currentTarget.style.background=C.n200; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background=selected.has(l.id)?'#FFFBF0':'#FFFFFF'; }}>
                  <td style={{ padding:'10px 0 10px 12px' }} onClick={e=>e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(l.id)} onChange={()=>toggleSel(l.id)} style={{ width:14, height:14, accentColor:BRAND, cursor:'pointer' }}/>
                  </td>
                  <td style={{ padding:'8px 12px' }}><span style={{ color:BRAND, fontFamily:F, cursor:'pointer' }}>{l.consecutivo}</span></td>
                  <td style={{ padding:'8px 12px', fontSize:12, color:'#0F0F0F' }}>{l.afiliado.split('·')[0]?.trim()}</td>
                  <td style={{ padding:'8px 12px' }}>{l.fecha}</td>
                  <td style={{ padding:'8px 12px', color:'#0F0F0F', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={l.cuentaTransito}>{l.cuentaTransito}</td>
                  <td style={{ padding:'8px 12px' }}>{l.referencia}</td>
                  <td style={{ padding:'8px 12px' }}><span style={{ fontSize:10, padding:'2px 7px', background:C.n200, borderRadius:4 }}>{l.moneda} {sym}</span></td>
                  <MoneyCells sym={sym} value={fmt2(l.importe)}/>
                  <td style={{ padding:'8px 12px' }}>{l.usuario}</td>
                  <td onClick={e=>e.stopPropagation()} style={{ padding:'10px 12px', whiteSpace:'nowrap' }}>
                    <div style={{ display:'flex', gap:2 }}>
                      {l.nroAsiento && (
                        <button title="Ver asiento" onClick={()=>setToast(`Asiento ${l.nroAsiento} · consultalo en Bandeja de asientos.`)} style={{ width:26,height:26,borderRadius:5,border:`1px solid ${C.n500}`,background:'#FFFFFF',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:BRAND }}>
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M1 7s2.2-4.5 6-4.5S13 7 13 7s-2.2 4.5-6 4.5S1 7 1 7z"/><circle cx="7" cy="7" r="1.5"/></svg>
                        </button>
                      )}
                      <button title="Editar" onClick={()=>setDetalleLiq(l)} style={{ width:26,height:26,borderRadius:5,border:`1px solid ${C.n500}`,background:'#FFFFFF',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.n700 }}><IcEdit/></button>
                      <button title="Imprimir" onClick={()=>imprimir(l)} style={{ width:26,height:26,borderRadius:5,border:`1px solid ${C.n500}`,background:'#FFFFFF',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.n700 }}><IcPrint/></button>
                      <button title="Enviar correo" onClick={()=>setCorreoLiq(l)} style={{ width:26,height:26,borderRadius:5,border:`1px solid ${C.n500}`,background:'#FFFFFF',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.n700 }}>
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="1" y="3" width="12" height="8" rx="1.5"/><path d="M1 3l6 5 6-5"/></svg>
                      </button>
                      <button title="Anular" onClick={()=>setAnularLiq(l)} disabled={l.estado==='Anulada'} style={{ width:26,height:26,borderRadius:5,border:`1px solid ${`${C.errorBorder}`}`,background:C.errorBg,cursor:l.estado==='Anulada'?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.error,opacity:l.estado==='Anulada'?.4:1 }}>
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="7" cy="7" r="5.5"/><path d="M4.5 4.5l5 5"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop:`2px solid ${C.n500}`, background:'#F9F9F9' }}>
              <td colSpan={7} style={{ padding:'8px 12px', fontWeight:600, fontSize:12, fontFamily:F, textAlign:'right' }}>Totales</td>
              <MoneyCellsStack bold rows={[
                ...(totalCRC>0 ? [{sym:'₡', value:fmt2(totalCRC)}] : []),
                ...(totalUSD>0 ? [{sym:'$', value:fmt2(totalUSD)}] : []),
              ]}/>
              <td colSpan={2}/>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer */}
      <div style={{ background:'#FFFFFF', borderTop:`1px solid ${C.n500}`, padding:'8px 24px', flexShrink:0 }}>
        <Pagination page={paginaActual} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      {showNew && <NuevaLiquidacionModal onClose={()=>setShowNew(false)} onSave={liq=>{setLiqs(p=>[liq,...p]);}}/>}
      {showExportar && (
        <ExportListModal
          title="Gestión de tarjetas - Liquidaciones"
          subtitulo={`${filtered.length} liquidación${filtered.length===1?'':'es'}`}
          filename="liquidaciones-tarjetas"
          columns={[
            { key:'consecutivo', label:'Consecutivo' }, { key:'fecha', label:'Fecha' }, { key:'afiliado', label:'Afiliado' },
            { key:'cuentaTransito', label:'Cuenta de tránsito' }, { key:'referencia', label:'Referencia' },
            { key:'importe', label:'Importe', align:'right' }, { key:'usuario', label:'Usuario' }, { key:'estado', label:'Estado' },
          ]}
          rows={filtered.map(l=>({
            consecutivo:l.consecutivo, fecha:l.fecha, afiliado:l.afiliado, cuentaTransito:l.cuentaTransito,
            referencia:l.referencia, importe:`${l.moneda==='USD'?'$':'₡'} ${fmtNum(l.importe,2)}`, usuario:l.usuario, estado:l.estado,
          }))}
          onClose={()=>setShowExportar(false)}
        />
      )}

      {detalleLiq && (
        <DetalleLiquidacionModal liq={detalleLiq} onClose={()=>setDetalleLiq(null)} onAnular={()=>setAnularLiq(detalleLiq)}/>
      )}
      {correoLiq && (
        <CorreoLiquidacionModal liq={correoLiq} onClose={()=>setCorreoLiq(null)}
          onEnviar={(correo)=>{ setCorreoLiq(null); setToast(`Liquidación ${correoLiq.consecutivo} enviada a ${correo}.`); }}/>
      )}
      {anularLiq && (
        <Modal open title="Anular liquidación" onClose={()=>setAnularLiq(null)}
          footer={
            <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
              <button onClick={()=>setAnularLiq(null)} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, background:'#FFFFFF', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
              <button onClick={()=>anular(anularLiq)} style={{ height:34, padding:'0 16px', background:C.error, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Anular</button>
            </div>
          }>
          <p style={{ fontSize:12, color:'#0F0F0F', margin:0, fontFamily:F }}>
            ¿Anular la liquidación <strong>{anularLiq.consecutivo}</strong> de {anularLiq.afiliado.split('·')[0]?.trim()} por {anularLiq.moneda==='USD'?'$':'₡'} {fmt2(anularLiq.importe)}?
          </p>
        </Modal>
      )}
      {toast && <Toast message={toast} type="success" onClose={()=>setToast(null)}/>}

      {/* Imprimir liquidación - formato dedicado, sin el resto de la pantalla */}
      <style>{`
        #liq-print-area { display:none; }
        @media print {
          body * { visibility:hidden; }
          #liq-print-area, #liq-print-area * { visibility:visible; }
          #liq-print-area { display:block !important; position:absolute; left:0; top:0; width:100%; padding:32px; }
        }
      `}</style>
      {imprimirLiq && (
        <div id="liq-print-area">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
            <div>
              <p style={{ fontSize:18, fontWeight:700, margin:0, fontFamily:F }}>Hotel Fortuna S.A.</p>
              <p style={{ fontSize:13, color:'#757575', margin:'3px 0 0', fontFamily:F }}>Liquidación de tarjetas · {imprimirLiq.consecutivo}</p>
            </div>
            <p style={{ fontSize:11, color:'#757575', margin:0, fontFamily:F }}>Generado: {new Date().toLocaleDateString('es-CR')}</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px 16px', fontSize:12, padding:'14px 0', borderTop:'1px solid #ECECEC', borderBottom:'1px solid #ECECEC' }}>
            {[['Afiliado',imprimirLiq.afiliado],['Fecha',imprimirLiq.fecha],['Estado',imprimirLiq.estado],
              ['Cuenta en tránsito',imprimirLiq.cuentaTransito],['Referencia',imprimirLiq.referencia],
              ['Moneda',imprimirLiq.moneda],['Importe',`${imprimirLiq.moneda==='USD'?'$':'₡'} ${fmt2(imprimirLiq.importe)}`],
              ['Usuario',imprimirLiq.usuario],['N.º Asiento',imprimirLiq.nroAsiento||'Sin asiento asociado']]
              .map(([l,v])=>(
              <div key={l as string}>
                <p style={{ fontSize:10, color:'#757575', margin:'0 0 2px', fontFamily:F }}>{l as string}</p>
                <p style={{ fontSize:12, fontWeight:500, color:'#0F0F0F', margin:0, fontFamily:F }}>{v as string}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
