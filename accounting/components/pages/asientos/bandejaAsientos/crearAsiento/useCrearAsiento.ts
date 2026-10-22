'use client';
import { useState, type CSSProperties } from 'react';
import { C } from '@/components/ui/tokens';
import { type Asiento, type CrearAsientoInitial, type LineaAsiento, type Moneda, type Plantilla, type ToastType, genConsecutivo } from '../datos';

export function useCrearAsiento({ asientos, onClose, onSave, plantillas, onSavePlantilla, onToast, initial }: {
  asientos: Asiento[]; onClose:()=>void; onSave:(a:Asiento)=>void;
  plantillas: Plantilla[]; onSavePlantilla:(p:Plantilla)=>void; onToast?:(msg:string, type?:ToastType)=>void;
  initial?: CrearAsientoInitial | null;
}) {
  const hoy = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState({
    tipo: 'General', titulo: initial?.titulo ?? '', fecha: hoy,
    moneda: (initial?.moneda ?? 'CRC') as Moneda, origen: initial?.origen ?? 'Accounting', documento: initial?.documento ?? '',
  });
  const [tasa, setTasa] = useState<number>(1);
  const [lineas, setLineas] = useState<LineaAsiento[]>(initial?.lineas ?? [
    { id:1, cuenta:'100-001-0001', descripcion:'Ingreso producción', cCostos:'ADM001', debe:1250, haber:0 },
    { id:2, cuenta:'', descripcion:'', cCostos:'ADM', debe:0, haber:1250 },
  ]);
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [showArchivos,  setShowArchivos]  = useState(false);
  const [showObs,       setShowObs]       = useState(false);
  const [showProg,      setShowProg]      = useState(false);
  const [programar,     setProgramar]     = useState(false);
  const [archivos,      setArchivos]      = useState<string[]>([]);
  const [observacion,   setObservacion]   = useState(initial?.observacion ?? '');
  const [showPlantillas,setShowPlantillas]= useState(false);
  const [paginaLineas, setPaginaLineas] = useState(1);
  const LINEAS_POR_PAG = 10;
  const [plantillaSelId, setPlantillaSelId] = useState('');
  const [consecRefreshing, setConsecRefreshing] = useState(false);

  const TIPOS_ASIENTO = ['General','Apertura','Cierre','Ajuste','Reclasificación'];

  const totalDebe  = lineas.reduce((s,l)=>s+l.debe,0);
  const totalHaber = lineas.reduce((s,l)=>s+l.haber,0);
  const balanceado = Math.abs(totalDebe-totalHaber)<0.01;
  const diffBalance = Math.abs(totalDebe-totalHaber);
  const totalPags  = Math.max(1, Math.ceil(lineas.length / LINEAS_POR_PAG));
  const lineasVisible = lineas.length > LINEAS_POR_PAG
    ? lineas.slice((paginaLineas-1)*LINEAS_POR_PAG, paginaLineas*LINEAS_POR_PAG)
    : lineas;
  const camposCompletos = !!form.titulo.trim() && !!form.fecha;

  function setF(k: keyof typeof form, v: string) { setForm(p=>({...p,[k]:v})); setErrors(p=>({...p,[k]:''})); }
  function setL(id: number, k: keyof LineaAsiento, v: string|number) { setLineas(p=>p.map(l=>l.id===id?{...l,[k]:v}:l)); }
  function addLinea() { setLineas(p=>[...p,{ id:Date.now(), cuenta:'', descripcion:'', cCostos:'ADM', debe:0, haber:0 }]); }
  function removeLinea(id: number) { setLineas(p=>p.filter(l=>l.id!==id)); }

  function refreshConsecutivo() {
    setConsecRefreshing(true);
    onToast?.('Número de asiento actualizado.', 'info');
    setTimeout(()=>setConsecRefreshing(false), 400);
  }

  function guardarComoPlantilla() {
    const lineasValidas = lineas.filter(l => l.cuenta.trim() || l.debe > 0 || l.haber > 0);
    if (lineasValidas.length === 0) {
      onToast?.('No hay nada que guardar: agregá al menos una línea con cuenta o monto antes de guardar como plantilla.', 'warning');
      return;
    }
    const nueva: Plantilla = {
      id: `pl-${Date.now()}`,
      nombre: form.titulo.trim() || `Plantilla ${new Date().toLocaleDateString('es-CR')}`,
      cuentas: lineasValidas.length,
      moneda: form.moneda,
      ultima: new Date().toLocaleDateString('es-CR'),
      lineas: lineasValidas,
    };
    onSavePlantilla(nueva);
    onToast?.('Plantilla guardada.', 'success');
  }

  function cargarPlantilla() {
    const p = plantillas.find(x=>x.id===plantillaSelId);
    if (p) {
      setLineas(p.lineas);
      setForm(prev=>({ ...prev, titulo: prev.titulo || p.nombre, moneda: p.moneda }));
      onToast?.(`Plantilla "${p.nombre}" cargada.`, 'success');
    }
    setShowPlantillas(false);
  }

  function handleSave(contabilizar=false) {
    if (!form.titulo.trim()) { setErrors({titulo:'Requerido'}); return; }
    if (!form.fecha) { setErrors(p=>({...p, fecha:'Requerido'})); return; }
    if (contabilizar && !balanceado) return;
    const consecutivo = genConsecutivo(form.fecha, asientos);
    const lineasValidas = lineas.filter(l => l.cuenta.trim() || l.debe > 0 || l.haber > 0);
    const nuevo: Asiento = {
      id: Date.now(),
      tipo: 'M',
      origen: form.origen,
      fecha: form.fecha,
      consecutivo,
      titulo: form.titulo.trim(),
      moneda: form.moneda,
      importe: totalDebe,
      usuario: 'jperez',
      documento: form.documento,
      observacion,
      contabilizado: contabilizar,
      archivos,
      historial: [{ color:C.success, texto: contabilizar ? 'Asiento creado y contabilizado' : 'Asiento creado manualmente', fecha: new Date().toLocaleString('es-CR'), usuario:'jperez' }],
      lineas: lineasValidas.length > 0 ? lineasValidas : lineas,
    };
    onSave(nuevo);
  }

  const NUM_COL: CSSProperties = { padding:'5px 3px', whiteSpace:'nowrap' };
  return { asientos, onClose, onSave, plantillas, onSavePlantilla, onToast, initial, hoy, form, setForm, tasa, setTasa, lineas, setLineas, errors, setErrors, showArchivos, setShowArchivos, showObs, setShowObs, showProg, setShowProg, programar, setProgramar, archivos, setArchivos, observacion, setObservacion, showPlantillas, setShowPlantillas, paginaLineas, setPaginaLineas, LINEAS_POR_PAG, plantillaSelId, setPlantillaSelId, consecRefreshing, setConsecRefreshing, TIPOS_ASIENTO, totalDebe, totalHaber, balanceado, diffBalance, totalPags, lineasVisible, camposCompletos, setF, setL, addLinea, removeLinea, refreshConsecutivo, guardarComoPlantilla, cargarPlantilla, handleSave, NUM_COL };
}

export type EstadoCrearAsiento = ReturnType<typeof useCrearAsiento>;
