'use client';
import { useState } from 'react';
import { radius } from '../../ui/tokens';
import { C } from '../../ui/tokens';
import { Cuenta } from './catalogoData';
import ModalTrasladoSaldo from './ModalTrasladoSaldo';
import { TrasladoResult } from './modalTrasladoSaldo/datos';
import { DetailView } from './accountDetail/DetailView';
import { EditForm } from './accountDetail/EditForm';
import { F, type Props } from './accountDetail/datos';

export default function AccountDetail({ mode, account, parentAccount, allNodes, onClose, onSave, onDelete, onAddChild, onModeChange, onSelect, enlacesAjuste }: Props) {
  // Traslado de saldo - state lives here so it persists across mode changes
  const [showTraslado, setShowTraslado] = useState(false);
  const [trasladoCuenta, setTrasladoCuenta] = useState<Cuenta|null>(null);
  const [trasladoResult, setTrasladoResult] = useState<TrasladoResult|null>(null);
  const [toast, setToast] = useState<{message:string;type:'success'|'error'}|null>(null);

  function handleSaveWithTraslado(data: Cuenta) {
    onSave(data);
    onModeChange('view');
    // Traslado is now manual-only - no automatic popup on create
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', fontFamily:F }}>
      {(mode==='edit'||mode==='new') ? (
        <EditForm
          account={mode==='new'?null:account}
          parentAccount={mode==='new'?parentAccount:null}
          allNodes={allNodes}
          isNew={mode==='new'}
          onSave={handleSaveWithTraslado}
          onCancel={()=>{ mode==='new'?onClose():onModeChange('view'); }}
        />
      ) : account ? (
        <>
          <DetailView
            account={account}
            allNodes={allNodes}
            onEdit={()=>onModeChange('edit')}
            onDelete={id=>{ onDelete(id); onClose(); }}
            onAddChild={onAddChild}
            onClose={onClose}
            onSelect={onSelect}
            onTraslado={()=>{ setTrasladoCuenta(account); setShowTraslado(true); }}
            trasladoResult={account.id===trasladoCuenta?.id?trasladoResult:null}
            enlacesAjuste={enlacesAjuste}
          />
        </>
      ) : null}

      {/* Traslado modal */}
      {showTraslado && trasladoCuenta && (
        <ModalTrasladoSaldo
          cuentaDestino={trasladoCuenta}
          cuentas={allNodes}
          onConfirm={(result)=>{
            // Inactivate origin, update destination saldo
            const origen = allNodes.find(c=>c.id===result.origenId);
            if (origen) onSave({...origen, inactiva:true, saldo:0});
            onSave({...trasladoCuenta, saldo:result.origenSaldo});
            setTrasladoResult(result);
            setShowTraslado(false);
            setToast({message:'Traslado realizado y asiento contabilizado.',type:'success'});
            setTimeout(()=>setToast(null),4000);
          }}
          onCancel={()=>setShowTraslado(false)}
        />
      )}

      {toast && (
        <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',zIndex:9999}}>
          <div style={{background:toast.type==='success'?C.success:'#F44336',color:'#FFFFFF',padding:'9px 17px',borderRadius:radius.md,fontSize:11,fontFamily:F,boxShadow:'0 4px 16px rgba(0,0,0,.2)'}}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
