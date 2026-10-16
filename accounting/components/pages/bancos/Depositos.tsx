'use client';
import { useState } from 'react';
import { PageHeader } from '../../ui/primitives';
import { C, PAGE_PAD, radius, TABLA } from '../../ui/tokens';
import { fmtNum } from '../../ui/formato';
import { Pagination } from '../../ui/tabla';
import { BotonExportarUnico, ExportListModal } from '../../ui/exportar';
import { MoneyHeaderCells, MoneyCells, MoneyCellsStack } from '../../ui/montos';
import { SearchInput, FilterDropdown } from '../../ui/filtros';
import { NuevoDepositoModal } from './depositos/NuevoDepositoModal';
import { BRAND, CUENTAS_EFECTIVO, DEPOSITOS_INIT, type Deposito, ESTADO_STYLE, F, fmt2 } from './depositos/datos';
import { FechasFilter, Pill } from './depositos/piezas';

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Depositos() {
  const [deps, setDeps]     = useState<Deposito[]>(DEPOSITOS_INIT);
  const [showNew, setShowNew] = useState(false);
  const [showExportar, setShowExportar] = useState(false);
  const [searchQ, setSearch] = useState('');
  const [filtFecha, setFiltFecha] = useState({from:'',to:''});
  const [filtCuenta, setFiltCuenta] = useState<Set<string>>(new Set());
  const [filtBanco, setFiltBanco] = useState<Set<string>>(new Set());
  const [filtEstado, setFiltEstado] = useState<Set<string>>(new Set());
  const [filtMoneda, setFiltMoneda] = useState<Set<string>>(new Set());
  const [filtUsuario, setFiltUsuario] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = deps.filter(d => {
    if (searchQ && !d.consecutivo.toLowerCase().includes(searchQ.toLowerCase())) return false;
    if (filtEstado.size > 0 && !filtEstado.has(d.estado)) return false;
    if (filtCuenta.size > 0 && !filtCuenta.has(d.cuentaOrigen)) return false;
    if (filtBanco.size > 0 && ![...filtBanco].some(b => d.bancoDestino.includes(b))) return false;
    if (filtMoneda.size > 0 && !filtMoneda.has(d.moneda)) return false;
    if (filtUsuario.size > 0 && !filtUsuario.has(d.usuario)) return false;
    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginaActual = Math.min(page, totalPaginas);
  const paginated = filtered.slice((paginaActual-1)*pageSize, paginaActual*pageSize);

  const totalCRC = filtered.filter(d=>d.moneda==='CRC').reduce((s,d)=>s+d.importe,0);
  const totalUSD = filtered.filter(d=>d.moneda==='USD').reduce((s,d)=>s+d.importe,0);

  const IcEdit  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-9 9H2v-3l9-9z"/></svg>;
  const IcPrint = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6V2h8v4"/><rect x="1" y="6" width="14" height="6" rx="1.5"/><path d="M4 9v5h8V9"/></svg>;

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#F9F9F9' }}>
      {/* Header */}
      <PageHeader title="Depósitos en efectivo">
        <BotonExportarUnico onClick={()=>setShowExportar(true)}/>
        <button onClick={()=>setShowNew(true)} style={{ height:34, padding:'0 14px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:F, display:'flex', alignItems:'center', gap:6 }}>
          + Nuevo depósito
        </button>
      </PageHeader>

      {/* Filtros */}
      <div style={{ background:'#FFFFFF', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px', display:'flex', gap:10, alignItems:'center', flexShrink:0, flexWrap:'wrap' }}>
        <SearchInput value={searchQ} onChange={setSearch} placeholder="Buscar por consecutivo…" width={220} />
        <FechasFilter value={filtFecha} onChange={setFiltFecha} onClear={()=>setFiltFecha({from:'',to:''})}/>
        <FilterDropdown label="Estado" options={['Pendiente','Contabilizada','Anulados']} selected={filtEstado} onApply={setFiltEstado} onClear={()=>setFiltEstado(new Set())}/>
        <FilterDropdown label="Cuenta origen" options={CUENTAS_EFECTIVO} selected={filtCuenta} onApply={setFiltCuenta} onClear={()=>setFiltCuenta(new Set())}/>
        <FilterDropdown label="Banco" options={['BNCR','BAC','BCR']} selected={filtBanco} onApply={setFiltBanco} onClear={()=>setFiltBanco(new Set())}/>
        <FilterDropdown label="Moneda" options={['CRC','USD']} selected={filtMoneda} onApply={setFiltMoneda} onClear={()=>setFiltMoneda(new Set())}/>
        <FilterDropdown label="Usuario" options={['jperez','sblandon','yader','glopez']} selected={filtUsuario} onApply={setFiltUsuario} onClear={()=>setFiltUsuario(new Set())}/>
      </div>

      {/* Table */}
      <div style={{ flex:1, overflowY:'auto', background:'#FFFFFF', padding:`0 ${PAGE_PAD-12}px` }}>
        <table className="tabla" style={TABLA.table}>
          <thead style={{ position:'sticky', top:0, background:'#FFFFFF', zIndex:2 }}>
            <tr style={TABLA.headRow}>
              <th style={{ width:16 }}/>
              {['Consecutivo','Fecha','Estado','Cuenta origen','Banco destino','Referencia','Moneda'].map(h=>(
                <th key={h} style={TABLA.th}>{h}</th>
              ))}
              <MoneyHeaderCells label="Importe"/>
              {['Usuario','Acciones'].map(h=>(
                <th key={h} style={TABLA.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map(d=>{
              const sym=d.moneda==='USD'?'$':'₡';
              const [stColor, stBg] = ESTADO_STYLE[d.estado];
              return (
                <tr key={d.id} style={{ borderBottom:'1px solid #ECECEC' }}
                  onMouseEnter={e=>(e.currentTarget.style.background=C.n200)}
                  onMouseLeave={e=>(e.currentTarget.style.background='#FFFFFF')}>
                  <td/>
                  <td style={{ padding:'8px 12px' }}><span style={{ color:BRAND, fontFamily:F, cursor:'pointer' }}>{d.consecutivo}</span></td>
                  <td style={{ padding:'8px 12px' }}>{d.fecha}</td>
                  <td style={{ padding:'8px 12px' }}><Pill color={stColor} bg={stBg}>{d.estado}</Pill></td>
                  <td style={{ padding:'8px 12px', color:'#0F0F0F', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={d.cuentaOrigen}>{d.cuentaOrigen}</td>
                  <td style={{ padding:'8px 12px', color:'#0F0F0F', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={d.bancoDestino}>{d.bancoDestino}</td>
                  <td style={{ padding:'8px 12px' }}>{d.referencia}</td>
                  <td style={{ padding:'8px 12px' }}><span style={{ fontSize:10, padding:'2px 7px', background:C.n200, borderRadius:4 }}>{d.moneda} {sym}</span></td>
                  <MoneyCells sym={sym} value={fmt2(d.importe)}/>
                  <td style={{ padding:'8px 12px' }}>{d.usuario}</td>
                  <td style={{ padding:'8px 12px' }}>
                    <div style={{ display:'flex', gap:5 }}>
                      <button style={{ width:26, height:26, borderRadius:5, border:`1px solid ${C.n500}`, background:'#FFFFFF', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.n700 }}><IcEdit/></button>
                      <button style={{ width:26, height:26, borderRadius:5, border:`1px solid ${C.n500}`, background:'#FFFFFF', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.n700 }}><IcPrint/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop:`2px solid ${C.n500}`, background:'#F9F9F9' }}>
              <td colSpan={8} style={{ padding:'8px 12px', fontWeight:600, fontSize:12, fontFamily:F, textAlign:'right' }}>Totales</td>
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

      {showNew && <NuevoDepositoModal onClose={()=>setShowNew(false)} onSave={d=>{setDeps(p=>[d,...p]);}}/>}
      {showExportar && (
        <ExportListModal
          title="Depósitos en efectivo"
          subtitulo={`${filtered.length} depósito${filtered.length===1?'':'s'}`}
          filename="depositos"
          columns={[
            { key:'consecutivo', label:'Consecutivo' }, { key:'fecha', label:'Fecha' }, { key:'cuentaOrigen', label:'Cuenta origen' },
            { key:'bancoDestino', label:'Banco destino' }, { key:'referencia', label:'Referencia' },
            { key:'importe', label:'Importe', align:'right' }, { key:'usuario', label:'Usuario' }, { key:'estado', label:'Estado' },
          ]}
          rows={filtered.map(d=>({
            consecutivo:d.consecutivo, fecha:d.fecha, cuentaOrigen:d.cuentaOrigen, bancoDestino:d.bancoDestino,
            referencia:d.referencia, importe:`${d.moneda==='USD'?'$':'₡'} ${fmtNum(d.importe,2)}`, usuario:d.usuario, estado:d.estado,
          }))}
          onClose={()=>setShowExportar(false)}
        />
      )}
    </div>
  );
}
