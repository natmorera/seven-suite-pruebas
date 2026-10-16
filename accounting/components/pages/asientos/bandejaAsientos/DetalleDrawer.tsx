'use client';
import { useState } from 'react';
import { C, PERMISOS_ACTUAL, radius, TABLA } from '../../../ui/tokens';
import { useVisualizacionAsientosDefault } from '../../config/visualizacionAsientos';
import ModalDescontabilizar, { IcDescontabilizar } from '../DescontabilizarModal';
import ArchivosAdjuntos from '../adjuntos/ArchivosAdjuntos';
import { type Asiento, BRAND, F, MON_SYM, TIPOS_LABEL, consolidarLineas, fmt2 } from './datos';
import { ModalAdjuntos } from './modales';
import { IcChev, TipoPill } from './piezas';

// ── Right drawer: detalle asiento ──────────────────────────────────────────────
export function DetalleDrawer({ asiento, anulado=false, onClose, onAnular, onDuplicar, onContabilizar, onRestaurar, onUpdateArchivos, tienePermisoDescontabilizar = PERMISOS_ACTUAL.descontabilizarAsientos }: {
  asiento: Asiento; anulado?: boolean; onClose:()=>void;
  onAnular?:()=>void; onDuplicar?:()=>void;
  onContabilizar?:(payload?:{motivo:string; desconciliar:boolean})=>void;
  onRestaurar?:()=>void;
  onUpdateArchivos?:(archivos:string[])=>void; tienePermisoDescontabilizar?: boolean;
}) {
  const sym = MON_SYM[asiento.moneda];
  const totalDebe  = asiento.lineas.reduce((s,l)=>s+l.debe,0);
  const totalHaber = asiento.lineas.reduce((s,l)=>s+l.haber,0);
  const fechaHoy = new Date().toLocaleDateString('es-CR');
  const { default_: vista } = useVisualizacionAsientosDefault();
  const lineasVista = vista === 'consolidado' ? consolidarLineas(asiento.lineas) : asiento.lineas;
  const [obsOpen,  setObsOpen]  = useState(true);
  const [histOpen, setHistOpen] = useState(true);
  const [filesOpen,setFilesOpen]= useState(true);
  const [showAdjuntos, setShowAdjuntos] = useState(false);
  const [showDescontabilizar, setShowDescontabilizar] = useState(false);

  return (
    <>
      {/* Imprimir = comprobante de asiento en PDF, sin el historial ni los
          archivos adjuntos del panel - antes "Imprimir" hacía window.print()
          de la pantalla completa (bandeja + panel), que es justo lo que no
          se quería. Ahora imprime solo el área #asiento-print-area. */}
      <style>{`
        #asiento-print-area { display:none; }
        @media print {
          body * { visibility:hidden; }
          #asiento-print-area, #asiento-print-area * { visibility:visible; }
          #asiento-print-area { display:block !important; position:absolute; left:0; top:0; width:100%; padding:32px; }
          #asiento-print-area table thead { display: table-header-group; }
          #asiento-print-area table tr { page-break-inside: avoid; }
        }
      `}</style>
      <div id="asiento-print-area">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <p style={{ fontSize:18, fontWeight:700, margin:0, fontFamily:F }}>Hotel Fortuna S.A.</p>
            <p style={{ fontSize:13, color:'#757575', margin:'3px 0 0', fontFamily:F }}>Comprobante de asiento contable</p>
          </div>
          <p style={{ fontSize:11, color:'#757575', margin:0, fontFamily:F }}>Generado: {fechaHoy}</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px 16px', fontSize:12, padding:'14px 0', borderTop:'1px solid #ECECEC', borderBottom:'1px solid #ECECEC', marginBottom:16 }}>
          {[['N.º Asiento',asiento.consecutivo],['Título',asiento.titulo],['Fecha',asiento.fecha.split('-').reverse().join('/')],
            ['Moneda',`${asiento.moneda} ${sym}`],['Tipo',TIPOS_LABEL[asiento.tipo]],['Módulo/Origen',asiento.origen],
            ['Estado',anulado?'Anulado':asiento.contabilizado?'Contabilizado':'Pendiente'],['Libro','General']]
            .map(([l,v])=>(
            <div key={l as string}>
              <p style={{ fontSize:10, color:'#757575', margin:'0 0 2px', fontFamily:F }}>{l as string}</p>
              <p style={{ fontSize:12, fontWeight:500, color:'#0F0F0F', margin:0, fontFamily:F }}>{v as string}</p>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <p style={{ fontSize:13, fontWeight:600, color:'#0F0F0F', margin:0, fontFamily:F }}>Líneas del asiento</p>
          <span style={{ fontSize:11, color:'#757575', fontFamily:F }}>
            Vista: <strong>{vista==='detallado'?'Detallado':'Consolidado'}</strong>
          </span>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F, marginBottom:16 }}>
          <thead>
            <tr style={{ borderBottom:'2px solid #ECECEC' }}>
              {['Cuenta','Descripción','C.C','Debe','Haber'].map(h=>(
                <th key={h} style={{ padding:'6px 8px', textAlign:h==='Debe'||h==='Haber'?'right':'left', fontSize:11, fontWeight:500, color:'#757575' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lineasVista.map(l=>(
              <tr key={l.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                <td style={{ padding:'6px 8px', fontSize:11 }}>{l.cuenta}</td>
                <td style={{ padding:'6px 8px', fontSize:11 }}>{l.descripcion}</td>
                <td style={{ padding:'6px 8px', fontSize:11, color:'#757575' }}>{l.cCostos||'-'}</td>
                <td style={{ padding:'6px 8px', fontSize:11, textAlign:'right' }}>{l.debe>0?`${sym} ${fmt2(l.debe)}`:'-'}</td>
                <td style={{ padding:'6px 8px', fontSize:11, textAlign:'right' }}>{l.haber>0?`${sym} ${fmt2(l.haber)}`:'-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop:'2px solid #ECECEC' }}>
              <td colSpan={3} style={{ padding:'6px 8px', fontWeight:700, fontSize:12 }}>Totales</td>
              <td style={{ padding:'6px 8px', fontWeight:700, fontSize:12, textAlign:'right' }}>{sym} {fmt2(totalDebe)}</td>
              <td style={{ padding:'6px 8px', fontWeight:700, fontSize:12, textAlign:'right' }}>{sym} {fmt2(totalHaber)}</td>
            </tr>
          </tfoot>
        </table>
        {asiento.observacion && (
          <div>
            <p style={{ fontSize:12, fontWeight:600, color:'#0F0F0F', margin:'0 0 4px', fontFamily:F }}>Observación</p>
            <p style={{ fontSize:12, color:'#0F0F0F', margin:0, lineHeight:1.5, fontFamily:F }}>{asiento.observacion}</p>
          </div>
        )}
      </div>

      {/* Overlay semi-transparente */}
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.2)', zIndex:998 }}/>
      {/* Panel derecho */}
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:640, background:'#FFFFFF',
        boxShadow:'-8px 0 32px rgba(0,0,0,.14)', zIndex:999, display:'flex', flexDirection:'column',
        fontFamily:F, overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.n500}`, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:16, fontWeight:600, margin:0, color:'#0F0F0F' }}>{asiento.titulo}</p>
              <p style={{ fontSize:12, color:BRAND, margin:'3px 0 0', fontFamily:F }}>{asiento.consecutivo}</p>
            </div>
            <button onClick={onClose} aria-label="Cerrar" title="Cerrar" style={{ background:'none',border:'none',cursor:'pointer',color:'#757575',fontSize:22,padding:4,lineHeight:1,marginTop:-4 }}>×</button>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10 }}>
            <TipoPill tipo={asiento.tipo}/>
            <span style={{ fontSize:12, color:'#757575' }}>{TIPOS_LABEL[asiento.tipo]} · {asiento.origen}</span>
            <span style={{ marginLeft:'auto', fontSize:11, padding:'2px 10px', borderRadius:radius.pill, fontWeight:500,
              background: anulado?C.errorBg: asiento.contabilizado?C.successBg:'#FFFBEB',
              color: anulado?C.error: asiento.contabilizado?C.success:'#A07000',
              border: `1px solid ${anulado?`${C.errorBorder}`:asiento.contabilizado?`${C.successBorder}`:'#EEB30030'}` }}>
              {anulado?'Anulado':asiento.contabilizado?'Contabilizado':'Pendiente'}
            </span>
          </div>
        </div>

        {/* Meta */}
        <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}`, flexShrink:0 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px 16px', fontSize:12 }}>
            {[['N.º Asiento',asiento.consecutivo,true],['Fecha',asiento.fecha.split('-').reverse().join('/'),false],
              ['Moneda',`${asiento.moneda} ${sym}`,false],['Tasa','516.54000000',false],['Libro','General',false],['Empresa','Hotel Fortuna S.A.',false]]
              .map(([l,v,mono])=>(
              <div key={l as string}>
                <p style={{ fontSize:10, color:'#757575', margin:'0 0 2px' }}>{l as string}</p>
                <p style={{ fontSize:12, fontWeight:500, color:'#0F0F0F', margin:0, fontFamily: F }}>{v as string}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contenido scrolleable - antes todo el panel (header + botones
            incluidos) scrolleaba junto, así que al bajar se perdían de vista
            el título y las acciones. Ahora solo esta zona hace scroll. */}
        <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>

        {/* Líneas */}
        <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}` }}>
          <p style={{ fontSize:13, fontWeight:600, color:'#0F0F0F', margin:'0 0 10px' }}>Líneas del asiento</p>
          {lineasVista.length === 0
            ? <p style={{ fontSize:12, color:'#757575', margin:0 }}>Sin líneas registradas.</p>
            : (
            <table className="tabla" style={TABLA.table}>
              <thead>
                <tr style={TABLA.headRow}>
                  {['Cuenta','Descripción','C.C','Debe','Haber'].map(h=>(
                    <th key={h} style={{ ...TABLA.th, textAlign:h==='Debe'||h==='Haber'?'right':'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineasVista.map(l=>(
                  <tr key={l.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                    <td style={{ padding:'8px 12px', color:BRAND, fontFamily:F }}>{l.cuenta}</td>
                    <td style={{ padding:'8px 12px' }}>{l.descripcion}</td>
                    <td style={{ padding:'8px 12px' }}>{l.cCostos||'-'}</td>
                    <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:6, minWidth:90 }}>
                        <span style={{ color:l.debe>0?C.n700:'#ECECEC' }}>{sym}</span>
                        <span style={{ color:l.debe>0?'#0F0F0F':'#ECECEC' }}>{l.debe>0?fmt2(l.debe):'-'}</span>
                      </div>
                    </td>
                    <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:6, minWidth:90 }}>
                        <span style={{ color:l.haber>0?C.n700:'#ECECEC' }}>{sym}</span>
                        <span style={{ color:l.haber>0?'#0F0F0F':'#ECECEC' }}>{l.haber>0?fmt2(l.haber):'-'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:`2px solid ${C.n500}` }}>
                  <td colSpan={3} style={{ padding:'8px 12px', fontWeight:600, fontSize:12 }}>Totales</td>
                  <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:6, minWidth:90 }}>
                        <span style={{ color:C.n700, fontWeight:600 }}>{sym}</span>
                        <span style={{ fontWeight:700, fontSize:12 }}>{fmt2(totalDebe)}</span>
                      </div>
                    </td>
                  <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:6, minWidth:90 }}>
                        <span style={{ color:C.n700, fontWeight:600 }}>{sym}</span>
                        <span style={{ fontWeight:700, fontSize:12 }}>{fmt2(totalHaber)}</span>
                      </div>
                    </td>
                </tr>
                {Math.abs(totalDebe-totalHaber)>0.01 && (
                  <tr><td colSpan={5} style={{ padding:'8px 12px', color:C.error }}>⚠ Desbalanceado: {sym} {fmt2(Math.abs(totalDebe-totalHaber))}</td></tr>
                )}
              </tfoot>
            </table>
          )}
        </div>

        {/* Observación */}
        {asiento.observacion && (
          <div style={{ padding:'12px 24px', borderBottom:`1px solid ${C.n500}` }}>
            <button onClick={()=>setObsOpen(v=>!v)} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', padding:0, fontSize:12, fontWeight:500, color:'#0F0F0F' }}>
              Observación <IcChev up={obsOpen}/>
            </button>
            {obsOpen && <p style={{ fontSize:12, color:'#0F0F0F', margin:'8px 0 0', lineHeight:1.6 }}>{asiento.observacion}</p>}
          </div>
        )}

        {/* Archivos */}
        {((asiento.archivos?.length ?? 0) > 0 || onUpdateArchivos) && (
          <div style={{ padding:'12px 24px', borderBottom:`1px solid ${C.n500}` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <button onClick={()=>setFilesOpen(v=>!v)} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', padding:0, fontSize:12, fontWeight:500, color:'#0F0F0F' }}>
                Archivos adjuntos ({asiento.archivos?.length ?? 0}) {(asiento.archivos?.length??0) > 0 && <IcChev up={filesOpen}/>}
              </button>
              {onUpdateArchivos && (
                <button onClick={()=>setShowAdjuntos(true)} aria-label="Gestionar adjuntos" title="Gestionar adjuntos"
                  style={{ fontSize:11, color:BRAND, background:'none', border:`1px solid ${C.brandBd}`, borderRadius:radius.sm, padding:'4px 10px', cursor:'pointer', fontFamily:F }}>
                  Gestionar adjuntos
                </button>
              )}
            </div>
            {filesOpen && (asiento.archivos?.length ?? 0) > 0 && (
              <ArchivosAdjuntos archivos={asiento.archivos ?? []} asiento={{ titulo:asiento.titulo, consecutivo:asiento.consecutivo, fecha:asiento.fecha, moneda:asiento.moneda, importe:asiento.importe }} />
            )}
          </div>
        )}

        {/* Historial */}
        {(asiento.historial?.length ?? 0) > 0 && (
          <div style={{ padding:'12px 24px', borderBottom:`1px solid ${C.n500}` }}>
            <button onClick={()=>setHistOpen(v=>!v)} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', padding:0, fontSize:12, fontWeight:500, color:'#0F0F0F', marginBottom:8 }}>
              Historial <IcChev up={histOpen}/>
            </button>
            {histOpen && asiento.historial!.map((h,i)=>(
              <div key={i} style={{ display:'flex', gap:8, marginBottom:10 }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:h.color, flexShrink:0, marginTop:2 }}/>
                <div>
                  <p style={{ margin:0, fontSize:12, color:'#0F0F0F' }}>{h.texto}</p>
                  <p style={{ margin:0, fontSize:10, color:'#757575' }}>{h.fecha} - {h.usuario}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        </div>

        {/* Footer actions */}
        <div style={{ borderTop:`1px solid ${C.n500}`, padding:'14px 24px', display:'flex', gap:8, justifyContent:'flex-end', flexShrink:0 }}>
          {anulado ? (
            <button onClick={onRestaurar} style={{ height:34, padding:'0 16px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:F }}>
              ↺ Restaurar asiento
            </button>
          ) : asiento.contabilizado ? (
            <>
              <button onClick={()=>setShowDescontabilizar(true)} style={{ height:36, padding:'0 18px', border:`1px solid ${C.n500}`, background:'#FFFFFF', color:'#0F0F0F', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F, display:'flex', alignItems:'center', gap:7 }}>
                <IcDescontabilizar/>
                Descontabilizar (enviar pendiente)
              </button>
            </>
          ) : (
            <>
              {onAnular    && <button onClick={onAnular}    style={{ height:34, padding:'0 14px', border:`1px solid ${C.brandBd}`, background:'transparent', color:BRAND, borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F }}>⊘ Anular</button>}
              {onDuplicar  && <button onClick={onDuplicar}  style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, background:'#FFFFFF', color:'#0F0F0F', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F }}>Duplicar</button>}
              <button onClick={()=>window.print()} style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, background:'#FFFFFF', color:'#0F0F0F', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F }}>Imprimir</button>
              {onContabilizar && (
                <button onClick={()=>onContabilizar()} style={{ height:34, padding:'0 14px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Contabilizar</button>
              )}
            </>
          )}
        </div>
      </div>

      {showAdjuntos && onUpdateArchivos && (
        <ModalAdjuntos archivos={asiento.archivos ?? []}
          onSave={(archivos)=>{ onUpdateArchivos(archivos); setShowAdjuntos(false); }}
          onClose={()=>setShowAdjuntos(false)}/>
      )}
      {showDescontabilizar && (
        <ModalDescontabilizar
          consecutivo={asiento.consecutivo}
          titulo={asiento.titulo}
          conciliacion={asiento.conciliacion}
          tienePermiso={tienePermisoDescontabilizar}
          onClose={()=>setShowDescontabilizar(false)}
          onConfirm={(payload)=>{ setShowDescontabilizar(false); onContabilizar?.(payload); }}
        />
      )}
    </>
  );
}
