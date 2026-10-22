'use client';
import { useState, useRef } from 'react';
import { ANULADOS_INIT, ASIENTOS_INIT, type Asiento, COLS_DEF, type CrearAsientoInitial, IMPORTE_DEFAULT, IMPORTE_MAX, type ImporteRange, type LineaAsiento, MON_SYM, type Moneda, PLANTILLAS_INIT, PROGRAMADOS_INIT, type Plantilla, type Programado, TIPOS_LABEL, type ToastType, fmtDMY, fmtInt } from './datos';

export function useBandeja() {
  const [tab, setTab] = useState<'pendientes'|'anulados'|'programados'|'plantillas'>('pendientes');
  const [asientos, setAsientos] = useState<Asiento[]>(ASIENTOS_INIT);
  const [anulados, setAnulados] = useState<Asiento[]>(ANULADOS_INIT);
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [searchQ, setSearch] = useState('');

  // Filtros funcionales
  const [filtMoneda,  setFiltMoneda]  = useState<Set<string>>(new Set());
  const [filtTipo,    setFiltTipo]    = useState<Set<string>>(new Set());
  const [filtOrigen,  setFiltOrigen]  = useState<Set<string>>(new Set());
  const [filtUsuario, setFiltUsuario] = useState<Set<string>>(new Set());
  const [filtCC,      setFiltCC]      = useState<Set<string>>(new Set());
  const [filtFecha,   setFiltFecha]   = useState({ from:'', to:'' });
  const [filtImporte, setFiltImporte] = useState<ImporteRange>(IMPORTE_DEFAULT);

  // Filtros funcionales - Anulados (mismo patrón que Pendientes, con estado propio e independiente)
  const [searchQA,     setSearchA]     = useState('');
  const [filtMonedaA,  setFiltMonedaA]  = useState<Set<string>>(new Set());
  const [filtTipoA,    setFiltTipoA]    = useState<Set<string>>(new Set());
  const [filtOrigenA,  setFiltOrigenA]  = useState<Set<string>>(new Set());
  const [filtUsuarioA, setFiltUsuarioA] = useState<Set<string>>(new Set());
  const [filtFechaA,   setFiltFechaA]   = useState({ from:'', to:'' });
  const [filtImporteA, setFiltImporteA] = useState<ImporteRange>(IMPORTE_DEFAULT);

  // Paginación - Pendientes y Anulados
  const [porPagina,   setPorPagina]   = useState(10);
  const [pagina,      setPagina]      = useState(1);
  const [porPaginaA,  setPorPaginaA]  = useState(10);
  const [paginaA,     setPaginaA]     = useState(1);

  // Programados y Plantillas - lifted a estado para que sean editables/eliminables/usables
  const [programados, setProgramados] = useState<Programado[]>(PROGRAMADOS_INIT);
  const [plantillas,  setPlantillas]  = useState<Plantilla[]>(PLANTILLAS_INIT);
  // a Programados y Plantillas les faltaba su propia barra de
  // búsqueda (las demás pestañas ya la tienen) - un solo campo de texto,
  // sin los filtros avanzados de Pendientes/Anulados porque estas listas
  // son mucho más chicas y no los necesitan.
  const [searchProg,  setSearchProg]  = useState('');
  const [filtFrecuencia, setFiltFrecuencia] = useState<Set<string>>(new Set());
  const [soloActivos, setSoloActivos] = useState(false);
  const [searchPlant, setSearchPlant] = useState('');
  const [filtMonedaPlant, setFiltMonedaPlant] = useState<Set<string>>(new Set());
  const [editProgramado,  setEditProgramado]  = useState<Programado|null>(null);
  const [delProgramado,   setDelProgramado]   = useState<Programado|null>(null);
  const [editPlantilla,   setEditPlantilla]   = useState<Plantilla|null>(null);
  const [delPlantilla,    setDelPlantilla]    = useState<Plantilla|null>(null);
  const [crearInitial,    setCrearInitial]    = useState<CrearAsientoInitial|null>(null);

  // Drawers
  const [detalle,     setDetalle]     = useState<{ a:Asiento; anulado:boolean }|null>(null);
  const [crearOpen,   setCrearOpen]   = useState(false);
  const [importarOpen, setImportarOpen] = useState(false);
  const [nuevoOpen,   setNuevoOpen]   = useState(false);
  const [exportarOpen, setExportarOpen] = useState(false);

  // Modales confirmación
  const [modalAnular,    setModalAnular]    = useState<Asiento[]|null>(null);
  const [modalContabilizar, setModalContabilizar] = useState<Asiento[]|null>(null);

  // Adjuntos y correo - acciones rápidas por fila
  const [modalAdjuntosRow, setModalAdjuntosRow] = useState<{ a:Asiento; anulado:boolean }|null>(null);
  const [modalCorreo,      setModalCorreo]      = useState<Asiento|null>(null);

  // Toasts
  const [toasts, setToasts] = useState<{id:number;type:ToastType;msg:string}[]>([]);
  const toastId = useRef(0);
  function addToast(msg: string, type: ToastType='success') {
    const id = ++toastId.current;
    setToasts(p=>[...p,{ id, type, msg }]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)), 4000);
  }

  // Lista filtrada
  // Para pendientes solo mostramos los NO contabilizados
  const pendientes = asientos.filter(a => !a.contabilizado).filter(a => {
    if (searchQ && !a.titulo.toLowerCase().includes(searchQ.toLowerCase()) && !a.consecutivo.includes(searchQ) && !a.usuario.includes(searchQ.toLowerCase()) && !a.documento.toLowerCase().includes(searchQ.toLowerCase())) return false;
    if (filtMoneda.size > 0  && !filtMoneda.has(a.moneda))         return false;
    if (filtTipo.size > 0    && !filtTipo.has(TIPOS_LABEL[a.tipo])) return false;
    if (filtOrigen.size > 0  && !filtOrigen.has(a.origen))         return false;
    if (filtUsuario.size > 0 && !filtUsuario.has(a.usuario))       return false;
    if (filtFecha.from && a.fecha < filtFecha.from) return false;
    if (filtFecha.to   && a.fecha > filtFecha.to)   return false;
    if ((filtImporte.min>0 || filtImporte.max<IMPORTE_MAX)) {
      if (a.moneda !== filtImporte.moneda) return false;
      if (a.importe < filtImporte.min || a.importe > filtImporte.max) return false;
    }

    return true;
  });

  const totalCRC = pendientes.filter(a=>a.moneda==='CRC').reduce((s,a)=>s+a.importe,0);
  const totalUSD = pendientes.filter(a=>a.moneda==='USD').reduce((s,a)=>s+a.importe,0);


  // Anulados - filtros funcionales propios (mismo patrón que Pendientes)
  const anuladosFiltrados = anulados.filter(a => {
    if (searchQA && !a.titulo.toLowerCase().includes(searchQA.toLowerCase()) && !a.consecutivo.includes(searchQA) && !a.usuario.includes(searchQA.toLowerCase()) && !a.documento.toLowerCase().includes(searchQA.toLowerCase())) return false;
    if (filtMonedaA.size > 0  && !filtMonedaA.has(a.moneda))          return false;
    if (filtTipoA.size > 0    && !filtTipoA.has(TIPOS_LABEL[a.tipo])) return false;
    if (filtOrigenA.size > 0  && !filtOrigenA.has(a.origen))          return false;
    if (filtUsuarioA.size > 0 && !filtUsuarioA.has(a.usuario))        return false;
    if (filtFechaA.from && a.fecha < filtFechaA.from) return false;
    if (filtFechaA.to   && a.fecha > filtFechaA.to)   return false;
    if (filtImporteA.min>0 || filtImporteA.max<IMPORTE_MAX) {
      if (a.moneda !== filtImporteA.moneda) return false;
      if (a.importe < filtImporteA.min || a.importe > filtImporteA.max) return false;
    }
    return true;
  });
  const totalCRC_A = anuladosFiltrados.filter(a=>a.moneda==='CRC').reduce((s,a)=>s+a.importe,0);

  // Programados y Plantillas filtrados por su barra de búsqueda 
  const programadosFiltrados = programados.filter(p => {
    if (!(!searchProg || p.nombre.toLowerCase().includes(searchProg.toLowerCase()) || p.frecuencia.toLowerCase().includes(searchProg.toLowerCase()))) return false;
    if (filtFrecuencia.size > 0 && !filtFrecuencia.has(p.frecuencia)) return false;
    if (soloActivos && !p.activo) return false;
    return true;
  });
  const plantillasFiltradas = plantillas.filter(t => {
    if (!(!searchPlant || t.nombre.toLowerCase().includes(searchPlant.toLowerCase()))) return false;
    if (filtMonedaPlant.size > 0 && !filtMonedaPlant.has(t.moneda)) return false;
    return true;
  });

  // Reset de página al cambiar filtros/búsqueda
  // (se compara una clave de los filtros con la anterior y, si cambió, se vuelve a la página 1)
  const claveFiltros = JSON.stringify([searchQ, [...filtMoneda], [...filtTipo], [...filtOrigen], [...filtUsuario], filtFecha, filtImporte, [...filtCC]]);
  const claveFiltrosA = JSON.stringify([searchQA, [...filtMonedaA], [...filtTipoA], [...filtOrigenA], [...filtUsuarioA], filtFechaA, filtImporteA]);
  const [clavePrev, setClavePrev] = useState(claveFiltros);
  const [clavePrevA, setClavePrevA] = useState(claveFiltrosA);
  if (claveFiltros !== clavePrev) { setClavePrev(claveFiltros); setPagina(1); }
  if (claveFiltrosA !== clavePrevA) { setClavePrevA(claveFiltrosA); setPaginaA(1); }

  // Paginación aplicada
  const totalPagsP = Math.max(1, Math.ceil(pendientes.length / porPagina));
  const paginaClamp = Math.min(pagina, totalPagsP);
  const pendientesVisibles = pendientes.slice((paginaClamp-1)*porPagina, paginaClamp*porPagina);
  const totalPagsA = Math.max(1, Math.ceil(anuladosFiltrados.length / porPaginaA));
  const paginaAClamp = Math.min(paginaA, totalPagsA);
  const anuladosVisibles = anuladosFiltrados.slice((paginaAClamp-1)*porPaginaA, paginaAClamp*porPaginaA);

  function handleSelectAll(checked: boolean) { setSeleccion(checked?new Set(pendientes.map(a=>a.id)):new Set()); }
  function handleSelectOne(id: number) { setSeleccion(p=>{ const n=new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }

  function handleAnular(motivo: string, targets?: Asiento[]) {
    const items = targets ?? modalAnular ?? [];
    if (items.length === 0) return;
    const ids = new Set(items.map(a=>a.id));
    setAsientos(p=>p.filter(a=>!ids.has(a.id)));
    setAnulados(p=>[...p, ...items.map(a=>({...a, motivoAnulacion:motivo}))]);
    addToast(items.length>1 ? `${items.length} asientos anulados.` : `Asiento ${items[0].consecutivo} anulado.`, 'warning');
    setModalAnular(null);
    setSeleccion(new Set());
    setDetalle(null);
  }
  // Duplicar abre el formulario completo de Crear asiento, precargado con todos los datos
  // del asiento original (título, moneda, líneas, origen, documento, observación). El número
  // de asiento SIEMPRE se genera de nuevo al guardar (genConsecutivo), así que nunca comparte
  // consecutivo con el original - el usuario revisa/edita y confirma antes de guardar.
  function openDuplicar(a: Asiento) {
    setCrearInitial({
      titulo: a.titulo,
      moneda: a.moneda,
      lineas: a.lineas.map((l,i)=>({ ...l, id: Date.now()+i })),
      origen: a.origen,
      documento: a.documento,
      observacion: a.observacion,
      duplicadoDe: a.consecutivo,
    });
    setCrearOpen(true);
    setDetalle(null);
  }
  function handleEnviarCorreo(a: Asiento, email: string) {
    addToast(`Asiento ${a.consecutivo} enviado por correo a ${email}.`, 'success');
    setModalCorreo(null);
  }
  // Contabilizar siempre pasa por ContabilizarModal (preview de los asientos afectados),
  // igual que Anular - sirve tanto para una fila individual como para selección masiva.
  function handleContabilizar(targets: Asiento[]) {
    if (targets.length === 0) return;
    const ids = new Set(targets.map(a=>a.id));
    setAsientos(p=>p.map(a=>ids.has(a.id)?{...a,contabilizado:true}:a));
    addToast(targets.length>1 ? `${targets.length} asientos contabilizados.` : `Asiento ${targets[0].consecutivo} contabilizado.`, 'success');
    setSeleccion(new Set());
    setModalContabilizar(null);
    if (detalle && ids.has(detalle.a.id)) setDetalle(p=>p?{...p,a:{...p.a,contabilizado:true}}:null);
  }
  function handleDescontabilizar(id: number) {
    setAsientos(p=>p.map(a=>a.id===id?{...a,contabilizado:false}:a));
    addToast('Asiento enviado a Pendientes.','info');
    if (detalle) setDetalle(p=>p?{...p,a:{...p.a,contabilizado:false}}:null);
  }
  function handleRestaurar(a: Asiento) {
    // Al restaurarlo, el asiento deja de tener motivo de anulación
    const resto: Asiento = { ...a, motivoAnulacion: undefined };
    setAnulados(p=>p.filter(x=>x.id!==a.id));
    setAsientos(p=>[...p, resto]);
    addToast(`Asiento ${a.consecutivo} restaurado.`,'info');
    setDetalle(null);
  }
  function handleUpdateArchivos(id: number, archivos: string[], isAnulado: boolean) {
    if (isAnulado) setAnulados(p=>p.map(a=>a.id===id?{...a,archivos}:a));
    else           setAsientos(p=>p.map(a=>a.id===id?{...a,archivos}:a));
    if (detalle && detalle.a.id===id) setDetalle(p=>p?{...p,a:{...p.a,archivos}}:null);
  }

  // Plantillas
  function handleSavePlantilla(p: Plantilla) { setPlantillas(prev=>[...prev, p]); }
  function handleUsarPlantilla(p: Plantilla) {
    setCrearInitial({ titulo:p.nombre, moneda:p.moneda, lineas:p.lineas });
    setCrearOpen(true);
  }
  function handleGuardarEditPlantilla(id: string, nombre: string, moneda: Moneda, lineas: LineaAsiento[]) {
    setPlantillas(prev=>prev.map(p=>p.id===id?{...p, nombre, moneda, lineas, cuentas:lineas.length, ultima:new Date().toLocaleDateString('es-CR')}:p));
    addToast('Plantilla actualizada.','success');
    setEditPlantilla(null);
  }
  function handleEliminarPlantilla(p: Plantilla) {
    setPlantillas(prev=>prev.filter(x=>x.id!==p.id));
    addToast(`Plantilla "${p.nombre}" eliminada.`,'warning');
    setDelPlantilla(null);
  }

  // Programados
  function handleToggleProgramado(id: string) {
    setProgramados(prev=>prev.map(p=>p.id===id?{...p, activo:!p.activo}:p));
  }
  function handleGuardarEditProgramado(id: string, nombre: string, frecuencia: string, proxima: string, moneda: Moneda) {
    setProgramados(prev=>prev.map(p=>p.id===id?{...p, nombre, frecuencia, proxima, moneda}:p));
    addToast('Programación actualizada.','success');
    setEditProgramado(null);
  }
  function handleEliminarProgramado(p: Programado) {
    setProgramados(prev=>prev.filter(x=>x.id!==p.id));
    addToast(`Programación "${p.nombre}" eliminada.`,'warning');
    setDelProgramado(null);
  }

  const visibles = COLS_DEF.filter(c=>c.visible);
  const tieneSeleccion = seleccion.size > 0;

  // Resumen de filtros activos - se muestra en el modal de exportar de Pendientes
  const resumenFiltros: string[] = [];
  if (filtTipo.size)    resumenFiltros.push(`Tipo: ${[...filtTipo].join(', ')}`);
  if (filtFecha.from || filtFecha.to) resumenFiltros.push(`Fecha: ${filtFecha.from?fmtDMY(filtFecha.from):'…'} - ${filtFecha.to?fmtDMY(filtFecha.to):'…'}`);
  if (filtImporte.min>0 || filtImporte.max<IMPORTE_MAX) resumenFiltros.push(`Importe (${filtImporte.moneda}): ${MON_SYM[filtImporte.moneda]}${fmtInt(filtImporte.min)} – ${MON_SYM[filtImporte.moneda]}${fmtInt(filtImporte.max)}`);
  if (filtOrigen.size)  resumenFiltros.push(`Origen: ${[...filtOrigen].join(', ')}`);
  if (filtMoneda.size)  resumenFiltros.push(`Moneda: ${[...filtMoneda].join(', ')}`);
  if (filtUsuario.size) resumenFiltros.push(`Usuario: ${[...filtUsuario].join(', ')}`);
  if (filtCC.size)      resumenFiltros.push(`Centro de costos: ${[...filtCC].join(', ')}`);
  if (searchQ)          resumenFiltros.push(`Búsqueda: "${searchQ}"`);

  // Resumen de filtros activos - versión propia para el modal de exportar de Anulados
  const resumenFiltrosA: string[] = [];
  if (filtTipoA.size)    resumenFiltrosA.push(`Tipo: ${[...filtTipoA].join(', ')}`);
  if (filtFechaA.from || filtFechaA.to) resumenFiltrosA.push(`Fecha: ${filtFechaA.from?fmtDMY(filtFechaA.from):'…'} - ${filtFechaA.to?fmtDMY(filtFechaA.to):'…'}`);
  if (filtOrigenA.size)  resumenFiltrosA.push(`Origen: ${[...filtOrigenA].join(', ')}`);
  if (filtMonedaA.size)  resumenFiltrosA.push(`Moneda: ${[...filtMonedaA].join(', ')}`);
  if (filtUsuarioA.size) resumenFiltrosA.push(`Usuario: ${[...filtUsuarioA].join(', ')}`);
  if (filtImporteA.min>0 || filtImporteA.max<IMPORTE_MAX) resumenFiltrosA.push(`Importe (${filtImporteA.moneda}): ${MON_SYM[filtImporteA.moneda]}${fmtInt(filtImporteA.min)} – ${MON_SYM[filtImporteA.moneda]}${fmtInt(filtImporteA.max)}`);
  if (searchQA)          resumenFiltrosA.push(`Búsqueda: "${searchQA}"`);
  return { tab, setTab, asientos, setAsientos, anulados, setAnulados, seleccion, setSeleccion, searchQ, setSearch, filtMoneda, setFiltMoneda, filtTipo, setFiltTipo, filtOrigen, setFiltOrigen, filtUsuario, setFiltUsuario, filtCC, setFiltCC, filtFecha, setFiltFecha, filtImporte, setFiltImporte, searchQA, setSearchA, filtMonedaA, setFiltMonedaA, filtTipoA, setFiltTipoA, filtOrigenA, setFiltOrigenA, filtUsuarioA, setFiltUsuarioA, filtFechaA, setFiltFechaA, filtImporteA, setFiltImporteA, porPagina, setPorPagina, pagina, setPagina, porPaginaA, setPorPaginaA, paginaA, setPaginaA, programados, setProgramados, plantillas, setPlantillas, searchProg, setSearchProg, filtFrecuencia, setFiltFrecuencia, soloActivos, setSoloActivos, searchPlant, setSearchPlant, filtMonedaPlant, setFiltMonedaPlant, editProgramado, setEditProgramado, delProgramado, setDelProgramado, editPlantilla, setEditPlantilla, delPlantilla, setDelPlantilla, crearInitial, setCrearInitial, detalle, setDetalle, crearOpen, setCrearOpen, importarOpen, setImportarOpen, nuevoOpen, setNuevoOpen, exportarOpen, setExportarOpen, modalAnular, setModalAnular, modalContabilizar, setModalContabilizar, modalAdjuntosRow, setModalAdjuntosRow, modalCorreo, setModalCorreo, toasts, setToasts, toastId, addToast, pendientes, totalCRC, totalUSD, anuladosFiltrados, totalCRC_A, programadosFiltrados, plantillasFiltradas, claveFiltros, claveFiltrosA, clavePrev, setClavePrev, clavePrevA, setClavePrevA, totalPagsP, paginaClamp, pendientesVisibles, totalPagsA, paginaAClamp, anuladosVisibles, handleSelectAll, handleSelectOne, handleAnular, openDuplicar, handleEnviarCorreo, handleContabilizar, handleDescontabilizar, handleRestaurar, handleUpdateArchivos, handleSavePlantilla, handleUsarPlantilla, handleGuardarEditPlantilla, handleEliminarPlantilla, handleToggleProgramado, handleGuardarEditProgramado, handleEliminarProgramado, visibles, tieneSeleccion, resumenFiltros, resumenFiltrosA };
}

export type EstadoBandeja = ReturnType<typeof useBandeja>;
