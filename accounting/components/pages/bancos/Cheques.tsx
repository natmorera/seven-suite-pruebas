'use client';
import { useState } from 'react';
import DetalleDrawer from '../asientos/DetalleDrawer';
import { Toast, PageHeader } from '../../ui/primitives';
import { C, PAGE_PAD, radius, TABLA } from '../../ui/tokens';
import { Pagination } from '../../ui/tabla';
import { fmtNum } from '../../ui/formato';
import { BotonExportarUnico, ExportListModal } from '../../ui/exportar';
import { MoneyHeaderCells, MoneyCells, MoneyCellsStack } from '../../ui/montos';
import { SearchInput, FilterDropdown } from '../../ui/filtros';
import { FechaFilterDrop, parseFechaDDMMYY } from './comun/FechaFilterDrop';
import { ModalGenerarCheque } from './cheques/ModalGenerarCheque';
import { ModalVerCheque } from './cheques/ModalVerCheque';
import { BRAND, type Cheque, EST_STYLE, F, MOCK, fmtN } from './cheques/datos';
import { ModalAnular, ModalEmitir, ModalRetencionesEditor } from './cheques/modales';
import { AccionesRow } from './cheques/piezas';

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Cheques() {
  const [cheques,    setCheques]   = useState<Cheque[]>(MOCK);
  const [busq,       setBusq]       = useState('');
  const [filtEstado, setFiltEstado] = useState<Set<string>>(new Set());
  const [filtBanco,  setFiltBanco]  = useState<Set<string>>(new Set());
  const [filtMoneda, setFiltMoneda] = useState<Set<string>>(new Set());
  const [filtUsuario,setFiltUsuario]= useState<Set<string>>(new Set());
  const [fDesde,     setFDesde]     = useState('');
  const [fHasta,     setFHasta]     = useState('');
  const [modGen,     setModGen]     = useState<Cheque|null|'new'>(null);
  const [showExportar, setShowExportar] = useState(false);
  const [modEmitir,  setModEmitir]  = useState<Cheque|null>(null);
  const [modAnular,  setModAnular]  = useState<Cheque|null>(null);
  const [modVer,     setModVer]     = useState<Cheque|null>(null);
  const [modRet,     setModRet]     = useState<Cheque|null>(null);
  const [modalAsiento, setModalAsiento] = useState<Cheque|null>(null);
  const [toast,      setToast]      = useState<string|null>(null);
  const [pageSize,   setPageSize]   = useState(10);
  const [page,       setPage]       = useState(1);

  const filtered = cheques.filter(ch => {
    if (filtEstado.size && !filtEstado.has(ch.estado)) return false;
    if (filtBanco.size && ![...filtBanco].some(b => ch.banco.includes(b))) return false;
    if (busq && !ch.proveedor.toLowerCase().includes(busq.toLowerCase()) && !ch.consec.includes(busq)) return false;
    if (filtMoneda.size > 0 && !filtMoneda.has(ch.moneda)) return false;
    if (filtUsuario.size > 0 && !filtUsuario.has(ch.usuario)) return false;
    if (fDesde || fHasta) {
      const d = parseFechaDDMMYY(ch.fecha);
      if (!d) return false;
      if (fDesde && d < new Date(fDesde)) return false;
      if (fHasta && d > new Date(fHasta)) return false;
    }
    return true;
  });

  const totalCRC = filtered.filter(c=>c.moneda==='CRC').reduce((s,c)=>s+c.importe,0);
  const totalUSD = filtered.filter(c=>c.moneda==='USD').reduce((s,c)=>s+c.importe,0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const paginated = filtered.slice((pageClamped-1)*pageSize, pageClamped*pageSize);

  function guardarCheque(c: Cheque){
    setCheques(prev => {
      const existe = prev.some(p=>p.id===c.id);
      return existe ? prev.map(p=>p.id===c.id?c:p) : [c, ...prev];
    });
    setModGen(null);
    setToast(modGen==='new' ? 'Cheque generado correctamente' : 'Cheque actualizado correctamente');
  }

  function confirmarEmision(id:string, chequeNro:string, nombre:string){
    setCheques(prev => prev.map(c => c.id===id ? { ...c, estado:'Contabilizado', chequeNro, proveedor: c.proveedor } : c));
    setModEmitir(null);
    setToast(`Cheque ${chequeNro} emitido y contabilizado`);
  }

  function confirmarAnulacion(id:string){
    setCheques(prev => prev.map(c => c.id===id ? { ...c, estado:'Anulado', importe:0 } : c));
    setModAnular(null);
    setToast('Cheque anulado');
  }

  function contabilizar(id:string){
    setCheques(prev => prev.map(c => c.id===id ? { ...c, estado:'Contabilizado' } : c));
    setToast('Cheque contabilizado');
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%',fontFamily:F,background:'#FFFFFF',overflow:'hidden' }}>

      {/* ── Header ── */}
      <PageHeader title="Cheques bancarios">
        <BotonExportarUnico onClick={()=>setShowExportar(true)}/>
        <button onClick={()=>setModGen('new')}
          style={{ height:34,padding:'0 16px',border:'none',borderRadius:radius.md,background:BRAND,
            color:'#FFFFFF',cursor:'pointer',fontSize:12,fontWeight:500,fontFamily:F,
            display:'flex',alignItems:'center',gap:6 }}>
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>
          Nuevo cheque
        </button>
      </PageHeader>

      {/* ── Barra filtros ── */}
      <div style={{ background:'#FFFFFF', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px', display:'flex', gap:10, alignItems:'center', flexShrink:0, flexWrap:'wrap' }}>
        <SearchInput value={busq} onChange={v=>{setBusq(v);setPage(1);}} placeholder="Buscar por consecutivo…" width={220} />
        <FechaFilterDrop desde={fDesde} hasta={fHasta} onApply={(d,h)=>{setFDesde(d);setFHasta(h);setPage(1);}} onClear={()=>{setFDesde('');setFHasta('');setPage(1);}}/>
        <FilterDropdown label="Estado" options={['Pendiente','Emitido','Generado','Contabilizado','Anulado']} selected={filtEstado} onApply={s=>{setFiltEstado(s);setPage(1);}} onClear={()=>{setFiltEstado(new Set());setPage(1);}}/>
        <FilterDropdown label="Banco" options={['BAC','BNCR','Banpro']} selected={filtBanco} onApply={s=>{setFiltBanco(s);setPage(1);}} onClear={()=>{setFiltBanco(new Set());setPage(1);}}/>
        <FilterDropdown label="Moneda" options={['CRC','USD']} selected={filtMoneda} onApply={s=>{setFiltMoneda(s);setPage(1);}} onClear={()=>{setFiltMoneda(new Set());setPage(1);}}/>
        <FilterDropdown label="Usuario" options={['jperez','sblandon']} selected={filtUsuario} onApply={s=>{setFiltUsuario(s);setPage(1);}} onClear={()=>{setFiltUsuario(new Set());setPage(1);}}/>
      </div>

      {/* ── Tabla ── */}
      <div style={{ flex:1,overflowY:'auto', padding:`0 ${PAGE_PAD-12}px` }}>
        <table className="tabla" style={TABLA.table}>
          <thead style={{ position:'sticky',top:0,zIndex:1 }}>
            <tr style={TABLA.headRow}>
              {['Consecutivo','Estado','Proveedor','Cuenta','Fecha','N° Asiento','Moneda'].map((h,i)=>(
                <th key={i} style={TABLA.th}>{h}</th>
              ))}
              <MoneyHeaderCells label="Importe"/>
              {['Usuario','Acciones'].map((h,i)=>(
                <th key={i} style={TABLA.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length===0&&(
              <tr><td colSpan={11} style={TABLA.empty}>
                No hay cheques para mostrar
              </td></tr>
            )}
            {paginated.map(ch=>{
              const st = EST_STYLE[ch.estado];
              return (
                <tr key={ch.id} style={{ borderBottom:'1px solid #ECECEC' }}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#FFFBF2'}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='#FFFFFF'}>
                  {/* Consecutivo / cheque nro */}
                  <td style={{ padding:'8px 12px', fontFamily:F }}>
                    {ch.chequeNro
                      ? <span style={{ color:BRAND, fontFamily:F }}>{ch.chequeNro}</span>
                      : <span>-</span>}
                  </td>
                  {/* Estado */}
                  <td style={{ padding:'8px 12px' }}>
                    <span style={{ display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:radius.pill,
                      border:`1px solid ${st.border}`,background:st.bg,color:st.color,fontSize:11,fontWeight:500,whiteSpace:'nowrap' }}>
                      {ch.estado}
                    </span>
                  </td>
                  {/* Proveedor */}
                  <td style={{ padding:'8px 12px', color:'#0F0F0F', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:F }} title={ch.proveedor}>{ch.proveedor}</td>
                  {/* Cuenta */}
                  <td style={{ padding:'8px 12px', fontFamily:F, maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={ch.cuenta}>{ch.cuenta}</td>
                  {/* Fecha */}
                  <td style={{ padding:'8px 12px', whiteSpace:'nowrap', fontFamily:F }}>{ch.fecha}</td>
                  {/* N° Asiento */}
                  <td style={{ padding:'8px 12px', fontFamily:F }}>
                    {ch.nroAsiento
                      ? <button onClick={e=>{e.stopPropagation(); setModalAsiento(ch);}}
                          style={{ color:BRAND,fontWeight:500,fontFamily:F,background:'none',border:'none',cursor:'pointer',padding:0,fontSize:12,textDecoration:'underline',textDecorationStyle:'dotted',textUnderlineOffset:2 }}>
                          {ch.nroAsiento}
                        </button>
                      : <span>-</span>}
                  </td>
                  {/* Moneda */}
                  <td style={{ padding:'8px 12px', fontFamily:F }}>
                    <div style={{ display:'flex',alignItems:'center',gap:4 }}>
                      <span>{ch.moneda}</span>
                      <span>{ch.moneda==='CRC'?'₡':'$'}</span>
                    </div>
                  </td>
                  {/* Importe */}
                  {ch.importe>0
                    ? <MoneyCells sym={ch.moneda==='USD'?'$':'₡'} value={fmtN(ch.importe)}/>
                    : <><td/><td style={{ color:'#757575' }}>-</td></>}
                  {/* Usuario */}
                  <td style={{ padding:'8px 12px', fontFamily:F }}>{ch.usuario}</td>
                  {/* Acciones */}
                  <td style={{ padding:'8px 12px' }}>
                    <AccionesRow ch={ch}
                      onGen={()=>setModGen(ch)}
                      onEmitir={()=>setModEmitir(ch)}
                      onAnular={()=>setModAnular(ch)}
                      onVer={()=>setModVer(ch)}
                      onContabilizar={()=>contabilizar(ch.id)}
                      onPrint={()=>setToast(`Cheque ${ch.chequeNro ?? ch.consec} enviado a impresora`)}
                      onMail={()=>setToast(`Cheque ${ch.chequeNro ?? ch.consec} enviado por correo al proveedor`)}
                      />
                  </td>
                </tr>
              );
            })}
          </tbody>
          {(totalCRC>0 || totalUSD>0) && (
            <tfoot>
              <tr style={{ background:'#F9F9F9', borderTop:'2px solid #ECECEC' }}>
                <td colSpan={7} style={{ padding:'8px 12px', fontWeight:600, fontSize:12, fontFamily:F, textAlign:'right' }}>Total importe</td>
                <MoneyCellsStack bold rows={[
                  ...(totalCRC>0 ? [{sym:'₡', value:fmtN(totalCRC)}] : []),
                  ...(totalUSD>0 ? [{sym:'$', value:fmtN(totalUSD)}] : []),
                ]}/>
                <td/><td/>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Footer paginación */}
      <div style={{ background:'#FFFFFF', borderTop:`1px solid ${C.n500}`, padding:'8px 24px', flexShrink:0 }}>
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      {/* Modales */}
      {modGen && <ModalGenerarCheque cheque={modGen==='new'?undefined:modGen} onClose={()=>setModGen(null)} onSave={guardarCheque}/>}
      {modEmitir && <ModalEmitir cheque={modEmitir} onClose={()=>setModEmitir(null)} onConfirm={confirmarEmision}/>}
      {modAnular && <ModalAnular cheque={modAnular} onClose={()=>setModAnular(null)} onConfirm={confirmarAnulacion}/>}
      {modVer && <ModalVerCheque cheque={modVer} onClose={()=>setModVer(null)} onVerRetencion={()=>{setModRet(modVer);setModVer(null);}}/>}
      {modRet && <ModalRetencionesEditor cheque={modRet} onClose={()=>setModRet(null)} onSave={r=>{
        setCheques(prev=>prev.map(c=>c.id===modRet.id?{...c,retenciones:r,retencion:r.reduce((s,x)=>s+x.imp,0)}:c));
        setModRet(null);
        setToast('Retenciones actualizadas');
      }}/>}
      {/* Modal asiento inline */}
      {modalAsiento && (
        <DetalleDrawer
          asiento={{
            id: parseInt(modalAsiento.nroAsiento?.replace(/\D/g,'') || '0') || 1,
            consecutivo: modalAsiento.nroAsiento ?? '',
            titulo: `Asiento de cheque ${modalAsiento.nroAsiento}`,
            fecha: modalAsiento.fecha,
            tipo: 'A' as 'A',
            origen: '',
            moneda: modalAsiento.moneda,
            contabilizado: true,
            usuario: modalAsiento.usuario,
            documento: modalAsiento.nroAsiento ?? '',
            importe: modalAsiento.importe,
            observacion: '',
            archivos: [],
            historial: [],
            lineas: [
              { id:1, cuenta:'100200300', descripcion:`${modalAsiento.banco} ${modalAsiento.moneda==='USD'?'Dólares':'Colones'} – Pago cheque ${modalAsiento.nroAsiento ?? ''}`, debe:modalAsiento.importe, haber:0, cCostos:'' },
              { id:2, cuenta:'300001001', descripcion:'Cuentas por pagar – Cancelación',              debe:0,        haber:modalAsiento.importe, cCostos:'' },
            ],
          }}
          onClose={()=>setModalAsiento(null)}
          onAnular={()=>{}}
          onDuplicar={()=>{}}
          onContabilizar={()=>{}}
          onRestaurar={()=>{}}
        />
      )}
      {toast && <Toast message={toast} type="success" onClose={()=>setToast(null)}/>}
      {showExportar && (
        <ExportListModal
          title="Cheques bancarios"
          subtitulo={`${filtered.length} cheque${filtered.length===1?'':'s'}`}
          filename="cheques-bancarios"
          columns={[
            { key:'consec', label:'Consecutivo' }, { key:'chequeNro', label:'N° Cheque' }, { key:'fecha', label:'Fecha' },
            { key:'proveedor', label:'Proveedor' }, { key:'banco', label:'Banco' },
            { key:'importe', label:'Importe', align:'right' }, { key:'usuario', label:'Usuario' }, { key:'estado', label:'Estado' },
          ]}
          rows={filtered.map(ch=>({
            consec:ch.consec, chequeNro:ch.chequeNro ?? '-', fecha:ch.fecha, proveedor:ch.proveedor, banco:ch.banco,
            importe:`${ch.moneda==='USD'?'$':'₡'} ${fmtNum(ch.importe,2)}`, usuario:ch.usuario, estado:ch.estado,
          }))}
          onClose={()=>setShowExportar(false)}
        />
      )}
    </div>
  );
}
