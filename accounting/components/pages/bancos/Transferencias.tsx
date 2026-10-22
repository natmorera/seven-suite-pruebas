'use client';
import ComprobanteOperacionModal from '@/components/ui/documento/ComprobanteOperacion';
import { armarComprobantes } from '@/components/ui/documento/comprobantes';
import { useEmpresaDoc } from '@/components/ui/documento/useEmpresaDoc';
import { useState } from 'react';
import { Toast, PageHeader } from '@/components/ui/primitives';
import { C, PAGE_PAD, radius, TABLA } from '@/components/ui/tokens';
import { fmtNum } from '@/components/ui/formato';
import { Pagination } from '@/components/ui/tabla';
import { BotonExportarUnico, ExportListModal } from '@/components/ui/exportar';
import { SearchInput, FilterDropdown } from '@/components/ui/filtros';
import { FechaFilterDrop, parseFechaDDMMYY } from './comun/FechaFilterDrop';
import { NuevaTrfModal } from './transferencias/NuevaTrfModal';
import { BRAND, ESTADO_STYLE, F, TRFS_INIT, type Transferencia, fmt2 } from './transferencias/datos';
import { Pill } from './transferencias/piezas';

// ── Pantalla principal ──────────────────────────────────────────────────────────────────────
const IcPrint = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6V2h8v4"/><rect x="1" y="6" width="14" height="6" rx="1.5"/><path d="M4 9v5h8V9"/></svg>;

export default function Transferencias() {
  const [trfs, setTrfs] = useState<Transferencia[]>(TRFS_INIT);
  const [showNew, setShowNew] = useState(false);
  const [comprobante, setComprobante] = useState<Transferencia | null>(null);
  const empresaDoc = useEmpresaDoc();
  const [showExportar, setShowExportar] = useState(false);
  const [editing, setEditing] = useState<Transferencia|null>(null);
  const [searchQ, setSearch] = useState('');
  const [filtEstado, setFiltEstado] = useState<Set<string>>(new Set());
  const [filtMoneda, setFiltMoneda] = useState<Set<string>>(new Set());
  const [filtUsuario, setFiltUsuario] = useState<Set<string>>(new Set());
  const [filtBanco, setFiltBanco] = useState<Set<string>>(new Set());
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');
  const [toast, setToast] = useState<string|null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filtered = trfs.filter(t => {
    if (searchQ && !t.consecutivo.toLowerCase().includes(searchQ.toLowerCase())) return false;
    if (filtEstado.size > 0 && !filtEstado.has(t.estado)) return false;
    if (filtMoneda.size > 0 && !filtMoneda.has(t.monedaOrigen) && !filtMoneda.has(t.monedaDestino)) return false;
    if (filtUsuario.size > 0 && !filtUsuario.has(t.usuario)) return false;
    if (filtBanco.size > 0 && ![...filtBanco].some(b => t.cuentaOrigen.includes(b) || t.cuentaDestino.includes(b))) return false;
    if (fDesde || fHasta) {
      const d = parseFechaDDMMYY(t.fecha);
      if (!d) return false;
      if (fDesde && d < new Date(fDesde)) return false;
      if (fHasta && d > new Date(fHasta)) return false;
    }
    return true;
  });

  // Los totales no incluyen operaciones anuladas: sumar transferencias sin efecto
  // real distorsionaría el total de la sección.
  const activas = filtered.filter(t => t.estado !== 'Anulados');
  const totalOriCRC = activas.filter(t=>t.monedaOrigen==='CRC').reduce((s,t)=>s+t.importeOrigen,0);
  const totalOriUSD = activas.filter(t=>t.monedaOrigen==='USD').reduce((s,t)=>s+t.importeOrigen,0);
  const totalDesCRC = activas.filter(t=>t.monedaDestino==='CRC').reduce((s,t)=>s+t.importeDestino,0);
  const totalDesUSD = activas.filter(t=>t.monedaDestino==='USD').reduce((s,t)=>s+t.importeDestino,0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const paginated = filtered.slice((pageClamped-1)*pageSize, pageClamped*pageSize);

  const IcEdit  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-9 9H2v-3l9-9z"/></svg>;
  const IcCopy  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3h8"/></svg>;
  const IcCheck = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="8" r="6.33"/><path d="M5 8l2 2 4-4"/></svg>;
  const IcBan   = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="8" r="6.33"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5"/></svg>;
  const IcRestore = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8a6 6 0 1 1 1.76 4.24"/><path d="M2 12V8h4"/></svg>;

  function contabilizar(id:number){ setTrfs(p=>p.map(t=>t.id===id?{...t,estado:'Contabilizado'}:t)); setToast('Transferencia contabilizada'); }
  function descontabilizar(id:number){ setTrfs(p=>p.map(t=>t.id===id?{...t,estado:'Pendiente'}:t)); setToast('Transferencia descontabilizada'); }
  function anular(id:number){ setTrfs(p=>p.map(t=>t.id===id?{...t,estado:'Anulados'}:t)); setToast('Transferencia anulada'); }
  function restaurar(id:number){ setTrfs(p=>p.map(t=>t.id===id?{...t,estado:'Pendiente'}:t)); setToast('Transferencia restaurada a Pendiente'); }
  function duplicar(t:Transferencia){
    const nuevoConsec = 5095 + trfs.length;
    const copia: Transferencia = { ...t, id:Date.now(), consecutivo:`TRF-${nuevoConsec}`, estado:'Pendiente', titulo:`Transferencia interbancaria - ${nuevoConsec}` };
    setTrfs(p=>[copia,...p]);
    setToast(`Transferencia ${copia.consecutivo} creada a partir de ${t.consecutivo}`);
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#F9F9F9' }}>
      {/* Encabezado */}
      <PageHeader title="Transferencias interbancarias">
        <BotonExportarUnico onClick={()=>setShowExportar(true)}/>
        <button onClick={()=>setToast('Enviando listado a la impresora…')} style={{ height:34, padding:'0 13px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:6, color:C.n700, fontFamily:F }}>
          <IcPrint/> Imprimir
        </button>
        <button onClick={()=>{setEditing(null);setShowNew(true);}} style={{ height:34, padding:'0 14px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:F, display:'flex', alignItems:'center', gap:6 }}>
          + Nueva transferencia
        </button>
      </PageHeader>

      {/* Toolbar */}
      <div style={{ background:'#FFFFFF', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px', display:'flex', gap:10, alignItems:'center', flexShrink:0, flexWrap:'wrap' }}>
        <SearchInput value={searchQ} onChange={v=>{setSearch(v);setPage(1);}} placeholder="Buscar por consecutivo…" width={220} />
        <FechaFilterDrop desde={fDesde} hasta={fHasta} onApply={(d,h)=>{setFDesde(d);setFHasta(h);setPage(1);}} onClear={()=>{setFDesde('');setFHasta('');setPage(1);}}/>
        <FilterDropdown label="Estado" options={['Pendiente','Contabilizado','Anulados']} selected={filtEstado} onApply={s=>{setFiltEstado(s);setPage(1);}} onClear={()=>{setFiltEstado(new Set());setPage(1);}}/>
        <FilterDropdown label="Banco" options={['BAC','BNCR','BCR']} selected={filtBanco} onApply={s=>{setFiltBanco(s);setPage(1);}} onClear={()=>{setFiltBanco(new Set());setPage(1);}}/>
        <FilterDropdown label="Moneda" options={['CRC','USD']} selected={filtMoneda} onApply={s=>{setFiltMoneda(s);setPage(1);}} onClear={()=>{setFiltMoneda(new Set());setPage(1);}}/>
        <FilterDropdown label="Usuario" options={['jperez','yader']} selected={filtUsuario} onApply={s=>{setFiltUsuario(s);setPage(1);}} onClear={()=>{setFiltUsuario(new Set());setPage(1);}}/>
      </div>

      {/* Tabla */}
      <div style={{ flex:1, overflow:'auto', background:'#FFFFFF', padding:`0 ${PAGE_PAD-12}px` }}>
        <table className="tabla" style={TABLA.table}>
          <thead style={{ position:'sticky', top:0, background:'#FFFFFF', zIndex:2 }}>
            <tr style={TABLA.headRow}>
              <th style={{ width:16 }}/>
              {['Consecutivo','Fecha','Estado','Cuenta origen','Moneda orig.','Importe origen','Cuenta destino','Moneda dest.','Importe destino','Usuario','Acciones'].map(h=>(
                <th key={h} style={{ ...TABLA.th, textAlign:['Importe origen','Importe destino'].includes(h)?'right':'left', whiteSpace:h.startsWith('Moneda')?'normal':'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length===0 && (
              <tr><td colSpan={12} style={TABLA.empty}>No hay transferencias para mostrar</td></tr>
            )}
            {paginated.map(t => {
              const [stC,stB] = ESTADO_STYLE[t.estado];
              const symO = t.monedaOrigen  === 'USD' ? '$' : '₡';
              const symD = t.monedaDestino === 'USD' ? '$' : '₡';
              return (
                <tr key={t.id} style={{ borderBottom:'1px solid #ECECEC' }}
                  onMouseEnter={e=>(e.currentTarget.style.background=C.n200)}
                  onMouseLeave={e=>(e.currentTarget.style.background='#FFFFFF')}>
                  <td/>
                  <td style={{ padding:'8px 12px' }}><span style={{ color:BRAND, fontFamily:F, cursor:'pointer' }} onClick={()=>{setEditing(t);setShowNew(true);}}>{t.consecutivo}</span></td>
                  <td style={{ padding:'8px 12px' }}>{t.fecha}</td>
                  <td style={{ padding:'8px 12px' }}><Pill color={stC} bg={stB}>{t.estado}</Pill></td>
                  <td style={{ padding:'8px 12px', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={t.cuentaOrigen}>{t.cuentaOrigen}</td>
                  <td style={{ padding:'8px 12px' }}><span style={{ fontSize:10.5, padding:'2px 7px', background:C.n200, borderRadius:4, whiteSpace:'nowrap' }}>{t.monedaOrigen} {symO}</span></td>
                  <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'14px 1fr', gap:4, width:'100%' }}>
                      <span>{symO}</span>
                      <span style={{ textAlign:'right' }}>{t.importeOrigen > 0 ? fmt2(t.importeOrigen) : '-'}</span>
                    </div>
                  </td>
                  <td style={{ padding:'8px 12px', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={t.cuentaDestino}>{t.cuentaDestino}</td>
                  <td style={{ padding:'8px 12px' }}><span style={{ fontSize:10.5, padding:'2px 7px', background:C.n200, borderRadius:4, whiteSpace:'nowrap' }}>{t.monedaDestino} {symD}</span></td>
                  <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'14px 1fr', gap:4, width:'100%' }}>
                      <span>{symD}</span>
                      <span style={{ textAlign:'right' }}>{t.importeDestino > 0 ? fmt2(t.importeDestino) : '-'}</span>
                    </div>
                  </td>
                  <td style={{ padding:'8px 12px' }}>{t.usuario}</td>
                  <td style={{ padding:'8px 12px' }}>
                    <div style={{ display:'flex', gap:4 }}>
                      <button title="Ver comprobante" aria-label="Ver comprobante" onClick={()=>setComprobante(t)} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.n700, display:'flex', alignItems:'center', justifyContent:'center' }}><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 1.5h6l3 3v10H4z"/><path d="M10 1.5v3h3M6 8h5M6 10.5h5M6 13h3"/></svg></button>
                      {t.estado === 'Pendiente' && (
                        <>
                          <button title="Contabilizar" onClick={()=>contabilizar(t.id)} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.n700, display:'flex', alignItems:'center', justifyContent:'center' }} onMouseEnter={e=>(e.currentTarget.style.background=C.n200)} onMouseLeave={e=>(e.currentTarget.style.background='none')}><IcCheck/></button>
                          <button title="Editar" onClick={()=>{setEditing(t);setShowNew(true);}} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.n700, display:'flex', alignItems:'center', justifyContent:'center' }} onMouseEnter={e=>(e.currentTarget.style.background=C.n200)} onMouseLeave={e=>(e.currentTarget.style.background='none')}><IcEdit/></button>
                          <button title="Duplicar" onClick={()=>duplicar(t)} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.n700, display:'flex', alignItems:'center', justifyContent:'center' }} onMouseEnter={e=>(e.currentTarget.style.background=C.n200)} onMouseLeave={e=>(e.currentTarget.style.background='none')}><IcCopy/></button>
                          <button title="Anular" onClick={()=>anular(t.id)} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.error, display:'flex', alignItems:'center', justifyContent:'center' }} onMouseEnter={e=>(e.currentTarget.style.background=C.errorBg)} onMouseLeave={e=>(e.currentTarget.style.background='none')}><IcBan/></button>
                        </>
                      )}
                      {t.estado === 'Contabilizado' && (
                        <>
                          <button title="Descontabilizar" onClick={()=>descontabilizar(t.id)} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.n700, display:'flex', alignItems:'center', justifyContent:'center' }}><IcCheck/></button>
                          <button title="Duplicar" onClick={()=>duplicar(t)} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.n700, display:'flex', alignItems:'center', justifyContent:'center' }}><IcCopy/></button>
                        </>
                      )}
                      {t.estado === 'Anulados' && (
                        <button title="Restaurar" onClick={()=>restaurar(t.id)} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.n700, display:'flex', alignItems:'center', justifyContent:'center' }}><IcRestore/></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background:'#F9F9F9', borderTop:`2px solid ${C.n500}` }}>
              <td colSpan={5} style={{ padding:'8px 12px', fontWeight:600, fontSize:12, fontFamily:F, textAlign:'right' }}>Totales (excluye anuladas)</td>
              <td/>
              <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {totalOriCRC > 0 && <div style={{ display:'grid', gridTemplateColumns:'14px 1fr', gap:4, width:'100%' }}><span style={{ color:C.n700, fontSize:11 }}>₡</span><span style={{ fontWeight:700, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmt2(totalOriCRC)}</span></div>}
                  {totalOriUSD > 0 && <div style={{ display:'grid', gridTemplateColumns:'14px 1fr', gap:4, width:'100%' }}><span style={{ color:C.n700, fontSize:11 }}>$</span><span style={{ fontWeight:700, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmt2(totalOriUSD)}</span></div>}
                </div>
              </td>
              <td/>
              <td/>
              <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {totalDesCRC > 0 && <div style={{ display:'grid', gridTemplateColumns:'14px 1fr', gap:4, width:'100%' }}><span style={{ color:C.n700, fontSize:11 }}>₡</span><span style={{ fontWeight:700, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmt2(totalDesCRC)}</span></div>}
                  {totalDesUSD > 0 && <div style={{ display:'grid', gridTemplateColumns:'14px 1fr', gap:4, width:'100%' }}><span style={{ color:C.n700, fontSize:11 }}>$</span><span style={{ fontWeight:700, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmt2(totalDesUSD)}</span></div>}
                </div>
              </td>
              <td/><td/>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pie */}
      <div style={{ background:'#FFFFFF', borderTop:`1px solid ${C.n500}`, padding:'8px 24px', flexShrink:0 }}>
        <Pagination page={pageClamped} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      {comprobante && <ComprobanteOperacionModal titulo={`Comprobante · ${comprobante.titulo}`} archivo={`comprobante-transferencia-${comprobante.consecutivo}`} marca={C.brand}
        onClose={() => setComprobante(null)} comprobantes={armarComprobantes({ clase: 'Transferencia', numero: comprobante.consecutivo, empresa: empresaDoc,
          tercero: { nombre: comprobante.cuentaDestino }, fecha: comprobante.fecha, medioPago: `Transferencia bancaria desde ${comprobante.cuentaOrigen}${comprobante.referOrigen ? ` · Ref. ${comprobante.referOrigen}` : ''}`,
          concepto: comprobante.titulo, simbolo: comprobante.monedaOrigen === 'USD' ? '$' : '₡', importe: comprobante.importeOrigen, documentos: [] })} />}
      {showNew && <NuevaTrfModal trfs={trfs} editing={editing??undefined} onClose={()=>{setShowNew(false);setEditing(null);}} onSave={t=>{
        setTrfs(p => p.some(x=>x.id===t.id) ? p.map(x=>x.id===t.id?t:x) : [t,...p]);
      }}/>}
      {showExportar && (
        <ExportListModal
          title="Transferencias interbancarias"
          subtitulo={`${filtered.length} transferencia${filtered.length===1?'':'s'}`}
          filename="transferencias"
          columns={[
            { key:'consecutivo', label:'Consecutivo' }, { key:'fecha', label:'Fecha' }, { key:'cuentaOrigen', label:'Cuenta origen' },
            { key:'cuentaDestino', label:'Cuenta destino' }, { key:'importe', label:'Importe', align:'right' },
            { key:'usuario', label:'Usuario' }, { key:'estado', label:'Estado' },
          ]}
          rows={filtered.map(t=>({
            consecutivo:t.consecutivo, fecha:t.fecha, cuentaOrigen:t.cuentaOrigen, cuentaDestino:t.cuentaDestino,
            importe:`${t.monedaOrigen==='USD'?'$':'₡'} ${fmtNum(t.importeOrigen,2)}`, usuario:t.usuario, estado:t.estado,
          }))}
          onClose={()=>setShowExportar(false)}
        />
      )}
      {toast && <Toast message={toast} type="success" onClose={()=>setToast(null)}/>}
    </div>
  );
}
