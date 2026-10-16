'use client';
import { useState } from 'react';
import { PageHeader, TabBar, Toast } from '../../ui/primitives';
import { IcPlus } from '../../ui/icons';
import { BotonExportarUnico } from '../../ui/exportar';
import { TabEjercicioFiscal } from './ejercicio/TabEjercicioFiscal';
import { TabNomenclatura } from './TabOtros';
import { TabConceptos, TabAsientosContables, TabLibrosContables } from './conceptosLibros/piezas';

const TABS = ['Ejercicio fiscal','Nomenclatura contable','Conceptos','Asientos contables','Libros contables'];
const TAB_EJERCICIO = 0;

interface Config {
  separador: string;
  decimalSep: string;
  longitudes: { mayor:number; submajor:number; detalle:number };
}

const INIT: Config = {
  separador: '-',
  decimalSep: '.',
  longitudes: { mayor:3, submajor:3, detalle:4 },
};

export default function ConfiguracionContable() {
  const [tab, setTab] = useState(0);
  const [config, setConfig] = useState<Config>(INIT);
  const [toast, setToast] = useState<{message:string;type:'success'|'error'}|null>(null);
  // Ejercicio fiscal ya no tiene sub-pestañas (era la misma complejidad de UX
  // que veníamos corrigiendo en el resto de la app) - el estado de sus
  // acciones de header vive acá para ponerlas junto al resto de acciones
  // de la página.
  const [ejercicioModalNuevo, setEjercicioModalNuevo] = useState(false);
  const [ejercicioShowExportar, setEjercicioShowExportar] = useState(false);
  // Issue #9: mismo patrón de señal para Conceptos / Asientos contables / Libros
  const [conceptoAddSignal, setConceptoAddSignal] = useState(0);
  const [asientoAddSignal, setAsientoAddSignal] = useState(0);
  const [libroAddSignal, setLibroAddSignal] = useState(0);

  function patch(partial: Partial<Config>) { setConfig(c => ({ ...c, ...partial })); }

  const actions =
    tab === TAB_EJERCICIO ? (
      <>
        <BotonExportarUnico onClick={()=>setEjercicioShowExportar(true)}/>
        <button onClick={()=>setEjercicioModalNuevo(true)}
          style={{ height:34, padding:'0 14px', background:'#A77600', color:'#FFFFFF', border:'none', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
          <IcPlus className="w-3 h-3"/> Nuevo ejercicio
        </button>
      </>
    ) : tab === 2 ? (
      <button onClick={()=>setConceptoAddSignal(s=>s+1)}
        style={{ height:34, padding:'0 14px', background:'#A77600', color:'#FFFFFF', border:'none', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
        <IcPlus className="w-3 h-3"/> Nuevo concepto
      </button>
    ) : tab === 3 ? (
      <button onClick={()=>setAsientoAddSignal(s=>s+1)}
        style={{ height:34, padding:'0 14px', background:'#A77600', color:'#FFFFFF', border:'none', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
        <IcPlus className="w-3 h-3"/> Nuevo tipo
      </button>
    ) : tab === 4 ? (
      <button onClick={()=>setLibroAddSignal(s=>s+1)}
        style={{ height:34, padding:'0 14px', background:'#A77600', color:'#FFFFFF', border:'none', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
        <IcPlus className="w-3 h-3"/> Nuevo libro
      </button>
    ) : null;

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <PageHeader title="Configuración contable">{actions}</PageHeader>
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
      <div style={{ flex:1, overflowY:'auto' }}>
        {tab === 0 && (
          <TabEjercicioFiscal
            modalNuevo={ejercicioModalNuevo} onModalNuevoChange={setEjercicioModalNuevo}
            showExportar={ejercicioShowExportar} onShowExportarChange={setEjercicioShowExportar}
          />
        )}
        {tab === 1 && <div style={{ padding:24 }}><TabNomenclatura config={config} patch={patch} /></div>}
        {tab === 2 && <div style={{ padding:24 }}><TabConceptos addSignal={conceptoAddSignal} onAddHandled={()=>{}} /></div>}
        {tab === 3 && <div style={{ padding:24 }}><TabAsientosContables addSignal={asientoAddSignal} onAddHandled={()=>{}} /></div>}
        {tab === 4 && <div style={{ padding:24 }}><TabLibrosContables addSignal={libroAddSignal} onAddHandled={()=>{}} /></div>}
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
