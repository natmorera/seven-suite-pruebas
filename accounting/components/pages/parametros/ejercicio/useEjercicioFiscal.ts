'use client';
import { useState } from 'react';
import { type Ejercicio, INIT, type Periodo } from './datos';

export function useEjercicioFiscal({ modalNuevo, onModalNuevoChange, showExportar, onShowExportarChange }: {
  modalNuevo: boolean; onModalNuevoChange: (v:boolean)=>void;
  showExportar: boolean; onShowExportarChange: (v:boolean)=>void;
}) {
  const [ejercicios,setEjercicios]=useState<Ejercicio[]>(INIT);
  const [expandedId,setExpandedId]=useState<number|null>(INIT[0].id);
  const [editId,setEditId]=useState<number|null>(null);
  const [modalCierreId,setModalCierreId]=useState<number|null>(null);
  const [modalRevertirId,setModalRevertirId]=useState<number|null>(null);
  const [cuentaRes,setCuentaRes]=useState('015-004943-0');
  const [motivo,setMotivo]=useState('');
  const [toast,setToast]=useState<{message:string;type:'success'|'error'}|null>(null);
  const [confirm,setConfirm]=useState<{ejercicioId:number; estado:Periodo['estado']; orden:number}|null>(null);
  const [cierrePeriodo,setCierrePeriodo]=useState<{ejercicioId:number; orden:number}|null>(null);
  const [cierreStep,setCierreStep]=useState<'validando'|'listo'|null>(null);

  function showT(m:string,t:'success'|'error'='success') { setToast({message:m,type:t}); setTimeout(()=>setToast(null),3500); }
  function ejercicioById(id:number) { return ejercicios.find(e=>e.id===id)!; }

  function cambiarEstadoPeriodo(ejercicioId:number, orden:number, estado:Periodo['estado']) {
    setConfirm({ ejercicioId, estado, orden });
  }
  function confirmCambio() {
    if(!confirm) return;
    setEjercicios(list=>list.map(e=>e.id!==confirm.ejercicioId?e:{ ...e, periodos:e.periodos.map(p=>p.orden===confirm.orden?{...p,estado:confirm.estado}:p) }));
    setConfirm(null);
    showT(`Período ${confirm.estado==='Bloqueado'?'cerrado':'reaperturado'} correctamente.`);
  }

  function ejecutarCierre(id:number) {
    setEjercicios(list=>list.map(e=>e.id!==id?e:{ ...e, estado:'cerrado', periodos:e.periodos.map(p=>({...p,estado:(p.estado==='Activo'||p.estado==='Pendiente'?'Bloqueado':p.estado) as Periodo['estado']})) }));
    setModalCierreId(null);
    showT(`Cierre del ejercicio ${ejercicioById(id).anio} ejecutado correctamente.`);
  }
  function revertirCierre(id:number) {
    if(!motivo.trim()){ showT('El motivo de reversión es requerido.','error'); return; }
    const anio = ejercicioById(id).anio;
    setEjercicios(list=>list.map(e=>e.id!==id?e:{ ...e, estado:'activo' }));
    setModalRevertirId(null); setMotivo('');
    showT(`Cierre del ejercicio ${anio} revertido correctamente.`);
  }

  const exportEjercicio = expandedId ? ejercicioById(expandedId) : ejercicios[0];
  return { modalNuevo, onModalNuevoChange, showExportar, onShowExportarChange, ejercicios, setEjercicios, expandedId, setExpandedId, editId, setEditId, modalCierreId, setModalCierreId, modalRevertirId, setModalRevertirId, cuentaRes, setCuentaRes, motivo, setMotivo, toast, setToast, confirm, setConfirm, cierrePeriodo, setCierrePeriodo, cierreStep, setCierreStep, showT, ejercicioById, cambiarEstadoPeriodo, confirmCambio, ejecutarCierre, revertirCierre, exportEjercicio };
}

export type EstadoEjercicioFiscal = ReturnType<typeof useEjercicioFiscal>;
