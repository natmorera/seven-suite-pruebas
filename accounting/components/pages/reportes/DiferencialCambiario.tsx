'use client';
import { useState } from 'react';
import { PageHeader } from '../../ui/primitives';
import { C, radius, TABLA } from '../../ui/tokens';
import { BotonExportarUnico, ExportListModal } from '../../ui/exportar';
import { SearchInput } from '../../ui/filtros';
import { Monto } from '../../ui/montos';
import { type AsientoDC, BRAND, ESTADO_STYLE, F, GREEN, MOCK, RED, type TipoCuenta, fmt } from './diferencialCambiario/datos';
import { ModalCrearMovimiento, ModalDetalleAsiento } from './diferencialCambiario/modales';

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DiferencialCambiario() {
  const [movs, setMovs] = useState<AsientoDC[]>(MOCK);
  const [tipoCuenta, setTipoCuenta] = useState<TipoCuenta>('cobrar');
  const [libro,   setLibro]   = useState('');
  const [busq,    setBusq]    = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editandoNro, setEditandoNro] = useState<string|null>(null);
  const [detalleNro, setDetalleNro] = useState<string|null>(null);
  const [showExportar, setShowExportar] = useState(false);
  const [toast, setToast] = useState<string|null>(null);

  const TIPOS: {value:TipoCuenta; label:string}[] = [
    {value:'cobrar', label:'Cuentas x Cobrar'},
    {value:'pagar',  label:'Cuentas x Pagar'},
    {value:'bancos', label:'Cuentas Bancarias'},
  ];

  const LIBROS = [
    { value:'', label:'Libros' },
    { value:'O', label:'Operaciones (O)' },
    { value:'G', label:'General (G)' },
  ];

  // Issue #26: el filtro "Aplicar a cuentas por" ahora sí filtra los datos;
  // antes el estado existía pero nunca se aplicaba sobre MOCK.
  const filtrados = movs.filter(a =>
    a.tipoCuenta === tipoCuenta &&
    (!libro || a.libro === libro) &&
    (!busq || a.descripcion.toLowerCase().includes(busq.toLowerCase()) || a.titulo.toLowerCase().includes(busq.toLowerCase()))
  );
  const totalDebe  = filtrados.reduce((s,a)=>s+a.debe,0);
  const totalHaber = filtrados.reduce((s,a)=>s+a.haber,0);
  const cuadra = Math.abs(totalDebe-totalHaber) < 0.005;

  // Issue #25: acciones Contabilizar / Anular por asiento completo (todas sus líneas)
  function contabilizarAsiento(nro:string) {
    setMovs(p=>p.map(m=>m.nroAsiento===nro && m.estado==='Pendiente' ? {...m, estado:'Contabilizado'} : m));
    setToast(`Asiento ${nro} contabilizado`);
  }
  function anularAsiento(nro:string) {
    setMovs(p=>p.map(m=>m.nroAsiento===nro && m.estado!=='Anulado' ? {...m, estado:'Anulado'} : m));
    setToast(`Asiento ${nro} anulado`);
  }

  const lineasDetalle = detalleNro ? movs.filter(m=>m.nroAsiento===detalleNro) : [];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', fontFamily:F, background:'#FFFFFF', overflow:'hidden' }}>

      {/* ── Header ── */}
      <PageHeader title="Diferencial cambiario">
        <BotonExportarUnico onClick={()=>setShowExportar(true)}/>
        {/* Crear movimiento */}
        <button onClick={()=>setShowModal(true)}
          style={{ height:32, padding:'0 14px', border:'none', borderRadius:radius.md,
          background:BRAND, cursor:'pointer', fontSize:12, fontFamily:F, color:'#FFFFFF', fontWeight:500,
          display:'flex', alignItems:'center', gap:6 }}>
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round">
            <path d="M7 2v10M2 7h10"/>
          </svg>
          Nuevo ajuste
        </button>
      </PageHeader>

      {/* ── Barra filtros - estilo Figma ── */}
      <div style={{ background:'#FFFFFF', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px',
        display:'flex', alignItems:'center', gap:10, flexShrink:0, flexWrap:'wrap' }}>

        {/* Buscar */}
        <SearchInput value={busq} onChange={setBusq} placeholder="Buscar por descripción…" width={200} />

        {/* Libros dropdown */}
        <div style={{ position:'relative' }}>
          <select value={libro} onChange={e=>setLibro(e.target.value)}
            style={{ height:32, padding:'0 28px 0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md,
              fontSize:12, fontFamily:F, outline:'none', appearance:'none', background:'#FFFFFF', cursor:'pointer', color:libro?BRAND:'#757575' }}>
            {LIBROS.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <svg style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
            width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#757575" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3.5 5.25L7 8.75L10.5 5.25"/>
          </svg>
        </div>

        {/* Aplicar a cuentas por: radios - Issue #26: ahora sí filtra */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginLeft:8 }}>
          <span style={{ fontSize:12, color:'#757575', whiteSpace:'nowrap', fontFamily:F }}>Aplicar a cuentas por:</span>
          {TIPOS.map(opt=>(
            <label key={opt.value} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12,
              color:tipoCuenta===opt.value?BRAND:'#757575', cursor:'pointer', whiteSpace:'nowrap', fontFamily:F }}>
              <span onClick={()=>setTipoCuenta(opt.value)}
                style={{ width:14,height:14,borderRadius:'50%',border:`2px solid ${tipoCuenta===opt.value?BRAND:'#ECECEC'}`,
                  background:tipoCuenta===opt.value?BRAND:'#FFFFFF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor:'pointer' }}>
                {tipoCuenta===opt.value&&<span style={{ width:4,height:4,borderRadius:'50%',background:'#FFFFFF' }}/>}
              </span>
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* ── Tabla ── */}
      {/* Ancho de columna fijo vía <colgroup> + tableLayout:'fixed': antes el
          ancho solo se declaraba en el <th> y el navegador igual recalculaba
          las columnas según el contenido de cada fila (auto layout) - si en
          una página el texto de una columna del medio (p.ej. "Cuenta" o
          "Descripción") era más corto, esa columna se achicaba y las demás se
          reacomodaban, desordenando la tabla entre pantallas/filtros
          distintos. Con layout fijo, el ancho queda estable siempre y el
          contenido largo se trunca con "…" en vez de descuadrar todo. */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 24px' }}>
        <table className="tabla" style={{ ...TABLA.table, tableLayout:'fixed' }}>
          <colgroup>
            <col style={{ width:130 }}/><col style={{ width:90 }}/><col style={{ width:36 }}/><col/>
            <col style={{ width:150 }}/><col/><col style={{ width:110 }}/><col style={{ width:110 }}/>
            <col style={{ width:100 }}/><col style={{ width:110 }}/>
          </colgroup>
          <thead style={{ position:'sticky', top:0, zIndex:1, background:'#FFFFFF' }}>
            <tr style={TABLA.headRow}>
              {[['No. Asiento','left'],['Fecha','left'],['L.','left'],['Título','left'],['Cuenta','left'],['Descripcion','left'],['Debe','right'],['Haber','right'],['Estado','left'],['Acciones','left']]
                .map(([h,align],i)=>(
                  <th key={i} style={{ ...TABLA.th, textAlign:align as 'left'|'right', overflow:'hidden', textOverflow:'ellipsis' }}>{h}</th>
                ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={10} style={TABLA.empty}>Sin movimientos para los filtros seleccionados.</td></tr>
            ) : filtrados.map((a,i)=>{
              const [ec, ebg] = ESTADO_STYLE[a.estado];
              return (
              <tr key={a.id} style={{ borderBottom:'1px solid #ECECEC', background:i%2===1?'#FCFCFA':'#FFFFFF' }}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#FFFBF2'}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background= i%2===1?'#FCFCFA':'#FFFFFF'}>
                <td style={{ padding:'8px 12px', color:BRAND, fontVariantNumeric:'tabular-nums', fontFamily:F }}>{a.nroAsiento}</td>
                <td style={{ padding:'8px 12px', whiteSpace:'nowrap', fontFamily:F }}>{a.fecha}</td>
                <td style={{ padding:'8px 12px', fontFamily:F }}>
                  <span style={{ fontSize:11, padding:'2px 6px', borderRadius:4, fontWeight:600,
                    background:a.tipo==='G'?'#FFF8EC':'#E6F1FB',
                    color:a.tipo==='G'?BRAND:'#185FA5' }}>{a.tipo}</span>
                </td>
                <td title={a.titulo} style={{ padding:'8px 12px', color:'#0F0F0F', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:F }}>{a.titulo}</td>
                <td style={{ padding:'8px 12px', fontFamily:F, overflow:'hidden' }}>
                  <span style={{ display:'block', color:'#757575', fontVariantNumeric:'tabular-nums' }}>{a.cuenta}</span>
                  {/* Issue: el nombre de la cuenta/cliente se cortaba a una sola línea con "...";
                      ahora permite 2 líneas antes de truncar, para que nombres largos se lean completos. */}
                  <span title={a.cuentaNombre} style={{ display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
                    color:'#0F0F0F', whiteSpace:'normal', lineHeight:1.3 }}>{a.cuentaNombre}</span>
                </td>
                <td title={a.descripcion} style={{ padding:'8px 12px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:F }}>{a.descripcion}</td>
                <td style={{ padding:'8px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontFamily:F, whiteSpace:'nowrap' }}>
                  {a.debe>0
                    ? <Monto sym="₡" valor={fmt(a.debe)}/>
                    : <span>-</span>}
                </td>
                <td style={{ padding:'8px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontFamily:F, whiteSpace:'nowrap' }}>
                  {a.haber>0
                    ? <Monto sym="₡" valor={fmt(a.haber)}/>
                    : <span>-</span>}
                </td>
                <td style={{ padding:'8px 12px' }}>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:radius.lg, fontWeight:600, background:ebg, color:ec, whiteSpace:'nowrap' }}>{a.estado}</span>
                </td>
                <td style={{ padding:'8px 12px' }}>
                  <div style={{ display:'flex', gap:4 }}>
                    <button title="Ver detalle" onClick={()=>setDetalleNro(a.nroAsiento)}
                      style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:'#757575', display:'flex', alignItems:'center', justifyContent:'center' }}
                      onMouseEnter={e=>(e.currentTarget.style.background='#ECECEC')} onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>
                    </button>
                    {a.estado==='Pendiente' && (
                      <button title="Editar" onClick={()=>setEditandoNro(a.nroAsiento)}
                        style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:'#757575', display:'flex', alignItems:'center', justifyContent:'center' }}
                        onMouseEnter={e=>(e.currentTarget.style.background='#ECECEC')} onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-8 8-3.5 1 1-3.5 7.5-7.5z"/></svg>
                      </button>
                    )}
                    {a.estado==='Pendiente' && (
                      <button title="Contabilizar" onClick={()=>contabilizarAsiento(a.nroAsiento)}
                        style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:GREEN, display:'flex', alignItems:'center', justifyContent:'center' }}
                        onMouseEnter={e=>(e.currentTarget.style.background='rgba(29,158,117,.1)')} onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 8.5l3 3 7-7"/></svg>
                      </button>
                    )}
                    {a.estado!=='Anulado' && (
                      <button title="Anular" onClick={()=>anularAsiento(a.nroAsiento)}
                        style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:RED, display:'flex', alignItems:'center', justifyContent:'center' }}
                        onMouseEnter={e=>(e.currentTarget.style.background='rgba(226,75,74,.1)')} onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );})}
          </tbody>
          <tfoot>
            <tr style={{ background:'#F9F9F9', borderTop:`2px solid ${C.n500}` }}>
              <td colSpan={6} style={{ padding:'8px 12px', textAlign:'right', fontWeight:600, fontFamily:F, color:'#0F0F0F' }}>
                Diferencia total {!cuadra && <span style={{ fontWeight:400, color:'#E07B00' }}>· no cuadra</span>}
              </td>
              <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:700, fontVariantNumeric:'tabular-nums', fontFamily:F, whiteSpace:'nowrap' }}>
                <Monto sym="₡" valor={fmt(totalDebe)} style={{ color:BRAND }}/>
              </td>
              <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:700, fontVariantNumeric:'tabular-nums', fontFamily:F, whiteSpace:'nowrap' }}>
                <Monto sym="₡" valor={fmt(totalHaber)}/>
              </td>
              <td colSpan={2}/>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Modales */}
      {showModal && <ModalCrearMovimiento onClose={()=>setShowModal(false)}/>}
      {editandoNro && (()=>{
        const m = movs.find(x=>x.nroAsiento===editandoNro);
        if (!m) return null;
        const tipoLabel = TIPOS.find(t=>t.value===m.tipoCuenta)?.label ?? 'Cuentas por cobrar';
        return (
          <ModalCrearMovimiento onClose={()=>setEditandoNro(null)}
            editar={{ fecha:'', tipoCuenta:tipoLabel, tc:'' }}/>
        );
      })()}
      {detalleNro && <ModalDetalleAsiento lineas={lineasDetalle} onClose={()=>setDetalleNro(null)}/>}
      {showExportar && (
        <ExportListModal
          reporteKey="diferencial"
          title="Diferencial cambiario"
          subtitulo={`${TIPOS.find(t=>t.value===tipoCuenta)?.label} · ${filtrados.length} movimiento${filtrados.length===1?'':'s'}`}
          filename="diferencial-cambiario"
          columns={[
            { key:'nroAsiento', label:'No. Asiento' }, { key:'fecha', label:'Fecha' }, { key:'libro', label:'Libro' },
            { key:'titulo', label:'Título' }, { key:'cuenta', label:'Cuenta' }, { key:'descripcion', label:'Descripción' },
            { key:'debe', label:'Debe', align:'right' }, { key:'haber', label:'Haber', align:'right' }, { key:'estado', label:'Estado' },
          ]}
          rows={filtrados.map(a=>({
            nroAsiento:a.nroAsiento, fecha:a.fecha, libro:a.libro, titulo:a.titulo,
            cuenta:`${a.cuenta} · ${a.cuentaNombre}`, descripcion:a.descripcion,
            debe: a.debe>0?fmt(a.debe):'-', haber: a.haber>0?fmt(a.haber):'-', estado:a.estado,
          }))}
          onClose={()=>setShowExportar(false)}
        />
      )}
      {toast && (
        <div style={{ position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)', background:'#0F0F0F', color:'#FFFFFF',
          padding:'10px 18px', borderRadius:radius.md, fontSize:12, fontFamily:F, zIndex:900 }}
          onAnimationEnd={()=>{}}>
          {toast}
          <button onClick={()=>setToast(null)} style={{ marginLeft:10, background:'none', border:'none', color:'#FFFFFF', cursor:'pointer', opacity:.7 }}>×</button>
        </div>
      )}
    </div>
  );
}
