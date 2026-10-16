'use client';
import { useState, useCallback, useMemo, useRef } from 'react';
import { PageHeader, TabBar, Toast } from '../../ui/primitives';
import { Button } from '../../ui/formulario';
import { IcPlus, IcImport } from '../../ui/icons';
import { C } from '../../ui/tokens';
import { Cuenta } from './catalogoData';
import { CUENTAS_INIT } from './datos/cuentasIniciales';
import { flattenTree, flattenAll, toggleNodeExpanded, addNodeToTree, updateNodeInTree, removeNodeFromTree, genId } from './datos/arbol';
import { EnlaceAjuste, ENLACES_AJUSTE_INIT } from './datos/ajustes';
import AccountDetail from './AccountDetail';
import { TabCentrosCosto } from './CatalogoTabs';
import { TabGrupoPatrimonio } from './ajustes/piezas';
import { TabAjustes } from './ajustes/TabAjustes';
import { PlanCuentas } from './catalogoPage/PlanCuentas';
import { F, TABS } from './catalogoPage/datos';
import { ModalEstructura, ModalExIm } from './catalogoPage/modales';
import { TabCuentasEspeciales } from './catalogoPage/piezas';

export default function CatalogoPage() {
  const [tab, setTab] = useState(0);
  const [cuentas, setCuentas] = useState<Cuenta[]>(CUENTAS_INIT);
  const [selectedNode, setSelectedNode] = useState<Cuenta|null>(null);
  const [panelMode, setPanelMode] = useState<'view'|'edit'|'new'>('view');
  const [panelOpen, setPanelOpen] = useState(false);
  const [parentForNew, setParentForNew] = useState<Cuenta|null>(null);
  const [toast, setToast] = useState<{message:string;type:'success'|'error'}|null>(null);
  const [showIO, setShowIO] = useState(false);
  const [showEst, setShowEst] = useState(false);
  const [showNuevoCentro, setShowNuevoCentro] = useState(false);
  // Issue #7: se sube acá para que AccountDetail pueda mostrar, en el detalle de
  // una cuenta, los movimientos de ajuste que la tienen enlazada.
  const [ajustes, setAjustes] = useState<EnlaceAjuste[]>(() => ENLACES_AJUSTE_INIT.map(e=>({...e})));
  // Issue #5: los botones de Movimientos de ajuste viven en el header - se
  // avisan a TabAjustes con un contador que se incrementa en cada click.
  const [ajusteAddSignal, setAjusteAddSignal] = useState(0);
  const [ajusteSaveSignal, setAjusteSaveSignal] = useState(0);
  const [patrimonioAddSignal, setPatrimonioAddSignal] = useState(0);
  const toastTimer = useRef<any>(null);

  // Lista plana de TODAS las cuentas (sin depender de qué esté expandido en el árbol
  // visual) - la necesitan el selector de cuenta padre y la validación de código
  // duplicado dentro de AccountDetail.
  const flatAll = useMemo(() => flattenAll(cuentas), [cuentas]);

  function showToast(msg:string, type:'success'|'error'='success') {
    clearTimeout(toastTimer.current);
    setToast({message:msg,type});
    toastTimer.current = setTimeout(()=>setToast(null),3000);
  }

  const handleToggle = useCallback((id:string)=>setCuentas(p=>toggleNodeExpanded(p,id)),[]);

  function handleSelect(node:Cuenta) {
    const full = flattenTree(cuentas).find(n=>n.id===node.id)??node;
    setSelectedNode(full); setParentForNew(null); setPanelMode('view'); setPanelOpen(true);
  }
  function handleAddChild(parent:Cuenta) {
    const full = flattenTree(cuentas).find(n=>n.id===parent.id)??parent;
    setParentForNew(full); setSelectedNode(null); setPanelMode('new'); setPanelOpen(true);
  }
  function handleNewRoot() {
    setParentForNew(null); setSelectedNode(null); setPanelMode('new'); setPanelOpen(true);
  }
  function handleSave(data:Cuenta) {
    if (!data.id || data.id.startsWith('_new_')) {
      const newId = genId();
      const n = {...data, id:newId};
      setCuentas(p=>addNodeToTree(p, data.parentId??null, n));
      showToast(`Cuenta "${n.nombre}" creada.`);
      setSelectedNode(n); setPanelMode('view');
    } else {
      setCuentas(p=>updateNodeInTree(p, data));
      showToast(`Cuenta "${data.nombre}" actualizada.`);
      setSelectedNode(data); setPanelMode('view');
    }
  }
  function handleDelete(id:string) {
    const node = flattenTree(cuentas).find(n=>n.id===id);
    setCuentas(p=>removeNodeFromTree(p,id));
    showToast(`Cuenta "${node?.nombre}" eliminada.`,'error');
    setPanelOpen(false); setSelectedNode(null);
  }
  function handleTabChange(i:number) {
    setTab(i); setPanelOpen(false); setSelectedNode(null); setParentForNew(null);
  }

  // buttons now in PageHeader

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F }}>
      <PageHeader title="Catálogo de cuentas">
        {tab===0 && <>
          <Button variant="secondary" onClick={()=>setShowEst(true)}>Estructura del código</Button>
          <Button variant="secondary" icon={<IcImport className="w-3 h-3"/>} onClick={()=>setShowIO(true)}>Exportar / Importar</Button>
          <Button icon={<IcPlus className="w-3 h-3"/>} onClick={handleNewRoot}>Nueva cuenta</Button>
        </>}
        {tab===1 && <Button icon={<IcPlus className="w-3 h-3"/>} onClick={()=>setShowNuevoCentro(true)}>Nuevo centro de costo</Button>}
        {tab===3 && <>
          <Button variant="secondary" icon={<IcPlus className="w-3 h-3"/>} onClick={()=>setAjusteAddSignal(s=>s+1)}>Agregar movimiento</Button>
          <Button onClick={()=>{ setAjusteSaveSignal(s=>s+1); showToast('Configuración de movimientos de ajuste guardada.'); }}>Guardar configuración</Button>
        </>}
        {/* Issue #6: el botón "Nuevo" de Grupo de patrimonio se mueve al header */}
        {tab===4 && <Button icon={<IcPlus className="w-3 h-3"/>} onClick={()=>setPatrimonioAddSignal(s=>s+1)}>Nuevo</Button>}
      </PageHeader>
      <TabBar tabs={TABS} active={tab} onChange={handleTabChange}/>

      {tab===0 && (
        <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', position:'relative' }}>
          <PlanCuentas cuentas={cuentas} onToggle={handleToggle} onSelect={handleSelect}
            onAddChild={handleAddChild} selectedId={selectedNode?.id??null}/>
          {panelOpen && (
            <>
              <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.2)', zIndex:200 }}
                onClick={()=>{setPanelOpen(false);setSelectedNode(null);}}/>
              <aside style={{ position:'fixed', right:0, top:0, height:'100vh', width:640, background:'#FFFFFF', borderLeft:`1px solid ${C.n500}`, zIndex:201, display:'flex', flexDirection:'column', boxShadow:'-4px 0 24px rgba(0,0,0,.15)' }}
                onClick={e=>e.stopPropagation()}>
                <AccountDetail
                  mode={panelMode} account={selectedNode} parentAccount={parentForNew}
                  allNodes={flatAll}
                  onClose={()=>{setPanelOpen(false);setSelectedNode(null);setParentForNew(null);}}
                  onSave={handleSave} onDelete={handleDelete} onAddChild={handleAddChild}
                  onModeChange={setPanelMode} onSelect={handleSelect}
                  enlacesAjuste={ajustes}
                />
              </aside>
            </>
          )}
        </div>
      )}

      {tab===1 && <TabCentrosCosto cuentas={cuentas} triggerNuevo={showNuevoCentro} onNuevoDone={()=>setShowNuevoCentro(false)}/>}
      {tab===2 && <TabCuentasEspeciales cuentas={cuentas} onUpdateCuenta={data=>setCuentas(p=>updateNodeInTree(p,data as any))}/>}
      {tab===3 && (
        <TabAjustes
          rows={ajustes} onChange={setAjustes}
          addSignal={ajusteAddSignal} onAddHandled={()=>{}}
          saveSignal={ajusteSaveSignal} onSaveHandled={()=>{}}
        />
      )}
      {tab===4 && <TabGrupoPatrimonio addSignal={patrimonioAddSignal} onAddHandled={()=>{}}/>}

      {toast && <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:999 }}><Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)}/></div>}
      {showIO && <ModalExIm onClose={()=>setShowIO(false)}/>}
      {showEst && <ModalEstructura onClose={()=>setShowEst(false)}/>}
    </div>
  );
}
