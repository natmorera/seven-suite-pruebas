'use client';
import { PageHeader, TabBar } from '../../ui/primitives';
import { C, radius } from '../../ui/tokens';
import { BotonExportarUnico } from '../../ui/exportar';
import { CrearAsientoDrawer } from './bandejaAsientos/CrearAsientoDrawer';
import { DetalleDrawer } from './bandejaAsientos/DetalleDrawer';
import { EditPlantillaModal, ImportarAsientoModal } from './bandejaAsientos/EditPlantillaModal';
import { ModalExportarListado } from './bandejaAsientos/ModalExportarListado';
import { ToastContainer } from './bandejaAsientos/PaginationFooter';
import { BRAND, F } from './bandejaAsientos/datos';
import { AnularModal, ConfirmModal, ContabilizarModal, EditProgramadoModal, ModalAdjuntos, ModalEnviarCorreo } from './bandejaAsientos/modales';
import { useBandeja } from './bandejaAsientos/useBandeja';
import { TabPendientes } from './bandejaAsientos/TabPendientes';
import { TabAnulados } from './bandejaAsientos/TabAnulados';
import { TabProgramados } from './bandejaAsientos/TabProgramados';
import { TabPlantillas } from './bandejaAsientos/TabPlantillas';

export default function BandejaAsientos() {
  const e = useBandeja();
  const { tab, setExportarOpen, setCrearOpen, setNuevoOpen, nuevoOpen, setImportarOpen, pendientes, anuladosFiltrados, programadosFiltrados, plantillasFiltradas, setTab, detalle, setDetalle, setModalAnular, openDuplicar, setModalContabilizar, handleRestaurar, handleUpdateArchivos, importarOpen, exportarOpen, resumenFiltrosA, resumenFiltros, crearOpen, asientos, plantillas, handleSavePlantilla, addToast, crearInitial, setCrearInitial, setAsientos, modalAnular, handleAnular, modalContabilizar, handleContabilizar, modalAdjuntosRow, setModalAdjuntosRow, modalCorreo, handleEnviarCorreo, setModalCorreo, editProgramado, handleGuardarEditProgramado, setEditProgramado, delProgramado, handleEliminarProgramado, setDelProgramado, editPlantilla, handleGuardarEditPlantilla, setEditPlantilla, delPlantilla, handleEliminarPlantilla, setDelPlantilla, toasts, setToasts } = e;
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#F9F9F9' }}>
      {/* Accesibilidad: foco visible por teclado (restaura outline aun con estilos inline que lo desactivan) + animación de refresco */}
      <style>{`
        button:focus-visible, input:focus-visible, select:focus-visible, [role="switch"]:focus-visible, [tabindex]:focus-visible {
          outline: 2px solid ${BRAND} !important;
          outline-offset: 2px;
        }
        @keyframes bandeja-spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <PageHeader title="Bandeja de asientos">
        {(tab==='pendientes' || tab==='anulados') && (
          <BotonExportarUnico onClick={()=>setExportarOpen(true)}/>
        )}
        <div style={{ display:'flex', position:'relative' }}>
          <button onClick={()=>setCrearOpen(true)}
            style={{ height:32, padding:'0 12px', borderRadius:'4px 0 0 4px', background:BRAND, color:'#FFFFFF', border:'none', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>
            Nuevo asiento
          </button>
          <button onClick={()=>setNuevoOpen(v=>!v)} aria-label="Más opciones para crear asiento" title="Más opciones para crear asiento"
            style={{ height:32, width:30, borderRadius:'0 4px 4px 0', background:BRAND, color:'#FFFFFF', border:'none', borderLeft:'1px solid rgba(255,255,255,.3)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg className="w-4 h-4" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
          </button>
          {nuevoOpen && (
            <div style={{ position:'absolute', top:'calc(100% + 4px)', right:0, zIndex:400, background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:radius.md, boxShadow:'0 4px 16px rgba(0,0,0,.12)', overflow:'hidden', minWidth:180 }}>
              <button onClick={()=>{ setNuevoOpen(false); setCrearOpen(true); }} style={{ display:'block', width:'100%', textAlign:'left', padding:'10px 16px', fontSize:12, border:'none', background:'none', cursor:'pointer', fontFamily:F }}>Crear asiento manual</button>
              <button onClick={()=>{ setNuevoOpen(false); setImportarOpen(true); }} style={{ display:'block', width:'100%', textAlign:'left', padding:'10px 16px', fontSize:12, border:'none', background:'none', cursor:'pointer', fontFamily:F }}>Importar asiento</button>
            </div>
          )}
        </div>
      </PageHeader>

      {/* Tabs */}
      <TabBar
        tabs={[
          { label:'Pendientes',  count:pendientes.length },
          { label:'Anulados',    count:anuladosFiltrados.length },
          { label:'Programados', count:programadosFiltrados.length },
          { label:'Plantillas',  count:plantillasFiltradas.length },
        ]}
        active={['pendientes','anulados','programados','plantillas'].indexOf(tab)}
        onChange={i=>setTab((['pendientes','anulados','programados','plantillas'] as const)[i])}
      />

      {tab==='pendientes' && <TabPendientes e={e} />}

      {tab==='anulados' && <TabAnulados e={e} />}

      {tab==='programados' && <TabProgramados e={e} />}

      {tab==='plantillas' && <TabPlantillas e={e} />}

      {/* Drawers */}
      {detalle && (
        <DetalleDrawer
          asiento={detalle.a} anulado={detalle.anulado}
          onClose={()=>setDetalle(null)}
          onAnular={()=>{ setModalAnular([detalle.a]); }}
          onDuplicar={()=>openDuplicar(detalle.a)}
          onContabilizar={()=>setModalContabilizar([detalle.a])}
          onRestaurar={()=>handleRestaurar(detalle.a)}
          onUpdateArchivos={(archivos)=>handleUpdateArchivos(detalle.a.id, archivos, detalle.anulado)}
        />
      )}
      {importarOpen && <ImportarAsientoModal onClose={()=>setImportarOpen(false)}/>}
      {exportarOpen && (
        <ModalExportarListado
          rows={tab==='anulados' ? anuladosFiltrados : pendientes}
          tabLabel={tab==='anulados' ? 'Anulados' : 'Pendientes'}
          filtrosResumen={tab==='anulados' ? resumenFiltrosA : resumenFiltros}
          onClose={()=>setExportarOpen(false)}
        />
      )}
      {crearOpen && (
        <CrearAsientoDrawer
          asientos={asientos}
          plantillas={plantillas}
          onSavePlantilla={handleSavePlantilla}
          onToast={addToast}
          initial={crearInitial}
          onClose={()=>{ setCrearOpen(false); setCrearInitial(null); }}
          onSave={a=>{ setAsientos(p=>[a,...p]); setCrearOpen(false); setCrearInitial(null); addToast(`Asiento ${a.consecutivo} ${a.contabilizado?'creado y contabilizado':'creado como pendiente'}.`,'success'); }}
        />
      )}

      {/* Modales confirmación */}
      {modalAnular    && <AnularModal    asientos={modalAnular}    onConfirm={m=>handleAnular(m)} onClose={()=>setModalAnular(null)}/>}
      {modalContabilizar && <ContabilizarModal asientos={modalContabilizar} onConfirm={()=>handleContabilizar(modalContabilizar)} onClose={()=>setModalContabilizar(null)}/>}

      {/* Adjuntos y correo - acciones rápidas por fila */}
      {modalAdjuntosRow && (
        <ModalAdjuntos archivos={modalAdjuntosRow.a.archivos ?? []}
          onSave={(archivos)=>{ handleUpdateArchivos(modalAdjuntosRow.a.id, archivos, modalAdjuntosRow.anulado); addToast('Adjuntos actualizados.','success'); setModalAdjuntosRow(null); }}
          onClose={()=>setModalAdjuntosRow(null)}/>
      )}
      {modalCorreo && (
        <ModalEnviarCorreo asiento={modalCorreo}
          onSend={(email,mensaje)=>handleEnviarCorreo(modalCorreo, email, mensaje)}
          onClose={()=>setModalCorreo(null)}/>
      )}

      {/* Modales Programados / Plantillas */}
      {editProgramado && (
        <EditProgramadoModal programado={editProgramado}
          onSave={(nombre,frecuencia,proxima,moneda)=>handleGuardarEditProgramado(editProgramado.id, nombre, frecuencia, proxima, moneda)}
          onClose={()=>setEditProgramado(null)}/>
      )}
      {delProgramado && (
        <ConfirmModal title="Eliminar programación" confirmLabel="Eliminar"
          message={`¿Seguro que querés eliminar la programación "${delProgramado.nombre}"? Esta acción no se puede deshacer.`}
          onConfirm={()=>handleEliminarProgramado(delProgramado)} onClose={()=>setDelProgramado(null)}/>
      )}
      {editPlantilla && (
        <EditPlantillaModal plantilla={editPlantilla}
          onSave={(nombre,moneda,lineas)=>handleGuardarEditPlantilla(editPlantilla.id, nombre, moneda, lineas)}
          onClose={()=>setEditPlantilla(null)}/>
      )}
      {delPlantilla && (
        <ConfirmModal title="Eliminar plantilla" confirmLabel="Eliminar"
          message={`¿Seguro que querés eliminar la plantilla "${delPlantilla.nombre}"? Esta acción no se puede deshacer.`}
          onConfirm={()=>handleEliminarPlantilla(delPlantilla)} onClose={()=>setDelPlantilla(null)}/>
      )}

      <ToastContainer toasts={toasts} onDismiss={id=>setToasts(p=>p.filter(t=>t.id!==id))}/>
    </div>
  );
}
