'use client';
import { useState } from 'react';
import { Toast, PageHeader } from '@/components/ui/primitives';
import { C, USUARIO_ACTUAL, PAGE_PAD, radius, TABLA } from '@/components/ui/tokens';
import { fmtNum, fmtDate } from '@/components/ui/formato';
import { Pagination } from '@/components/ui/tabla';
import { BotonExportarUnico, ExportListModal } from '@/components/ui/exportar';
import { MoneyHeaderCells, MoneyCells, MoneyCellsStack } from '@/components/ui/montos';
import { SearchInput, FilterDropdown } from '@/components/ui/filtros';
import { DetalleConciliacion } from './conciliacionBancaria/DetalleConciliacion';
import { VistaPreviaModal } from './conciliacionBancaria/VistaPreviaModal';
import { BRAND, CONCILIACIONES_INIT, type Conciliacion, ESTADO_CON_STYLE, F, fmt2, sym } from './conciliacionBancaria/datos';
import { NuevaConciliacionModal } from './conciliacionBancaria/modales';
import { Pill } from './conciliacionBancaria/piezas';

// ── Pantalla principal: lista ───────────────────────────────────────────────────────────────
export default function ConciliacionBancaria() {
  const [cons, setCons]     = useState<Conciliacion[]>(CONCILIACIONES_INIT);
  const [selectedId, setSelectedId] = useState<number|null>(null);
  const [showNueva, setShowNueva] = useState(false);
  const [showExportar, setShowExportar] = useState(false);
  const [vistaPreviaFor, setVistaPreviaFor] = useState<Conciliacion|null>(null);
  const [searchQ, setSearch] = useState('');
  const [filtEstado, setFiltEstado] = useState<Set<string>>(new Set());
  const [filtCuenta, setFiltCuenta] = useState<Set<string>>(new Set());
  const [filtMoneda, setFiltMoneda] = useState<Set<string>>(new Set());
  const [filtUsuario, setFiltUsuario] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string|null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const selectedCon = cons.find(c=>c.id===selectedId) ?? null;

  function actualizar(id:number, patch:Partial<Conciliacion>){
    setCons(prev => prev.map(c => c.id===id ? { ...c, ...patch } : c));
  }

  if (selectedCon) {
    return (
      <DetalleConciliacion
        con={selectedCon}
        onBack={()=>setSelectedId(null)}
        onUpdate={patch=>actualizar(selectedCon.id, patch)}
        onCerrar={()=>{
          actualizar(selectedCon.id, { estado:'Cerrada', cerradaPor:USUARIO_ACTUAL, fechaCierre: fmtDate(new Date()) });
        }}
      />
    );
  }

  const filtered = cons.filter(c => {
    if (searchQ && !c.consecutivo.toLowerCase().includes(searchQ.toLowerCase())) return false;
    if (filtEstado.size > 0 && !filtEstado.has(c.estado)) return false;
    if (filtCuenta.size > 0 && !filtCuenta.has(c.cuentaBancaria)) return false;
    if (filtMoneda.size > 0 && !filtMoneda.has(c.moneda)) return false;
    if (filtUsuario.size > 0 && !filtUsuario.has(c.usuario)) return false;
    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginaActual = Math.min(page, totalPaginas);
  const paginated = filtered.slice((paginaActual-1)*pageSize, paginaActual*pageSize);

  const totalBancoCRC  = filtered.filter(c=>c.moneda!=='USD').reduce((s,c)=>s+c.saldoBanco,0);
  const totalBancoUSD  = filtered.filter(c=>c.moneda==='USD').reduce((s,c)=>s+c.saldoBanco,0);
  const totalLibrosCRC = filtered.filter(c=>c.moneda!=='USD').reduce((s,c)=>s+c.saldoLibros,0);
  const totalLibrosUSD = filtered.filter(c=>c.moneda==='USD').reduce((s,c)=>s+c.saldoLibros,0);

  const IcEdit  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-9 9H2v-3l9-9z"/></svg>;
  const IcPrint = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6V2h8v4"/><rect x="1" y="6" width="14" height="6" rx="1.5"/><path d="M4 9v5h8V9"/></svg>;

  function crearConciliacion(data:{cuenta:string;moneda:'CRC'|'USD';desde:string;hasta:string;saldo:number}){
    const nums = cons.map(c=>parseInt(c.consecutivo.replace('CON-',''))||0);
    const next = Math.max(0,...nums) + 1;
    const fromIso = (iso:string) => { const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m?`${m[3]}/${m[2]}/${m[1].slice(2)}`:iso; };
    const nueva: Conciliacion = {
      id: Date.now(), consecutivo:`CON-${String(next).padStart(3,'0')}`, estado:'Sin saldo',
      cuentaBancaria: data.cuenta, cuentaCode: data.moneda==='USD'?'12002004':'10020001', moneda: data.moneda,
      desde: fromIso(data.desde), hasta: fromIso(data.hasta), saldoBanco:data.saldo, saldoLibros:0, diferencia:0,
      saldoInicial:0, usuario:USUARIO_ACTUAL, movimientos:[],
    };
    setCons(p=>[nueva,...p]);
    setToast(`Conciliación ${nueva.consecutivo} creada`);
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#F9F9F9' }}>
      <PageHeader title="Conciliaciones bancarias">
        <BotonExportarUnico onClick={()=>setShowExportar(true)}/>
        <button onClick={()=>setShowNueva(true)} style={{ height:34, padding:'0 14px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:F, display:'flex', alignItems:'center', gap:6 }}>
          + Nueva conciliación
        </button>
      </PageHeader>

      {/* Toolbar */}
      <div style={{ background:'#FFFFFF', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px', display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
        <SearchInput value={searchQ} onChange={setSearch} placeholder="Buscar por consecutivo…" width={220} />
        <FilterDropdown label="Estado" options={['En proceso','Sin saldo','Cerrada']} selected={filtEstado} onApply={setFiltEstado} onClear={()=>setFiltEstado(new Set())}/>
        <FilterDropdown label="Cuenta bancaria" options={[...new Set(cons.map(c=>c.cuentaBancaria))]} selected={filtCuenta} onApply={setFiltCuenta} onClear={()=>setFiltCuenta(new Set())}/>
        <FilterDropdown label="Moneda" options={['CRC','USD']} selected={filtMoneda} onApply={setFiltMoneda} onClear={()=>setFiltMoneda(new Set())}/>
        <FilterDropdown label="Usuario" options={['jperez','sblandon','yader']} selected={filtUsuario} onApply={setFiltUsuario} onClear={()=>setFiltUsuario(new Set())}/>
      </div>

      {/* Tabla */}
      <div style={{ flex:1, overflowY:'auto', background:'#FFFFFF', padding:`0 ${PAGE_PAD-12}px` }}>
        <table className="tabla" style={TABLA.table}>
          <thead style={{ position:'sticky', top:0, background:'#FFFFFF', zIndex:2 }}>
            <tr style={TABLA.headRow}>
              {['Consecutivo','Estado','Cuenta bancaria','Desde','Hasta','Moneda'].map(h=>(
                <th key={h} style={TABLA.th}>{h}</th>
              ))}
              <MoneyHeaderCells label="Saldo banco"/>
              <MoneyHeaderCells label="Saldo libros"/>
              <MoneyHeaderCells label="Diferencia"/>
              {['Usuario','Acciones'].map(h=>(
                <th key={h} style={TABLA.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map(c => {
              const [stC,stB] = ESTADO_CON_STYLE[c.estado];
              const difColor = c.diferencia === 0 ? C.success : C.error;
              const s = sym(c.moneda);
              return (
                <tr key={c.id} onClick={()=>setSelectedId(c.id)} style={{ borderBottom:'1px solid #ECECEC', cursor:'pointer' }}
                  onMouseEnter={e=>(e.currentTarget.style.background=C.n200)}
                  onMouseLeave={e=>(e.currentTarget.style.background='#FFFFFF')}>
                  <td style={{ padding:'8px 12px' }}><span style={{ color:BRAND, fontFamily:F, textDecoration:'underline' }}>{c.consecutivo}</span></td>
                  <td style={{ padding:'8px 12px' }}><Pill color={stC} bg={stB}>{c.estado}</Pill></td>
                  <td style={{ padding:'8px 12px', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={`${c.cuentaCode} ${c.cuentaBancaria}`}>{c.cuentaCode} {c.cuentaBancaria}</td>
                  <td style={{ padding:'8px 12px' }}>{c.desde}</td>
                  <td style={{ padding:'8px 12px' }}>{c.hasta}</td>
                  <td style={{ padding:'8px 12px' }}><span style={{ fontSize:10.5, padding:'2px 7px', background:C.n200, borderRadius:4 }}>{c.moneda} {s}</span></td>
                  <MoneyCells sym={s} value={c.saldoBanco > 0 ? fmt2(c.saldoBanco) : '-'}/>
                  <MoneyCells sym={s} value={c.saldoLibros > 0 ? fmt2(c.saldoLibros) : '-'}/>
                  <MoneyCells sym={s} value={c.saldoBanco > 0 ? fmt2(c.diferencia) : '-'} color={c.saldoBanco>0?difColor:undefined}/>
                  <td style={{ padding:'8px 12px' }}>{c.usuario}</td>
                  <td onClick={e=>e.stopPropagation()} style={{ padding:'10px 12px' }}>
                    <div style={{ display:'flex', gap:4 }}>
                      <button title="Abrir" onClick={()=>setSelectedId(c.id)} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.n700, display:'flex', alignItems:'center', justifyContent:'center' }} onMouseEnter={e=>(e.currentTarget.style.background=C.n200)} onMouseLeave={e=>(e.currentTarget.style.background='none')}><IcEdit/></button>
                      <button title="Vista previa / imprimir" onClick={()=>setVistaPreviaFor(c)} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.n700, display:'flex', alignItems:'center', justifyContent:'center' }} onMouseEnter={e=>(e.currentTarget.style.background=C.n200)} onMouseLeave={e=>(e.currentTarget.style.background='none')}><IcPrint/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {/* Totales */}
            <tr style={{ background:'#F9F9F9', borderTop:`2px solid ${C.n500}` }}>
              <td colSpan={6} style={{ padding:'8px 12px' }}/>
              <MoneyCellsStack bold rows={[
                ...(totalBancoCRC>0 ? [{sym:'₡', value:fmt2(totalBancoCRC)}] : []),
                ...(totalBancoUSD>0 ? [{sym:'$', value:fmt2(totalBancoUSD)}] : []),
              ]}/>
              <MoneyCellsStack bold rows={[
                ...(totalLibrosCRC>0 ? [{sym:'₡', value:fmt2(totalLibrosCRC)}] : []),
                ...(totalLibrosUSD>0 ? [{sym:'$', value:fmt2(totalLibrosUSD)}] : []),
              ]}/>
              <td colSpan={2}/>
              <td colSpan={2}/>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ background:'#FFFFFF', borderTop:`1px solid ${C.n500}`, padding:'8px 24px', flexShrink:0 }}>
        <Pagination page={paginaActual} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      {showNueva && <NuevaConciliacionModal onClose={()=>setShowNueva(false)} onCreate={crearConciliacion} />}
      {vistaPreviaFor && <VistaPreviaModal con={vistaPreviaFor} onClose={()=>setVistaPreviaFor(null)}/>}
      {toast && <Toast message={toast} type="success" onClose={()=>setToast(null)}/>}
      {showExportar && (
        <ExportListModal
          title="Conciliaciones bancarias"
          subtitulo={`${filtered.length} conciliación${filtered.length===1?'':'es'}`}
          filename="conciliaciones-bancarias"
          columns={[
            { key:'consecutivo', label:'Consecutivo' }, { key:'cuenta', label:'Cuenta bancaria' }, { key:'periodo', label:'Período' },
            { key:'saldoBanco', label:'Saldo banco', align:'right' }, { key:'saldoLibros', label:'Saldo libros', align:'right' },
            { key:'diferencia', label:'Diferencia', align:'right' }, { key:'estado', label:'Estado' },
          ]}
          rows={filtered.map(c=>({
            consecutivo:c.consecutivo, cuenta:c.cuentaBancaria, periodo:`${c.desde} – ${c.hasta}`,
            saldoBanco:`${c.moneda==='USD'?'$':'₡'} ${fmtNum(c.saldoBanco,2)}`,
            saldoLibros:`${c.moneda==='USD'?'$':'₡'} ${fmtNum(c.saldoLibros,2)}`,
            diferencia:`${c.moneda==='USD'?'$':'₡'} ${fmtNum(c.diferencia,2)}`, estado:c.estado,
          }))}
          onClose={()=>setShowExportar(false)}
        />
      )}
    </div>
  );
}
