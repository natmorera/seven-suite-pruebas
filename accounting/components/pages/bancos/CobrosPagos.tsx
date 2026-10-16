'use client';
import { useState } from 'react';
import { PageHeader } from '../../ui/primitives';
import { C, PAGE_PAD, radius, shadow, TABLA } from '../../ui/tokens';
import { fmtNum } from '../../ui/formato';
import { Pagination } from '../../ui/tabla';
import { BotonExportarUnico, ExportListModal } from '../../ui/exportar';
import { BulkActionBar, SearchInput, FilterDropdown } from '../../ui/filtros';
import { AnticipoModal } from './cobrosPagos/AnticipoModal';
import { GestionModal } from './cobrosPagos/GestionModal';
import { PagoMasivoModal } from './cobrosPagos/PagoMasivoModal';
import { BANCOS, BRAND, ESTADO_STYLE, F, OPS_INIT, type Operacion, fmt2 } from './cobrosPagos/datos';
import { ActIcon, CobrosFechasFilter, Pill } from './cobrosPagos/piezas';

export default function CobrosPagos() {
  const [ops, setOps] = useState<Operacion[]>(OPS_INIT);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  function toggleSel(id:number) { setSelected(p=>{ const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; }); }
  function toggleSelAll(ids:number[]) { setSelected(p=> p.size===ids.length && ids.length>0 ? new Set() : new Set(ids)); }
  const [modalOp, setModalOp] = useState<Operacion | null>(null);
  const [modalMasivo, setModalMasivo] = useState(false);
  const [modalAnticipo, setModalAnticipo] = useState(false);
  const [newTipo, setNewTipo] = useState<'cobro'|'pago'|'masivo'|'anticipo'|null>(null);
  const [searchQ, setSearch] = useState('');

  const [filtTipo,      setFiltTipo]      = useState<Set<string>>(new Set());
  const [filtEstado,    setFiltEstado]    = useState<Set<string>>(new Set());
  const [filtBanco,     setFiltBanco]     = useState<Set<string>>(new Set());
  const [filtMoneda,    setFiltMonedaC]   = useState<Set<string>>(new Set());
  const [filtUsuarioC,  setFiltUsuarioC]  = useState<Set<string>>(new Set());
  const [filtFechaC,    setFiltFechaC]    = useState({ from:'', to:'' });

  const filtered = ops.filter(o => {
    if (filtTipo.size > 0   && !filtTipo.has(o.tipo))    return false;
    if (searchQ && !o.nombreAux.toLowerCase().includes(searchQ.toLowerCase()) &&
        !String(o.consecutivo).includes(searchQ)) return false;
    if (filtEstado.size > 0 && !filtEstado.has(o.estado))  return false;
    if (filtMoneda.size > 0 && !filtMoneda.has(o.moneda))  return false;
    if (filtBanco.size  > 0 && !filtBanco.has(o.banco))    return false;
    return true;
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPaginas = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginaActual = Math.min(page, totalPaginas);
  const paginated = filtered.slice((paginaActual-1)*pageSize, paginaActual*pageSize);

  function openNew(tipo: 'cobro'|'pago'|'masivo'|'anticipo') {
    if (tipo === 'masivo')   { setModalMasivo(true); return; }
    if (tipo === 'anticipo') { setModalAnticipo(true); return; }
    const id = Date.now();
    const base: Operacion = {
      id, tipo: tipo === 'cobro' ? 'Cobro' : 'Pago',
      estado: 'Pendiente', consecutivo: id % 1000,
      cuenta: '', nombreAux: '', auxId: '', cuentaContable: '',
      titulo: '', flujo: '', fecha: '', moneda: 'CRC', importe: 0,
      banco: BANCOS[0], referencia: '', facturas: [],
      lineasAjuste: [{ id:1, cuenta:'', documento:'', moneda:'¢ CRC', monto:0, tipoMovimiento:'', justificacion:'' }],
    };
    setModalOp(base);
    setNewTipo(null);
  }

  const [dropNueva, setDropNueva] = useState(false);
  const [showExportar, setShowExportar] = useState(false);

  const totalCRC = filtered.filter(o=>o.moneda==='CRC').reduce((s,o)=>s+o.importe,0);
  const totalUSD = filtered.filter(o=>o.moneda==='USD').reduce((s,o)=>s+o.importe,0);

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#F9F9F9' }}>

      {/* Header */}
      <PageHeader title="Cobros / Pagos">
        <BotonExportarUnico onClick={()=>setShowExportar(true)}/>
        <div style={{ position:'relative' }}>
        <div style={{ display:'flex', borderRadius:radius.md, overflow:'hidden', border:`1px solid ${BRAND}` }}>
            <button onClick={() => setDropNueva(v=>!v)}
              style={{ height:34, padding:'0 16px', background:BRAND, color:'#FFFFFF', border:'none',
                cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:F }}>
              Nueva operación
            </button>
            <button onClick={() => setDropNueva(v=>!v)}
              style={{ height:34, padding:'0 10px', background:BRAND, color:'#FFFFFF', border:'none',
                borderLeft:'1px solid rgba(255,255,255,.3)', cursor:'pointer' }}>
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round">
                <path d="M3.5 5.25L7 8.75L10.5 5.25"/>
              </svg>
            </button>
          </div>
          {dropNueva && (
            <div style={{ position:'absolute', top:'calc(100% + 4px)', right:0, zIndex:300, background:'#FFFFFF',
              border:`1px solid ${C.n500}`, borderRadius:10, minWidth:260, boxShadow:shadow.panel, fontFamily:F }}
              onMouseLeave={() => setDropNueva(false)}>
              {([
                ['cobro',    'GC', 'Gestión de cobro',              'Recuperación de cartera de clientes'],
                ['pago',     'GP', 'Gestión de pago',               'Pago a proveedores con o sin archivo bancario'],
                ['anticipo', 'AC AP', 'Anticipo clientes / proveedores','Anticipos emitidos y recibidos'],
              ] as [string, string, string, string][]).map(([tipo, sigla, nombre, desc]) => (
                <button key={tipo} onClick={() => { setDropNueva(false); openNew(tipo as any); }}
                  style={{ display:'block', width:'100%', textAlign:'left', padding:'12px 16px',
                    background:'none', border:'none', cursor:'pointer', borderBottom:`1px solid ${C.n500}` }}
                  onMouseEnter={e=>(e.currentTarget.style.background=C.brandBg)}
                  onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                    <span style={{ fontSize:13, fontWeight:500 }}>{nombre}</span>
                  </div>
                  <p style={{ fontSize:11, color:C.n700, margin:0 }}>{desc}</p>
                </button>
              ))}
            </div>
          )}
          </div>
      </PageHeader>
      <div style={{ background:'#FFFFFF', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px',
        display:'flex', alignItems:'center', gap:10, flexShrink:0, flexWrap:'wrap' }}>
        {/* Buscador */}
        <SearchInput value={searchQ} onChange={setSearch} placeholder="Buscar…" width={200} />
        <CobrosFechasFilter value={filtFechaC} onChange={setFiltFechaC} onClear={()=>setFiltFechaC({from:'',to:''})}/>
        <FilterDropdown label="Tipo de operación" options={['Cobro','Pago','Anticipo']} selected={filtTipo}  onApply={setFiltTipo}  onClear={()=>setFiltTipo(new Set())}/>
        <FilterDropdown label="Estado"            options={['Pendiente','Aplicado','Borrador','Anulado']}    selected={filtEstado} onApply={setFiltEstado} onClear={()=>setFiltEstado(new Set())}/>
        <FilterDropdown label="Banco"             options={BANCOS}                                           selected={filtBanco}  onApply={setFiltBanco}  onClear={()=>setFiltBanco(new Set())}/>
        <FilterDropdown label="Moneda"            options={['CRC','USD']}                                    selected={filtMoneda} onApply={setFiltMonedaC} onClear={()=>setFiltMonedaC(new Set())}/>
        <FilterDropdown label="Usuario"           options={['jperez','sblandon','yader','glopez']}           selected={filtUsuarioC} onApply={setFiltUsuarioC} onClear={()=>setFiltUsuarioC(new Set())}/>
        {(filtTipo.size + filtEstado.size + filtMoneda.size + filtBanco.size) > 0 && (
          <button onClick={()=>{ setFiltTipo(new Set()); setFiltEstado(new Set()); setFiltMonedaC(new Set()); setFiltBanco(new Set()); }}
            style={{ height:28, padding:'0 10px', border:'none', background:C.errorBg, color:C.error,
              borderRadius:radius.sm, cursor:'pointer', fontSize:11, fontFamily:F }}>
            × Limpiar todo
          </button>
        )}

      </div>

      {/* Barra de acciones masivas */}
      <BulkActionBar count={selected.size} onClose={()=>setSelected(new Set())} actions={[
        { label:'Anular', variant:'outline', onClick:()=>{ setOps(p=>p.map(o=>selected.has(o.id)?{...o,estado:'Anulado'}:o)); setSelected(new Set()); } },
        { label:'Aplicar', onClick:()=>{ setOps(p=>p.map(o=>selected.has(o.id)?{...o,estado:'Aplicado'}:o)); setSelected(new Set()); } },
      ]}/>

      {/* Table */}
      <div style={{ flex:1, overflowY:'auto', background:'#FFFFFF', padding:`0 ${PAGE_PAD-12}px` }}>
        <table className="tabla" style={TABLA.table}>
          <thead style={{ position:'sticky', top:0, background:'#FFFFFF', zIndex:2 }}>
            <tr style={TABLA.headRow}>
              <th style={{ ...TABLA.th, width:36 }}>
                <input type="checkbox" checked={selected.size>0 && selected.size===paginated.length} onChange={()=>toggleSelAll(paginated.map(o=>o.id))} style={{ width:13, height:13, accentColor:BRAND, cursor:'pointer' }}/>
              </th>
              {['Consecutivo','Cliente / Proveedor','Fecha','Moneda','Importe','Banco','Estado','Acciones'].map(h => (
                <th key={h} style={{ ...TABLA.th, textAlign:h==='Importe'?'right':'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} style={TABLA.empty}>
                Sin registros.
              </td></tr>
            ) : paginated.map(op => {
              const [stColor, stBg] = ESTADO_STYLE[op.estado];
              const sym = op.moneda === 'USD' ? '$' : '₡';
              const tipoBg  = op.tipo==='Cobro' ? 'rgba(29,158,117,.12)'  : 'rgba(167,118,0,.12)';
              const tipoCl  = op.tipo==='Cobro' ? C.success                : BRAND;
              const tipoSig = op.tipo==='Cobro' ? 'GC' : 'GP';
              return (
                <tr key={op.id} style={{ borderBottom:'1px solid #ECECEC', cursor:'pointer', background:selected.has(op.id)?C.brandBg:'#FFFFFF' }}
                  onClick={() => setModalOp(op)}
                  onMouseEnter={e => { if(!selected.has(op.id)) e.currentTarget.style.background=C.n200; }}
                  onMouseLeave={e => { e.currentTarget.style.background=selected.has(op.id)?'#FFFBF0':'#FFFFFF'; }}>
                  <td onClick={e=>e.stopPropagation()} style={{ padding:'8px 12px' }}>
                    <input type="checkbox" checked={selected.has(op.id)} onChange={()=>toggleSel(op.id)} style={{ width:13, height:13, accentColor:BRAND, cursor:'pointer' }}/>
                  </td>
                  <td style={{ padding:'8px 12px' }}>
                    <button onClick={e=>{e.stopPropagation(); setModalOp(op);}}
                      style={{ color:BRAND, fontWeight:500, fontFamily:F, fontSize:12, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                      {op.tipo==='Cobro'?'GC':op.tipo==='Pago'?'GP':'AC'}-{op.consecutivo}
                    </button>
                  </td>
                  <td style={{ padding:'8px 12px' }}>
                    <p style={{ fontSize:12, fontWeight:500, color:'#0F0F0F', margin:0 }}>{op.nombreAux}</p>
                    <p style={{ fontSize:10, color:C.n700, margin:0, fontFamily:F }}>{op.cuentaContable}</p>
                  </td>
                  <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                    {op.fecha ? op.fecha.split('-').reverse().join('/') : '00/00/0000'}
                  </td>
                  <td style={{ padding:'8px 12px' }}>
                    <span style={{ fontSize:11, padding:'2px 7px', borderRadius:4, background:C.n200 }}>{op.moneda} {sym}</span>
                  </td>
                  <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'14px 1fr', gap:3, width:'100%' }}>
                      <span>{sym}</span>
                      <span style={{ textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmt2(op.importe)}</span>
                    </div>
                  </td>
                  <td style={{ padding:'8px 12px', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={op.banco}>{op.banco}</td>
                  <td style={{ padding:'8px 12px' }}><Pill color={stColor} bg={stBg}>{op.estado}</Pill></td>
                  <td onClick={e=>e.stopPropagation()} style={{ padding:'10px 12px', whiteSpace:'nowrap' }}>
                    <div style={{ display:'flex', gap:1 }}>
                      {/* Pendiente */}
                      {op.estado === 'Pendiente' && (<>
                        <ActIcon label="Contabilizar"         onClick={()=>{ setOps(p=>p.map(o=>o.id===op.id?{...o,estado:'Aplicado'}:o)); }}>
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 7l3.5 3.5L12 3"/></svg>
                        </ActIcon>
                        <ActIcon label="Editar"            onClick={()=>setModalOp(op)}>
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z"/></svg>
                        </ActIcon>
                        <ActIcon label="Adjuntos">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M11.5 6.5L6 12a3.5 3.5 0 01-5-5l5.5-5.5a2 2 0 012.8 2.8L4 9.5a.5.5 0 01-.7-.7L8.5 3.5"/></svg>
                        </ActIcon>
                        <ActIcon label="Reenviar correo">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="1" y="3" width="12" height="8" rx="1.5"/><path d="M1 3l6 5 6-5"/></svg>
                        </ActIcon>
                        <ActIcon label="Anular" color="'#E24B4A'" hoverBg="'rgba(226,75,74,.08)'">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="7" cy="7" r="5.5"/><path d="M4.5 4.5l5 5"/></svg>
                        </ActIcon>
                      </>)}
                      {/* Aplicado */}
                      {op.estado === 'Aplicado' && (<>
                        <ActIcon label="Archivos adjuntos">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M11.5 6.5L6 12a3.5 3.5 0 01-5-5l5.5-5.5a2 2 0 012.8 2.8L4 9.5a.5.5 0 01-.7-.7L8.5 3.5"/></svg>
                        </ActIcon>
                        <ActIcon label="Vista previa">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="2" y="2" width="10" height="10" rx="1.5"/><path d="M5 6h4M5 8.5h2" strokeLinecap="round"/></svg>
                        </ActIcon>
                        <ActIcon label="Imprimir">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="3" y="1" width="8" height="4" rx="0.5"/><path d="M3 5H2a1 1 0 00-1 1v4a1 1 0 001 1h1"/><path d="M11 5h1a1 1 0 011 1v4a1 1 0 01-1 1h-1"/><rect x="3" y="8" width="8" height="4" rx="0.5"/></svg>
                        </ActIcon>
                        <ActIcon label="Ver asiento">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M1 7s2.2-4.5 6-4.5S13 7 13 7s-2.2 4.5-6 4.5S1 7 1 7z"/><circle cx="7" cy="7" r="1.5"/></svg>
                        </ActIcon>
                        <ActIcon label="Reenviar correo">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="1" y="3" width="12" height="8" rx="1.5"/><path d="M1 3l6 5 6-5"/></svg>
                        </ActIcon>
                        <ActIcon label="Anular" color="'#E24B4A'" hoverBg="'rgba(226,75,74,.08)'">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="7" cy="7" r="5.5"/><path d="M4.5 4.5l5 5"/></svg>
                        </ActIcon>
                      </>)}
                      {/* Anulado */}
                      {op.estado === 'Anulado' && (
                        <ActIcon label="Recuperar" color="'#1D9E75'" hoverBg="'rgba(29,158,117,.08)'">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M12 2v4H8"/><path d="M2 12v-4h4"/><path d="M11.6 8A5 5 0 1 0 10.5 4.5"/></svg>
                        </ActIcon>
                      )}
                      {/* Contabilizado */}
                      {(op.estado === 'Contabilizado' || op.estado === 'Borrador') && (
                        <ActIcon label="Ver" onClick={()=>setModalOp(op)}>
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M1 7s2.2-4.5 6-4.5S13 7 13 7s-2.2 4.5-6 4.5S1 7 1 7z"/><circle cx="7" cy="7" r="1.5"/></svg>
                        </ActIcon>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
            {(totalCRC > 0 || totalUSD > 0) && (
              <tfoot>
                <tr style={{ borderTop:`2px solid ${C.n500}`, background:'#F9F9F9' }}>
                  <td colSpan={4} style={{ padding:'8px 12px', fontWeight:600, fontSize:12, fontFamily:F, textAlign:'right' }}>Totales</td>
                  <td/>
                  <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                      {totalCRC > 0 && <div style={{ display:'grid', gridTemplateColumns:'14px 1fr', gap:4, width:'100%' }}><span style={{ color:C.n700, fontSize:11 }}>₡</span><span style={{ fontWeight:700, fontSize:12, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmt2(totalCRC)}</span></div>}
                      {totalUSD > 0 && <div style={{ display:'grid', gridTemplateColumns:'14px 1fr', gap:4, width:'100%' }}><span style={{ color:C.n700, fontSize:11 }}>$</span><span style={{ fontWeight:700, fontSize:12, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmt2(totalUSD)}</span></div>}
                    </div>
                  </td>
                  <td/><td/><td/>
                </tr>
              </tfoot>
            )}
        </table>
      </div>

      {/* Footer */}
      <div style={{ background:'#FFFFFF', borderTop:`1px solid ${C.n500}`, padding:'8px 24px', flexShrink:0 }}>
        <Pagination page={paginaActual} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      {modalOp      && <GestionModal op={modalOp} onClose={() => setModalOp(null)} onSave={updated => { setOps(p => p.some(o=>o.id===updated.id) ? p.map(o=>o.id===updated.id?updated:o) : [...p,updated]); setModalOp(null); }}/>}
      {modalMasivo  && <PagoMasivoModal  onClose={() => setModalMasivo(false)}/>}
      {modalAnticipo && <AnticipoModal   onClose={() => setModalAnticipo(false)}/>}
      {showExportar && (
        <ExportListModal
          title="Cobros / Pagos"
          subtitulo={`${filtered.length} operación${filtered.length===1?'':'es'}`}
          filename="cobros-pagos"
          columns={[
            { key:'consecutivo', label:'Consecutivo' }, { key:'cliente', label:'Cliente / Proveedor' }, { key:'fecha', label:'Fecha' },
            { key:'moneda', label:'Moneda' }, { key:'importe', label:'Importe', align:'right' }, { key:'banco', label:'Banco' }, { key:'estado', label:'Estado' },
          ]}
          rows={filtered.map(op=>({
            consecutivo:`${op.tipo==='Cobro'?'GC':op.tipo==='Pago'?'GP':'AC'}-${op.consecutivo}`, cliente:op.nombreAux,
            fecha:op.fecha?op.fecha.split('-').reverse().join('/'):'00/00/0000', moneda:op.moneda,
            importe:`${op.moneda==='USD'?'$':'₡'} ${fmtNum(op.importe,2)}`, banco:op.banco, estado:op.estado,
          }))}
          onClose={()=>setShowExportar(false)}
        />
      )}
    </div>
  );
}
