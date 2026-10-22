'use client';
import { useState } from 'react';
import { Toast } from '@/components/ui/primitives';
import { C, radius, TABLA } from '@/components/ui/tokens';
import { VistaPreviaModal } from './VistaPreviaModal';
import { BRAND, type Conciliacion, ESTADO_CON_STYLE, type EstadoMov, F, MOVIMIENTOS_MOCK, fmt2, sym } from './datos';
import { CerrarConciliacionModal, CorteSaldoModal, ImportarArchivoModal } from './modales';
import { ESTADO_MOV_ICON, Pill } from './piezas';

// ── Vista de detalle de conciliación ─────────────────────────────────────────
export function DetalleConciliacion({ con, onBack, onCerrar, onUpdate }: {
  con:Conciliacion; onBack:()=>void; onCerrar:()=>void; onUpdate:(patch:Partial<Conciliacion>)=>void;
}) {
  const [showImportar,  setShowImportar]  = useState(false);
  const [showCerrar,    setShowCerrar]    = useState(false);
  const [showCorte,     setShowCorte]     = useState(false);
  const [showVista,     setShowVista]     = useState(false);
  const [toast,         setToast]         = useState<string|null>(null);
  const [cargaSaldo,    setCargaSaldo]    = useState('');
  const [cargaDesde,    setCargaDesde]    = useState('2026-06-01');
  const [cargaHasta,    setCargaHasta]    = useState('2026-06-30');
  const [cargaErr,      setCargaErr]      = useState(false);

  // Los movimientos y el saldo viven en el padre (con.movimientos / con.saldoBanco):
  // así el trabajo de conciliar no se pierde al salir y volver a entrar a esta vista.
  const movs = con.movimientos;
  const saldoBanco = con.saldoBanco;

  const enProceso = con.estado === 'En proceso' || con.estado === 'Sin saldo';
  const cerrada   = con.estado === 'Cerrada';
  const s = sym(con.moneda);

  const chequesConc  = movs.filter(m=>m.estado==='Conciliado'&&m.creditos>0);
  const depositosConc = movs.filter(m=>m.estado==='Conciliado'&&m.debitos>0);
  const chequesNoConc  = movs.filter(m=>m.estado!=='Conciliado'&&m.creditos>0);
  const depositosNoConc = movs.filter(m=>m.estado!=='Conciliado'&&m.debitos>0);

  const totalChequesP  = chequesNoConc.reduce((s,m)=>s+m.creditos,0);
  const totalDepositosP = depositosNoConc.reduce((s,m)=>s+m.debitos,0);
  const saldoLibros    = con.saldoLibros;
  const saldoLibrosConcil = saldoBanco - totalChequesP + totalDepositosP;
  const difNoConcil    = saldoLibrosConcil - saldoLibros;

  function toggleMov(id: number) {
    const m = movs.find(x=>x.id===id);
    if(!m || m.estado==='Futuro') return; // ya conciliado en un período futuro: no se puede revertir desde acá
    const nuevos = movs.map(x=>x.id===id ? { ...x, estado: (x.estado==='Conciliado'?'Pendiente':'Conciliado') as EstadoMov } : x);
    onUpdate({ movimientos: nuevos });
  }

  function cargarMovimientos(){
    const saldoNum = parseFloat(cargaSaldo);
    if(!cargaDesde || !cargaHasta || !cargaSaldo || isNaN(saldoNum)){ setCargaErr(true); return; }
    const fromIso = (iso:string) => { const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m?`${m[3]}/${m[2]}/${m[1].slice(2)}`:iso; };
    onUpdate({
      movimientos: MOVIMIENTOS_MOCK.map(m=>({...m})),
      saldoBanco: saldoNum,
      saldoLibros: saldoNum,
      diferencia: 0,
      estado: 'En proceso',
      desde: fromIso(cargaDesde), hasta: fromIso(cargaHasta),
    });
    setToast('Movimientos cargados para el período seleccionado');
  }

  function importar(){
    onUpdate({ movimientos: movs.map(m=> m.estado==='Pendiente' ? { ...m, estado:'Conciliado' as EstadoMov } : m) });
    setToast('Archivo importado: los movimientos que calzaron se marcaron como conciliados');
  }

  function aplicarCorte(fechaCorte:string, saldo:number){
    void fechaCorte;
    onUpdate({
      movimientos: movs.map(m=> m.estado==='Pendiente' ? { ...m, estado:'Conciliado' as EstadoMov } : m),
      saldoBanco: saldo, saldoLibros: saldo, diferencia: 0,
    });
    setToast('Corte de saldo aplicado');
  }

  function cerrarConciliacion(){
    onCerrar();
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', fontFamily:F, background:'#FFFFFF' }}>
      {/* Encabezado */}
      <div style={{ padding:'12px 24px 14px', borderBottom:`1px solid ${C.n500}`, flexShrink:0 }}>
        {/* Breadcrumb */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
          <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', padding:0, color:C.n700, display:'flex', alignItems:'center', gap:6, fontSize:12, fontFamily:F }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M10 12L6 8l4-4"/></svg>
            Conciliación bancaria
          </button>
          <span style={{ fontSize:12, color:C.n500 }}>/</span>
          <span style={{ fontSize:12, color:C.n700, fontWeight:500 }}>{con.consecutivo}</span>
        </div>
        {/* Título + badge + subtítulo, con acciones alineadas a la derecha */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <p style={{ fontSize:17, fontWeight:600, margin:0 }}>{con.cuentaBancaria.includes('BAC')?'BAC San José C.C.':'BNCR 015-004943-0'}</p>
              <Pill color={ESTADO_CON_STYLE[con.estado][0]} bg={ESTADO_CON_STYLE[con.estado][1]}>{con.estado}</Pill>
            </div>
            <span style={{ fontSize:12, color:C.n700 }}>{con.moneda} – {con.moneda==='USD'?'Dólar':'Colón'} · {con.desde} – {con.hasta}</span>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            {cerrada ? (
              <>
                <button onClick={()=>setShowVista(true)} style={{ height:32, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="2" y="2" width="12" height="12" rx="1.5"/><path d="M5 6h6M5 9h4"/></svg> Imprimir reporte
                </button>
                <button disabled title="La conciliación está cerrada; solo lectura" style={{ height:32, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#F9F9F9', cursor:'not-allowed', fontSize:12, display:'flex', alignItems:'center', gap:5, fontFamily:F, color:'#757575' }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3"/><path d="M11 6l-3 4-3-4M8 10V2"/></svg> Importar archivo
                </button>
                <button disabled title="La conciliación está cerrada; solo lectura" style={{ height:32, padding:'0 12px', background:'#ECECEC', color:'#757575', border:'none', borderRadius:radius.md, cursor:'not-allowed', fontSize:12, fontWeight:500, fontFamily:F }}>
                  Cargar movimientos
                </button>
              </>
            ) : (
              <>
                {enProceso && con.movimientos.length > 0 && (
                  <>
                    <button onClick={()=>setShowVista(true)} style={{ height:32, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="2" y="2" width="12" height="12" rx="1.5"/><path d="M5 6h6M5 9h4"/></svg> Imprimir
                    </button>
                    <button onClick={()=>setShowImportar(true)} style={{ height:32, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3"/><path d="M8 10V2M5 5l3-3 3 3"/></svg> Importar archivo
                    </button>
                    <button onClick={()=>setShowCorte(true)} style={{ height:32, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>
                      Corte de saldo
                    </button>
                    <button onClick={()=>setShowCerrar(true)} style={{ height:32, padding:'0 14px', background:C.success, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>
                      Cerrar conciliación
                    </button>
                  </>
                )}
                {(con.estado === 'Sin saldo' || con.movimientos.length === 0) && (
                  <>
                    <button onClick={()=>setShowImportar(true)} style={{ height:32, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>Importar archivo</button>
                    <button onClick={cargarMovimientos} style={{ height:32, padding:'0 14px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Cargar movimientos</button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Banner cerrada */}
      {cerrada && (
        <div style={{ padding:'10px 24px`, background:C.successBg, borderBottom:`1px solid ${C.successBorder}`, display:`flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#1D9E75"/><path d="M5 8l2 2 4-4" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <span style={{ fontSize:12, fontWeight:600, color:C.success, fontFamily:F }}>Conciliación cerrada</span>
          <span style={{ fontSize:12, color:C.success, fontFamily:F }}>Cerrada por {con.cerradaPor ?? '-'} el {con.fechaCierre ?? '-'}. Solo lectura.</span>
        </div>
      )}

      {/* Estado sin saldo */}
      {con.estado === 'Sin saldo' || (enProceso && con.movimientos.length === 0) ? (
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          {/* Campo de saldo según banco */}
          <div style={{ background:C.brandBg, border:`1px solid ${C.brandBd}`, borderRadius:10, padding:'14px 18px', marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <div>
                <p style={{ fontSize:12, color:'#0F0F0F', fontWeight:500, margin:'0 0 6px' }}>Saldo según banco</p>
                <input aria-label="Saldo según banco" type="number" step="0.01" value={cargaSaldo} onChange={e=>{setCargaSaldo(e.target.value);setCargaErr(false);}}
                  style={{ height:36, padding:'0 10px', border:`1px solid ${cargaErr&&!cargaSaldo?C.error:C.n500}`, borderRadius:radius.md, fontSize:13, fontFamily:F, outline:'none', width:160 }}/>
              </div>
              <p style={{ fontSize:12, color:C.n700, marginTop:22, fontFamily:F }}>Ingresá el saldo del estado de cuenta del banco para este período</p>
            </div>
          </div>
          {/* Filtros de carga */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto auto', gap:12, alignItems:'end', marginBottom:20 }}>
            <div>
              <p style={{ fontSize:11, color:C.n700, margin:'0 0 4px' }}>Cuenta bancaria</p>
              <input aria-label="Cuenta bancaria" readOnly value={`${con.cuentaCode} – ${con.cuentaBancaria}`} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', background:C.n200, boxSizing:'border-box' }}/>
            </div>
            <div>
              <p style={{ fontSize:11, color:C.n700, margin:'0 0 4px' }}>Desde <span style={{ color:C.error }}>*</span></p>
              <input aria-label="Desde" type="date" value={cargaDesde} onChange={e=>{setCargaDesde(e.target.value);setCargaErr(false);}} style={{ height:36, padding:'0 10px', border:`1px solid ${cargaErr&&!cargaDesde?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none' }}/>
            </div>
            <div>
              <p style={{ fontSize:11, color:C.n700, margin:'0 0 4px' }}>Hasta <span style={{ color:C.error }}>*</span></p>
              <input aria-label="Hasta" type="date" value={cargaHasta} onChange={e=>{setCargaHasta(e.target.value);setCargaErr(false);}} style={{ height:36, padding:'0 10px', border:`1px solid ${cargaErr&&!cargaHasta?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none' }}/>
            </div>
            <div>
              <p style={{ fontSize:11, color:C.n700, margin:'0 0 4px' }}>Moneda</p>
              <select aria-label="Moneda" value={con.moneda} onChange={e=>onUpdate({moneda:e.target.value})} style={{ height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none' }}>
                <option value="CRC">CRC – Colón</option><option value="USD">USD – Dólar</option>
              </select>
            </div>
            <button onClick={cargarMovimientos} style={{ height:36, padding:'0 16px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:F }}>
              Cargar movimientos
            </button>
          </div>
          {cargaErr && <p style={{ fontSize:11, color:C.error, margin:'-10px 0 16px' }}>Completa saldo, desde y hasta antes de cargar movimientos.</p>}
          <div style={{ textAlign:'center', padding:'40px 0' }}>
            <p style={{ fontSize:14, fontWeight:500, color:'#0F0F0F', marginBottom:8 }}>Sin movimientos en este período</p>
            <p style={{ fontSize:12, color:C.n700, maxWidth:360, margin:'0 auto' }}>Selecciona el rango de fechas y haz clic en &quot;Cargar movimientos&quot;, o importá el archivo del banco para conciliar automáticamente.</p>
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, overflow:'hidden' }}>
          {/* Resumen de conciliación - largo definido, siempre visible, no crece con los movimientos */}
          <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.n500}`, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:24, flexShrink:0 }}>
            {/* Col 1: Transacciones */}
            <div>
              <p style={{ fontSize:11, color:C.n700, margin:'0 0 10px', fontFamily:F }}>Transacciones conciliadas</p>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                <span style={{ color:BRAND, fontSize:12, fontFamily:F }}>Cheques / Créditos</span>
                <span style={{ fontWeight:600, color:BRAND }}>{chequesConc.length}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:12 }}>
                <span style={{ color:BRAND, fontSize:12, fontFamily:F }}>Depósitos / Débitos</span>
                <span style={{ fontWeight:600, color:BRAND }}>{depositosConc.length}</span>
              </div>
              <p style={{ fontSize:11, color:C.n700, margin:'0 0 6px', fontFamily:F }}>Transacciones no conciliadas</p>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                <span style={{ color:'#0F0F0F' }}>Cheques / Créditos</span>
                <span style={{ fontWeight:chequesNoConc.length>0?600:400, color:chequesNoConc.length>0?C.error:'#0F0F0F' }}>{chequesNoConc.length}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                <span style={{ color:'#0F0F0F' }}>Depósitos / Débitos</span>
                <span style={{ fontWeight:depositosNoConc.length>0?600:400, color:depositosNoConc.length>0?C.error:'#0F0F0F' }}>{depositosNoConc.length}</span>
              </div>
            </div>

            {/* Col 2: Saldos */}
            <div style={{ fontSize:12 }}>
              {[
                ['Saldo final según banco', `${s} ${fmt2(saldoBanco)}`,     false],
                ['Cheques pendientes –',   `${s} ${fmt2(totalChequesP)}`,  totalChequesP>0],
                ['Depósitos en tránsito +',`${s} ${fmt2(totalDepositosP)}`,false],
                ['Saldo libros p/concil. –',`${s} ${fmt2(saldoLibrosConcil)}`, false],
                ['Diferencia actual (en vivo)',     `${s} ${fmt2(difNoConcil)}`,    difNoConcil!==0],
              ].map(([l,v,isRed])=>(
                <div key={l as string} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ color: (l as string).includes('pendientes')||(l as string).includes('tránsito') ? BRAND : C.n700 }}>{l as string}</span>
                  <div style={{ display:'flex', alignItems:'baseline', justifyContent:'flex-end', gap:3, minWidth:90 }}>
                    <span style={{ color:'#757575', fontSize:11 }}>{s}</span>
                    <span style={{ fontWeight:(l as string).includes('Diferencia')?700:500, color:isRed?C.error:'#0F0F0F', fontVariantNumeric:'tabular-nums', textAlign:'right' }}>{(v as string).replace(/^[₡$]\s*/,'')}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Col 3: Libros */}
            <div style={{ fontSize:12 }}>
              {[['Saldo libros',`${s} ${fmt2(saldoLibros)}`],['Diferencial inicial (al crear)',`${s} ${fmt2(con.diferencia)}`],['Saldo inicial',`${s} ${fmt2(con.saldoInicial)}`]].map(([l,v])=>(
                <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
                  <span style={{ color:C.n700 }}>{l}</span>
                  <div style={{ display:'flex', alignItems:'baseline', justifyContent:'flex-end', gap:3, minWidth:90 }}>
                    <span style={{ color:'#757575', fontSize:11 }}>{s}</span>
                    <span style={{ fontWeight:500, fontVariantNumeric:'tabular-nums', textAlign:'right' }}>{v.replace(/^[₡$]\s*/,'')}</span>
                  </div>
                </div>
              ))}
              <p style={{ fontSize:10.5, color:C.n700, margin:'6px 0 0' }}>La columna del centro (&quot;Diferencia actual&quot;) es la vigente; esta es el valor con el que se creó la conciliación.</p>
            </div>
          </div>

          {/* Saldo según banco */}
          <div style={{ padding:'10px 24px', display:'flex', alignItems:'center', gap:16, borderBottom:`1px solid ${C.n500}`, background:C.brandBg, flexShrink:0 }}>
            <span style={{ fontSize:12, color:C.n700, fontFamily:F }}>Saldo final según banco</span>
            <input aria-label="Saldo final según banco" type="number" value={saldoBanco} onChange={e=>onUpdate({saldoBanco:+e.target.value})} readOnly={cerrada}
              style={{ height:32, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:7, fontSize:13, fontFamily:F, outline:'none', width:160, fontWeight:600 }}/>
            <span style={{ fontSize:11, color:C.n700, fontFamily:F }}>
              {cerrada ? `Registrado al cerrar · ${con.fechaCierre ?? '-'} por ${con.cerradaPor ?? '-'}` : 'Guardado automáticamente para este periodo'}
            </span>
          </div>

          {/* Tabla movimientos - contenedor propio con scroll, así no se estira toda la pantalla como acordeón cuando hay mucho movimiento */}
          <div style={{ flex:1, minHeight:0, overflowY:'auto' }}>
          <table className="tabla" style={TABLA.table}>
            <thead style={{ position:'sticky', top:0, background:'#FFFFFF', zIndex:2 }}>
              <tr style={TABLA.headRow}>
                <th style={{ ...TABLA.th, width:36 }}>C</th>
                {['Fecha','N° Asiento','Documento','Descripción','Mon.','Débitos','Créditos','Importe CRC'].map(h=>(
                  <th key={h} style={{ ...TABLA.th, textAlign:h==='Débitos'||h==='Créditos'||h==='Importe CRC'?'right':'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movs.map(m => {
                const isCon  = m.estado === 'Conciliado';
                const isFut  = m.estado === 'Futuro';
                return (
                  <tr key={m.id}
                    title={isFut?'Ya conciliado en un período futuro: no se puede modificar desde acá':undefined}
                    style={{ borderBottom:'1px solid #ECECEC', background:isFut?'#EFF6FF':isCon?'rgba(29,158,117,.06)':'#FFFFFF', cursor:(cerrada||isFut)?'default':'pointer' }}
                    onClick={()=>!cerrada&&toggleMov(m.id)}
                    onMouseEnter={e=>!cerrada&&!isFut&&(e.currentTarget.style.background=isCon?'rgba(29,158,117,.12)':C.n200)}
                    onMouseLeave={e=>(e.currentTarget.style.background=isFut?'#EFF6FF':isCon?'rgba(29,158,117,.06)':'#FFFFFF')}>
                    <td style={{ padding:'8px 12px', textAlign:'center' }}>
                      {ESTADO_MOV_ICON[m.estado]}
                    </td>
                    <td style={{ padding:'8px 12px', color:isFut?'#3B82F6':'#0F0F0F', fontWeight:isFut?500:400 }}>{m.fecha}</td>
                    <td style={{ padding:'8px 12px', color:isFut?'#3B82F6':BRAND, fontFamily:F, fontWeight:isFut?500:400 }}>{m.comprobante}</td>
                    <td style={{ padding:'8px 12px', color:isFut?'#3B82F6':BRAND, fontFamily:F }}>{m.documento}</td>
                    <td style={{ padding:'8px 12px', maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:isFut?'#3B82F6':'#0F0F0F' }}>{m.descripcion}</td>
                    <td style={{ padding:'8px 12px' }}>{m.moneda}</td>
                    <td style={{ padding:'8px 12px', textAlign:'right' }}>{m.debitos>0?fmt2(m.debitos):'0.00'}</td>
                    <td style={{ padding:'8px 12px', textAlign:'right' }}>{m.creditos>0?fmt2(m.creditos):'0.00'}</td>
                    <td style={{ padding:'8px 12px', textAlign:'right', color:isFut?'#3B82F6':'#0F0F0F' }}>{fmt2(m.importeCRC)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop:`2px solid ${C.n500}`, background:'#F9F9F9' }}>
                <td colSpan={6} style={{ padding:'8px 12px', textAlign:'right', fontWeight:600, fontSize:12, fontFamily:F }}>Totalizado</td>
                <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:700, fontSize:12, fontFamily:F }}>{fmt2(movs.reduce((s,m)=>s+m.debitos,0))}</td>
                <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:700, fontSize:12, fontFamily:F }}>{fmt2(movs.reduce((s,m)=>s+m.creditos,0))}</td>
                <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:700, fontSize:12, fontFamily:F }}>{fmt2(movs.reduce((s,m)=>s+m.importeCRC,0))}</td>
              </tr>
            </tfoot>
          </table>
          </div>

          {/* Leyenda - flexShrink:0, siempre visible debajo del área con scroll */}
          {!cerrada && (
            <div style={{ padding:'10px 24px', borderTop:`1px solid ${C.n500}`, display:'flex', gap:20, fontSize:11, color:C.n700, fontFamily:F, flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>{ESTADO_MOV_ICON['Conciliado']}<span>Conciliado</span></div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>{ESTADO_MOV_ICON['Futuro']}<span>Conciliado en período futuro (no editable)</span></div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>{ESTADO_MOV_ICON['Pendiente']}<span>Pendiente</span></div>
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      {showImportar && <ImportarArchivoModal con={con} onClose={()=>setShowImportar(false)} onImportar={importar}/>}
      {showCerrar   && <CerrarConciliacionModal con={con} onClose={()=>setShowCerrar(false)} onCerrar={cerrarConciliacion}/>}
      {showCorte    && <CorteSaldoModal con={con} onClose={()=>setShowCorte(false)} onAplicar={aplicarCorte}/>}
      {showVista    && <VistaPreviaModal con={con} onClose={()=>setShowVista(false)}/>}
      {toast && <Toast message={toast} type="success" onClose={()=>setToast(null)}/>}
    </div>
  );
}
