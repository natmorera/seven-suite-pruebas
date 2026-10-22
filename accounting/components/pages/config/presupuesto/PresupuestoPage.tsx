'use client';
import { useState, useEffect, useRef } from 'react';
import { PageHeader, Modal, Toast } from '@/components/ui/primitives';
import { Button, Select } from '@/components/ui/formulario';
import { Pagination } from '@/components/ui/tabla';
import { radius, C, TABLA } from '@/components/ui/tokens';
import { fmtNum } from '@/components/ui/formato';
import { SearchInput, BulkActionBar } from '@/components/ui/filtros';
import { IcImport, IcExport, IcCheck, IcCopy, IcTrash, IcCalendar, IcInfo } from '@/components/ui/icons';
import { MESES, type TipoPL, TIPOS_DE_CUENTA, TIPOS_DE_CUENTA_DEFAULT, EJERCICIOS_PRESUPUESTO, type EjercicioPresupuesto, type PresRow, INIT_ROWS } from '../presupuestoData';
import { useCentrosCostoConfig } from '@/components/pages/catalogo/centrosCostoConfig';
import { ModalExportar } from './ModalExportar';
import { F, type ProyectarParams, type RecalcParams, cloneRows, fmtCelda, labelCentro, soloCodigo } from './datos';
import { ModalImportar, ModalProyectar, ModalRecalcularGlobal, ModalRecalcularSeleccionadas } from './modales';
import { CeldaMonto, FiltroMultiSelect, TipoToggle } from './piezas';

// ── Página principal ──────────────────────────────────────────────────────────
export function PresupuestoPage() {
  const { centrosCosto } = useCentrosCostoConfig();
  // Cada ejercicio tiene su propia copia de filas; «Proyectar presupuesto» escribe en el año
  // destino (y lo crea si no estaba en la lista de ejercicios).
  const [ejerciciosList, setEjerciciosList] = useState<EjercicioPresupuesto[]>(EJERCICIOS_PRESUPUESTO);
  const [data, setData] = useState<Record<string, PresRow[]>>(() => ({
    '2026': cloneRows(INIT_ROWS), '2025': cloneRows(INIT_ROWS), '2024': cloneRows(INIT_ROWS),
  }));
  const [savedData, setSavedData] = useState<Record<string, PresRow[]>>(() => ({
    '2026': cloneRows(INIT_ROWS), '2025': cloneRows(INIT_ROWS), '2024': cloneRows(INIT_ROWS),
  }));
  const [ejercicio, setEjercicio] = useState('2026');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [tiposPL, setTiposPL] = useState<Set<TipoPL>>(new Set(['costos','gastos','ingresos']));
  const [tiposCuenta, setTiposCuenta] = useState<Set<string>>(new Set(TIPOS_DE_CUENTA_DEFAULT));
  const [centros, setCentros] = useState<Set<string>>(new Set()); // vacío = todos
  const [showImportar, setImportar] = useState(false);
  const [showExportar, setExportar] = useState(false);
  const [showRecalcGlobal, setRecalcGlobal] = useState(false);
  const [showRecalcSel, setRecalcSel] = useState(false);
  const [showProyectar, setProyectar] = useState(false);
  const [toast, setToast] = useState<{message:string;type:'success'|'error'}|null>(null);
  const [confirmDescartar, setConfirmDescartar] = useState(false);

  // Sincroniza el scroll vertical entre la tabla de columnas fijas y la de
  // meses (son dos tablas separadas, cada una con su propio scroll).
  const fixedScrollRef = useRef<HTMLDivElement>(null);
  const mesesScrollRef = useRef<HTMLDivElement>(null);
  function onScrollFixed(e: React.UIEvent<HTMLDivElement>) {
    if (mesesScrollRef.current && mesesScrollRef.current.scrollTop !== e.currentTarget.scrollTop) {
      mesesScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }
  function onScrollMeses(e: React.UIEvent<HTMLDivElement>) {
    if (fixedScrollRef.current && fixedScrollRef.current.scrollTop !== e.currentTarget.scrollTop) {
      fixedScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const ejercicioObj = ejerciciosList.find(e=>e.value===ejercicio);
  const isClosed = ejercicioObj?.cerrado ?? false;
  const rows = data[ejercicio] ?? [];
  const savedRows = savedData[ejercicio] ?? [];

  // Al cambiar de ejercicio, la selección y la página quedan referidas al set
  // de filas anterior - se limpian para evitar estados confusos.
  const [ejercicioPrevio, setEjercicioPrevio] = useState(ejercicio);
  if (ejercicio !== ejercicioPrevio) { setEjercicioPrevio(ejercicio); setSelected(new Set()); setPage(1); }

  function updateRows(fn: (rows: PresRow[]) => PresRow[]) {
    setData(prev => ({ ...prev, [ejercicio]: fn(prev[ejercicio] ?? []) }));
  }

  const filtered = rows.filter(r => {
    if (search && !r.descripcion.toLowerCase().includes(search.toLowerCase()) && !r.cuenta.includes(search)) return false;
    if (!tiposCuenta.has(r.tipoCuentaCodigo)) return false;
    if (centros.size > 0 && !centros.has(r.centroCostoId)) return false;
    if (!tiposPL.has(r.tipo)) return false;
    return true;
  });
  // Opciones para los buscadores de rango (lupa) - sobre TODAS las cuentas del
  // ejercicio actual, sin importar los filtros activos en la tabla.
  const cuentaOpciones = rows.map(r=>({ value:r.cuenta, label:`${r.cuenta} - ${r.descripcion}` }));
  const centroOpciones = centrosCosto.map(c=>({ value:c.codigo, label:`${c.codigo} - ${c.descripcion}` }));
  const totalPaginas = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginaActual = Math.min(page, totalPaginas);
  const paginated = filtered.slice((paginaActual-1)*pageSize, paginaActual*pageSize);
  const dirty = JSON.stringify(rows) !== JSON.stringify(savedRows);

  // Aviso del navegador si se intenta cerrar/recargar la pestaña con cambios
  // sin guardar en el ejercicio actual.
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) { e.preventDefault(); e.returnValue = ''; }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  function notify(message:string, type:'success'|'error'='success') { setToast({ message, type }); }

  function toggleRow(id:string) { if (isClosed) return; setSelected(s => { const n=new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }
  function toggleAll() { if (isClosed) return; setSelected(s => s.size===filtered.length && filtered.length>0 ? new Set() : new Set(filtered.map(r=>r.id))); }

  function updateValor(rowId:string, mesIdx:number, val:string) {
    if (isClosed) return;
    updateRows(rs => rs.map(r => r.id===rowId ? { ...r, valores:r.valores.map((v,i)=>i===mesIdx?(Number(val)||0):v) } : r));
  }

  function copiarEnero() {
    const filasSel = rows.filter(r=>selected.has(r.id));
    updateRows(rs => rs.map(r => selected.has(r.id) ? { ...r, valores:r.valores.map(()=>r.valores[0]) } : r));
    if (filasSel.length === 1) {
      notify(`Enero (₡${fmtNum(filasSel[0].valores[0])}) copiado a los 11 meses restantes`);
    } else {
      notify(`Enero copiado a los 11 meses restantes en ${filasSel.length} cuentas`);
    }
  }

  function limpiarSeleccionadas() {
    updateRows(rs => rs.map(r => selected.has(r.id) ? { ...r, valores:r.valores.map(()=>0) } : r));
    notify('Valores eliminados de las cuentas seleccionadas.');
  }

  function aplicarPct(valor:number, accion:'cero'|'aumentar'|'disminuir', pct:number) {
    if (accion==='cero') return 0;
    if (accion==='aumentar') return valor * (1 + pct/100);
    return valor * (1 - pct/100);
  }

  function recalcularGlobal(p: RecalcParams) {
    let afectadas = 0;
    updateRows(prev => prev.map(r => {
      if (p.rango && p.rango.inicial && p.rango.final && (r.cuenta < soloCodigo(p.rango.inicial) || r.cuenta > soloCodigo(p.rango.final))) return r;
      if (p.centro && p.centro.inicial && p.centro.final && (r.cg < soloCodigo(p.centro.inicial) || r.cg > soloCodigo(p.centro.final))) return r;
      if (p.tipoCuenta && r.tipoCuentaCodigo !== p.tipoCuenta) return r;
      afectadas++;
      const nuevosValores = r.valores.map((v,i) => (p.soloPeriodo===undefined || p.soloPeriodo===i) ? Math.round(aplicarPct(v,p.accion,p.pct)) : v);
      return { ...r, valores:nuevosValores };
    }));
    notify(`Recálculo aplicado a ${afectadas} cuenta${afectadas!==1?'s':''}.`);
  }

  function recalcularSeleccionadas(accion:'cero'|'aumentar'|'disminuir', pct:number) {
    updateRows(prev => prev.map(r => selected.has(r.id) ? { ...r, valores:r.valores.map(v=>Math.round(aplicarPct(v,accion,pct))) } : r));
    notify(`Recálculo aplicado a ${selected.size} cuenta${selected.size!==1?'s':''}.`);
  }

  // Proyectar SÍ escribe en el año destino (no en el ejercicio que se está
  // viendo): lee la base de `data[anioBase]` y guarda el resultado en
  // `data[anioDestino]`, creando ese ejercicio en el selector si hace falta.
  function proyectar(p: ProyectarParams) {
    const destinoObj = ejerciciosList.find(e=>e.value===p.anioDestino);
    if (destinoObj?.cerrado) {
      notify(`El ejercicio ${p.anioDestino} está cerrado - no se puede proyectar sobre él.`, 'error');
      return;
    }
    const base = data[p.anioBase] ?? [];
    let afectadas = 0;
    const nuevasFilas = base.map(r => {
      if (p.rango && p.rango.inicial && p.rango.final && (r.cuenta < soloCodigo(p.rango.inicial) || r.cuenta > soloCodigo(p.rango.final))) return r;
      if (p.tipoCuenta && r.tipoCuentaCodigo !== p.tipoCuenta) return r;
      afectadas++;
      const nuevosValores = r.valores.map((v,i) => {
        if (p.rangoPeriodo && (i < p.rangoPeriodo.desde || i > p.rangoPeriodo.hasta)) return v;
        if (p.accion === 'copiar') return v;
        return Math.round(aplicarPct(v, p.accion, p.pct));
      });
      return { ...r, valores:nuevosValores };
    });
    setData(prev => ({ ...prev, [p.anioDestino]: nuevasFilas }));
    if (!destinoObj) {
      setEjerciciosList(prev => [...prev, { value:p.anioDestino, cerrado:false }].sort((a,b)=>b.value.localeCompare(a.value)));
    }
    const mismoEjercicio = p.anioDestino === ejercicio ? ' Guardá los cambios para persistirlo.' : ` Cambiá "Ejercicio" a ${p.anioDestino} para revisarlo y guardarlo.`;
    notify(`Presupuesto proyectado de ${p.anioBase} a ${p.anioDestino} en ${afectadas} cuenta${afectadas!==1?'s':''}.${mismoEjercicio}`);
  }

  function guardarCambios() { setSavedData(prev => ({ ...prev, [ejercicio]: rows })); notify('Cambios guardados.'); }
  function descartarCambios() { setData(prev => ({ ...prev, [ejercicio]: savedRows })); notify('Cambios descartados.'); }

  const hayFiltrosActivos = !!search || centros.size>0 || tiposCuenta.size!==TIPOS_DE_CUENTA_DEFAULT.size || tiposPL.size!==3;
  function limpiarFiltros() {
    setSearch(''); setCentros(new Set()); setTiposCuenta(new Set(TIPOS_DE_CUENTA_DEFAULT)); setTiposPL(new Set(['costos','gastos','ingresos']));
  }

  return (
    <div style={{ height:'100%',display:'flex',flexDirection:'column',overflow:'hidden' }}>
      <PageHeader title="Presupuesto">
        <Button variant="secondary" onClick={()=>setImportar(true)} disabled={isClosed} icon={<IcImport className="w-3.5 h-3.5" />}>Importar</Button>
        <Button variant="secondary" onClick={()=>setExportar(true)} icon={<IcExport className="w-3.5 h-3.5" />}>Exportar</Button>
        <Button variant="secondary" onClick={()=>setRecalcGlobal(true)} disabled={isClosed}>Recalcular presupuesto</Button>
        <Button variant="secondary" onClick={()=>setProyectar(true)} disabled={isClosed}>Proyectar presupuesto</Button>
        {/* Cancelar / Guardar cambios, al final a la derecha y solo cuando hay cambios: es el
            único botón principal de la pantalla. */}
        {dirty && !isClosed && (
          <>
            <Button variant="secondary" onClick={()=>setConfirmDescartar(true)}>Cancelar</Button>
            <Button icon={<IcCheck className="w-3 h-3" />} onClick={guardarCambios}>Guardar cambios</Button>
          </>
        )}
      </PageHeader>

      {/* Barra de filtros */}
      <div style={{ padding:'8px 24px',background:C.n000,borderBottom:`1px solid ${C.n500}`,display:'flex',gap:10,alignItems:'center',flexShrink:0,flexWrap:'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por descripción…" width={200} />
        <div style={{ display:'flex',alignItems:'center',gap:6,flexShrink:0 }}>
          <span style={{ fontSize:12,color:C.n700 }}>Ejercicio</span>
          <Select ariaLabel="Ejercicio" value={ejercicio} onChange={setEjercicio}
            options={[...ejerciciosList].sort((a,b)=>b.value.localeCompare(a.value)).map(e=>({ value:e.value, label:e.value + (e.cerrado?' (cerrado)':'') }))} />
        </div>
        <FiltroMultiSelect label="Tipo de cuenta"
          items={TIPOS_DE_CUENTA.map(t=>({ id:t.codigo, label:`${t.codigo} - ${t.nombre}`, count:t.cuentas }))}
          selected={tiposCuenta} onApply={setTiposCuenta} />
        <FiltroMultiSelect label="Centro de costos"
          items={centrosCosto.map(c=>({ id:c.id, label:`${c.codigo} - ${c.descripcion}` }))}
          selected={centros} onApply={setCentros} />
        <TipoToggle value={tiposPL} onChange={setTiposPL} />
        {hayFiltrosActivos && (
          <button onClick={limpiarFiltros}
            style={{ height:28, padding:'0 10px', border:'none', background:C.errorBg, color:C.error, borderRadius:radius.sm, cursor:'pointer', fontSize:11, fontFamily:F, flexShrink:0 }}>
            × Limpiar filtros
          </button>
        )}
      </div>

      {/* Banner ejercicio cerrado */}
      {isClosed && (
        <div style={{ padding:'8px 24px',background:'rgba(33,150,243,.06)',borderBottom:'1px solid rgba(33,150,243,.2)',display:'flex',alignItems:'center',gap:8,flexShrink:0 }}>
          <span style={{ color:'#1565c0',display:'flex' }}><IcInfo className="w-3.5 h-3.5" /></span>
          <span style={{ fontSize:12,color:'#1565c0' }}>El ejercicio {ejercicio} está cerrado. Podés ver los datos pero no editarlos.</span>
        </div>
      )}

      {/* Barra de selección - componente compartido BulkActionBar */}
      {selected.size > 0 && !isClosed && (
        <BulkActionBar count={selected.size} onClose={()=>setSelected(new Set())} actions={[
          { label:'Copiar enero a todos los meses', icon:<IcCopy className="w-3.5 h-3.5" />, onClick:copiarEnero },
          { label:'Recalcular seleccionadas', icon:<IcCalendar className="w-3.5 h-3.5" />, onClick:()=>setRecalcSel(true) },
          { label:'Limpiar seleccionadas', icon:<IcTrash className="w-3.5 h-3.5" />, variant:'danger', onClick:limpiarSeleccionadas },
        ]}/>
      )}

      {/* Tabla - Cuenta/Centro/Descripción van en una tabla fija aparte (no con
          "sticky", que en tablas HTML tiene bugs conocidos de renderizado) y
          los 12 meses en otra con su propio scroll horizontal. Ambas comparten
          el mismo scroll vertical mediante los refs de abajo. */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', background:'#FFFFFF', padding:'0 24px', gap:0 }}>
        {/* Columnas fijas */}
        <div ref={fixedScrollRef} onScroll={onScrollFixed} style={{ flexShrink:0, overflowY:'auto', overflowX:'hidden', borderRight:`1px solid ${C.n500}`, background:'#FFFFFF' }}>
          <table className="tabla" style={{ borderCollapse:'separate', borderSpacing:0, fontSize:12, fontFamily:F, background:'#FFFFFF' }}>
            <thead>
              <tr>
                <th style={{ position:'sticky', top:0, zIndex:1, padding:'10px 12px',textAlign:'left',fontSize:11,fontWeight:500,color:C.n700,borderBottom:`1px solid ${C.n500}`,width:30,background:C.n000 }}>
                  <input type="checkbox" aria-label="Seleccionar" checked={selected.size===filtered.length && filtered.length>0} onChange={toggleAll} disabled={isClosed} style={{ accentColor:C.brand }} />
                </th>
                <th style={{ position:'sticky', top:0, zIndex:1, padding:'10px 12px',textAlign:'left',fontSize:11,fontWeight:500,color:C.n700,borderBottom:`1px solid ${C.n500}`,width:130,whiteSpace:'nowrap',background:C.n000 }}>Cuenta</th>
                <th title="Centro de costos asociado a la cuenta" style={{ position:'sticky', top:0, zIndex:1, padding:'10px 12px',textAlign:'left',fontSize:11,fontWeight:500,color:C.n700,borderBottom:`1px solid ${C.n500}`,width:90,whiteSpace:'nowrap',background:C.n000,cursor:'help' }}>Centro</th>
                <th style={{ position:'sticky', top:0, zIndex:1, padding:'10px 12px',textAlign:'left',fontSize:11,fontWeight:500,color:C.n700,borderBottom:`1px solid ${C.n500}`,width:220,background:C.n000 }}>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(r => {
                const filaBg = selected.has(r.id) ? C.brandBg : '#FFFFFF';
                return (
                  <tr key={r.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                    <td style={{ padding:'6px 12px', background:filaBg, width:30 }}><input type="checkbox" aria-label="Seleccionar" checked={selected.has(r.id)} onChange={()=>toggleRow(r.id)} disabled={isClosed} style={{ accentColor:C.brand }} /></td>
                    <td style={{ padding:'6px 12px',color:C.n900,fontWeight:500,whiteSpace:'nowrap', background:filaBg, width:130 }}>{r.cuenta}</td>
                    <td style={{ padding:'6px 12px',color:C.n700,whiteSpace:'nowrap', background:filaBg, width:90 }} title={labelCentro(centrosCosto, r.centroCostoId)}>{r.cg}</td>
                    <td style={{ padding:'6px 12px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap', background:filaBg, width:220 }} title={r.descripcion}>{r.descripcion}</td>
                  </tr>
                );
              })}
              {paginated.length===0 && <tr><td style={{ height:1 }}></td></tr>}
            </tbody>
          </table>
        </div>

        {/* Meses - con su propio scroll horizontal */}
        <div ref={mesesScrollRef} onScroll={onScrollMeses} style={{ flex:1, overflow:'auto', background:'#FFFFFF' }}>
          <table className="tabla" style={{ borderCollapse:'separate', borderSpacing:0, fontSize:12, fontFamily:F, minWidth:'max-content', width:'100%', background:'#FFFFFF' }}>
            <thead>
              <tr>
                {MESES.map((m,i) => <th key={i} style={{ position:'sticky', top:0, zIndex:1, padding:'10px 12px',textAlign:'right',fontSize:11,fontWeight:500,color:C.n700,borderBottom:`1px solid ${C.n500}`,minWidth:130,background:C.n000 }}>{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {paginated.length===0 && (
                <tr><td colSpan={12} style={TABLA.empty}>Sin cuentas para los filtros seleccionados.</td></tr>
              )}
              {paginated.map(r => {
                const filaBg = selected.has(r.id) ? C.brandBg : '#FFFFFF';
                return (
                  <tr key={r.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                    {r.valores.map((v,i) => (
                      <td key={i} style={{ padding:'4px 6px',textAlign:'right', background:filaBg }}>
                        {isClosed
                          ? <span style={{ color:v<0?C.error:C.n900 }}>{fmtCelda(v)}</span>
                          : <CeldaMonto value={v} onChange={val=>updateValor(r.id,i,String(val))} />
                        }
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer - solo paginación, completo a lo ancho */}
      <div style={{ background:C.n000,borderTop:`1px solid ${C.n500}`,display:'flex',alignItems:'center',padding:'8px 24px',gap:16,flexShrink:0 }}>
        <Pagination page={paginaActual} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize}/>
        <span style={{ fontSize:12, color:C.n700, flexShrink:0 }}>{filtered.length} cuenta{filtered.length!==1?'s':''}</span>
      </div>

      {confirmDescartar && (
        <Modal open title="Descartar cambios" onClose={()=>setConfirmDescartar(false)}
          footer={<div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
            <Button variant="secondary" onClick={()=>setConfirmDescartar(false)}>Cancelar</Button>
            <Button icon={<IcTrash className="w-3 h-3" />} onClick={()=>{ descartarCambios(); setConfirmDescartar(false); }}>Sí, descartar</Button>
          </div>}>
          <p style={{ fontSize:13, color:C.n900, margin:0 }}>
            Se van a perder los cambios sin guardar en el ejercicio {ejercicio}. Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}

      {showImportar && <ModalImportar onClose={()=>setImportar(false)} onImportar={()=>notify('Presupuesto importado correctamente.')} />}
      {showExportar && <ModalExportar rows={filtered} todasLasCuentas={rows} ejercicio={ejercicio} centrosCosto={centrosCosto} onClose={()=>setExportar(false)} />}
      {showRecalcGlobal && <ModalRecalcularGlobal cuentaOpciones={cuentaOpciones} centroOpciones={centroOpciones} onClose={()=>setRecalcGlobal(false)} onAplicar={recalcularGlobal} />}
      {showRecalcSel && <ModalRecalcularSeleccionadas cantidad={selected.size} onClose={()=>setRecalcSel(false)} onAplicar={recalcularSeleccionadas} />}
      {showProyectar && <ModalProyectar ejercicioActual={ejercicio} cuentaOpciones={cuentaOpciones} onClose={()=>setProyectar(false)} onAplicar={proyectar} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  );
}
