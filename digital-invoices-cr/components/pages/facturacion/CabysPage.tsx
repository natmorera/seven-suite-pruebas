'use client';
// Productos/Servicios: lo que la empresa factura (hospedaje, alimentos y
// bebidas, minibar, spa, tours…). Cada ítem lleva su CABYS, precio, moneda,
// unidad, IVA y grupo, así al armar una factura ya aparecen listos.
//   - «+ Nuevo producto o servicio» abre el formulario rápido; desde ahí se
//     puede pasar al formulario completo (pantalla propia).
//   - Clic en una fila abre el formulario completo para editar.
//   - «Descargar listado» baja los productos (con los filtros aplicados) a Excel.
//   - «Importar desde Excel» abre un modal: descargar la plantilla y subirla.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { C, FONT, Button, DataTable, DataRow, Td, StatusBadge, BulkActionBar, Toast, PageHeader, Modal, radius } from '@/components/ui/primitives';
import { IcTrash, IcEdit } from '@/components/ui/icons';
import { MontoCelda } from '@/components/ui/Monto';
import { UNIDADES, type ItemInventario } from './InventarioAvanzado';
import { descargarPlantilla, descargarListado, leerExcel, celda, numero } from '@/lib/excel';
import { CLAVE_AVISO } from './ProductoPantalla';
import ProductoRapidoModal from './ProductoRapidoModal';
import { useGrupos } from './GruposProductos';
import { useListaFiltrable } from '@/components/ui/ListaFiltrable';
import { usePermisos } from '@/lib/permisosCliente';

export type Favorito = ItemInventario;

const tipoDeCabys = (c: string) => (Number(c?.[0]) <= 4 ? 'Producto' : 'Servicio');

export default function CabysPage({ hideHeader, addSignal, plantillaSignal, importarSignal }: { hideHeader?: boolean; addSignal?: number; plantillaSignal?: number; importarSignal?: number } = {}) {
  const { puede } = usePermisos();
  const router = useRouter();
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [rapido, setRapido] = useState(false);
  const excelRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  // Modal de importación: plantilla + archivo + resultado
  const [modalImportar, setModalImportar] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: number; errores: string[] } | null>(null);
  const abrirImportar = () => { setArchivo(null); setResultado(null); setModalImportar(true); };

  const { grupos } = useGrupos();
  const [version, setVersion] = useState(0);
  const cargar = () => setVersion(v => v + 1);
  useEffect(() => {
    let vivo = true;
    fetch('/api/cabys-favoritos').then(r => r.json()).then(d => { if (vivo) { setItems(d); setCargando(false); } }).catch(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [version]);
  useEffect(() => {
    let vivo = true;
    // Aviso al volver del formulario completo
    try {
      const aviso = sessionStorage.getItem(CLAVE_AVISO);
      if (aviso) { sessionStorage.removeItem(CLAVE_AVISO); setTimeout(() => { if (vivo) setToast({ message: aviso, type: 'success' }); }, 0); }
    } catch { /* sin aviso */ }
    return () => { vivo = false; };
  }, []);

  // Señales de los botones del encabezado. «Nuevo» se atiende durante el
  // render; la plantilla y la importación son acciones sobre el navegador.
  const [senalNuevo, setSenalNuevo] = useState(addSignal);
  if (addSignal !== senalNuevo) { setSenalNuevo(addSignal); if (addSignal) abrirRapido(); }
  const [senalImportar, setSenalImportar] = useState(importarSignal);
  if (importarSignal !== senalImportar) { setSenalImportar(importarSignal); if (importarSignal) abrirImportar(); }

  function abrirRapido() { setRapido(true); }
  const abrirFicha = (id?: string) => router.push(id ? `/facturacion-config/producto?id=${id}` : '/facturacion-config/producto');

  async function quitar(id: string) {
    const it = items.find(x => x.id === id);
    if (!window.confirm(`¿Eliminar «${it?.nombre || it?.descripcion}»?`)) return;
    setItems(f => f.filter(x => x.id !== id));
    setSeleccion(s => { const n = new Set(s); n.delete(id); return n; });
    await fetch(`/api/cabys-favoritos/${id}`, { method: 'DELETE' });
  }
  async function quitarSeleccionados() {
    if (!window.confirm(`¿Eliminar ${seleccion.size} producto${seleccion.size === 1 ? '' : 's'} o servicio${seleccion.size === 1 ? '' : 's'}?`)) return;
    await Promise.all([...seleccion].map(id => fetch(`/api/cabys-favoritos/${id}`, { method: 'DELETE' })));
    setItems(f => f.filter(x => !seleccion.has(x.id)));
    setSeleccion(new Set());
  }

  // ── Excel ────────────────────────────────────────────────────────────────
  function plantilla() {
    descargarPlantilla('plantilla-productos-servicios.xlsx', [{
      nombre: 'Productos',
      columnas: [
        { titulo: 'Nombre*', ancho: 40, nota: 'Como aparece en la factura.' },
        { titulo: 'Código CABYS*', ancho: 16, nota: '13 dígitos del catálogo de Hacienda.' },
        { titulo: 'Grupo', ancho: 22, nota: grupos.length ? `Uno de estos: ${grupos.map(g => g.nombre).join(', ')}.` : 'Nombre de un grupo existente (opcional).' },
        { titulo: 'Unidad', ancho: 10, nota: UNIDADES.map(u => u.value).join(', ') },
        { titulo: 'Moneda', ancho: 8, nota: 'CRC o USD.' },
        { titulo: 'Precio sin IVA*', ancho: 14, nota: 'Con punto para los decimales: 1500.50' },
        { titulo: 'IVA %', ancho: 8, nota: '13, 4, 2, 1 o 0. Vacío: el del CABYS.' },
        { titulo: 'Código propio', ancho: 14, nota: 'Opcional.' },
        { titulo: 'Descripción', ancho: 40 },
      ],
      ejemplos: [
        ['Hospedaje habitación doble (noche)', '6311100000000', 'Hospedaje', 'Noche', 'USD', 95, 13, 'HAB-DBL', 'Dos camas matrimoniales'],
        ['Cena buffet', '6331000000000', 'Alimentos (restaurante)', 'Servicio', 'CRC', 16000, 13, 'AYB-CEN', ''],
        ['Minibar: jugo natural 300 ml', '6340002019900', 'Minibar (producto)', 'Unid', 'CRC', 2200, 13, 'MB-JUGO', ''],
      ],
    }], [
      'Llena una fila por producto o servicio en la hoja «Productos». Las columnas con * son obligatorias.',
      'No cambies los títulos de las columnas y borra las filas de ejemplo antes de subir el archivo.',
      'Luego, en Productos/Servicios, usa «Importar desde Excel» y sube este archivo.',
    ]);
  }
  // Listado actual (con los filtros aplicados), con las mismas columnas de la plantilla
  function exportar() {
    const filas = lista.filtrados;
    descargarListado(`productos-servicios-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Productos', [
      { titulo: 'Nombre', ancho: 40 }, { titulo: 'Código CABYS', ancho: 16 }, { titulo: 'Tipo', ancho: 10 }, { titulo: 'Grupo', ancho: 22 },
      { titulo: 'Unidad', ancho: 10 }, { titulo: 'Moneda', ancho: 8 }, { titulo: 'Precio sin IVA', ancho: 14 }, { titulo: 'IVA %', ancho: 8 },
      { titulo: 'Código propio', ancho: 14 }, { titulo: 'Descripción', ancho: 40 },
    ], filas.map(f => [f.nombre || f.descripcion, f.codigo, tipoDeCabys(f.codigo), nombreGrupo(f.grupo_id) ?? '', f.unidad_medida, f.moneda === 'USD' ? 'USD' : 'CRC',
      Number(f.precio_unitario) || 0, Number(f.impuesto), f.codigo_interno ?? '', f.descripcion_larga ?? '']));
    setToast({ message: `Se descargó el listado (${filas.length} producto${filas.length === 1 ? '' : 's'} o servicio${filas.length === 1 ? '' : 's'}).`, type: 'success' });
  }
  async function importarExcel(file: File) {
    setImportando(true);
    try {
      const filas = await leerExcel(file, 'Productos');
      let ok = 0; const errores: string[] = [];
      for (const [i, f] of filas.entries()) {
        const nombre = celda(f, 'Nombre');
        const cabys = celda(f, 'Código CABYS', 'CABYS').replace(/\D/g, '');
        const precio = numero(celda(f, 'Precio sin IVA', 'Precio'));
        if (!nombre || cabys.length !== 13) { errores.push(`fila ${i + 2}: falta el nombre o el CABYS`); continue; }
        const nombreGrupo = (celda(f, 'Grupo') || celda(f, 'Categoría')).trim().toLowerCase();
        const g = grupos.find(x => x.nombre.toLowerCase() === nombreGrupo);
        const ivaTxt = celda(f, 'IVA %', 'IVA');
        const propio = celda(f, 'Código propio', 'Código interno');
        const res = await fetch('/api/cabys-favoritos', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo: cabys, nombre, unidadMedida: celda(f, 'Unidad') || g?.unidad || 'Unid', moneda: (celda(f, 'Moneda') || g?.moneda || 'CRC').toUpperCase() === 'USD' ? 'USD' : 'CRC',
            precioUnitario: precio, ...(ivaTxt ? { impuesto: numero(ivaTxt) } : g ? { impuesto: g.impuesto } : {}), codigoInterno: propio, tipoCodigo: propio ? '04' : '',
            descripcionLarga: celda(f, 'Descripción'),
            cuentaIngreso: g?.cuenta_ingreso || '600-001-0001', ...(g ? { grupoId: g.id, cuentaCosto: g.cuenta_costo, centroCosto: g.centro_costo ?? '' } : { categoria: 'Otros' }),
          }),
        });
        if (res.ok) ok++; else errores.push(`fila ${i + 2}: ${(await res.json()).error ?? 'error'}`);
      }
      setResultado({ ok, errores });
      cargar();
    } catch {
      setResultado({ ok: 0, errores: ['No se pudo leer el archivo. Usa la plantilla de Excel.'] });
    } finally { setImportando(false); }
  }

  // ── Filtros (lineamientos: inmediatos, en la URL, con chips) ────────────
  const nombreGrupo = (id?: string) => grupos.find(g => g.id === id)?.nombre;
  const ivas = [...new Set(items.map(i => String(Number(i.impuesto))))].sort((a, b) => Number(b) - Number(a));
  const lista = useListaFiltrable({
    items, texto: f => `${f.codigo} ${f.codigo_interno ?? ''} ${f.nombre ?? ''} ${f.descripcion}`, placeholder: 'Buscar por nombre, código o CABYS',
    defs: [
      { tipo: 'lista', clave: 'grupo', label: 'Grupo CABYS', opciones: [...grupos.map(g => ({ value: g.id, label: g.nombre })), { value: 'sin', label: 'Sin grupo' }], valor: f => f.grupo_id || 'sin' },
      { tipo: 'lista', clave: 'tipo', label: 'Tipo', opciones: [{ value: 'Producto', label: 'Producto' }, { value: 'Servicio', label: 'Servicio' }], valor: f => tipoDeCabys(f.codigo) },
      { tipo: 'lista', clave: 'iva', label: 'IVA', opciones: ivas.map(v => ({ value: v, label: `${v}%` })), valor: f => String(Number(f.impuesto)) },
      { tipo: 'lista', clave: 'moneda', label: 'Moneda', opciones: [{ value: 'CRC', label: '₡ Colones' }, { value: 'USD', label: '$ Dólares' }], valor: f => f.moneda === 'USD' ? 'USD' : 'CRC' },
    ],
    derecha: importando ? <span style={{ fontSize: 12, color: C.n700 }}>Importando…</span> : undefined,
  });
  const todosMarcados = lista.filasPagina.length > 0 && lista.filasPagina.every(f => seleccion.has(f.id));
  // plantillaSignal: botón «Descargar listado» del encabezado de Facturación electrónica
  useEffect(() => { if (!plantillaSignal) return; const t = setTimeout(exportar, 0); return () => clearTimeout(t); }, [plantillaSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {!hideHeader && (
        <PageHeader title="Productos/Servicios">
          <Button variant="secondary" onClick={exportar}>Descargar listado</Button>
          <Button variant="secondary" onClick={abrirImportar}>Importar desde Excel</Button>
          <Button onClick={abrirRapido}>+ Nuevo producto o servicio</Button>
        </PageHeader>
      )}
      <input ref={excelRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setArchivo(f); setResultado(null); } e.target.value = ''; }} />
      {modalImportar && (
        <Modal open width={620} title="Importar productos y servicios" onClose={() => !importando && setModalImportar(false)}
          footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {resultado ? <Button onClick={() => setModalImportar(false)}>Listo</Button> : <>
              <Button variant="secondary" onClick={() => setModalImportar(false)} disabled={importando}>Cancelar</Button>
              <Button onClick={() => archivo && importarExcel(archivo)} disabled={!archivo || importando}>{importando ? 'Importando…' : 'Importar'}</Button>
            </>}
          </div>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
            {/* 1. Plantilla */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ width: 22, height: 22, borderRadius: 11, background: C.brandBg, color: C.brand, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Descarga la plantilla y llénala</div>
                <div style={{ fontSize: 12, color: C.n700, margin: '2px 0 8px' }}>Una fila por producto o servicio. Nombre, código CABYS y precio sin IVA son obligatorios; las instrucciones vienen en la segunda hoja.</div>
                <Button variant="secondary" onClick={plantilla}>Descargar plantilla</Button>
              </div>
            </div>
            {/* 2. Archivo */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ width: 22, height: 22, borderRadius: 11, background: C.brandBg, color: C.brand, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Sube el archivo</div>
                <div role="button" tabIndex={0} onClick={() => excelRef.current?.click()} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') excelRef.current?.click(); }}
                  onDragOver={e => { e.preventDefault(); setArrastrando(true); }} onDragLeave={() => setArrastrando(false)}
                  onDrop={e => { e.preventDefault(); setArrastrando(false); const f = e.dataTransfer.files?.[0]; if (f) { setArchivo(f); setResultado(null); } }}
                  style={{ border: `1.5px dashed ${arrastrando ? C.brand : C.n500}`, background: arrastrando ? C.brandBg : C.n200, borderRadius: radius.md, padding: '18px 16px', textAlign: 'center', cursor: 'pointer' }}>
                  {archivo ? (
                    <div style={{ fontSize: 12.5 }}><b style={{ fontWeight: 600 }}>{archivo.name}</b> <span style={{ color: C.n700 }}>· {(archivo.size / 1024).toFixed(0)} KB · </span><span style={{ color: C.brand, textDecoration: 'underline' }}>Cambiar</span></div>
                  ) : (
                    <div style={{ fontSize: 12.5, color: C.n700 }}>Arrastra el archivo aquí o <span style={{ color: C.brand, textDecoration: 'underline' }}>elígelo</span><div style={{ fontSize: 11, marginTop: 2 }}>.xlsx, .xls o .csv</div></div>
                  )}
                </div>
              </div>
            </div>
            {resultado && (
              <div style={{ fontSize: 12.5, borderRadius: radius.md, padding: '10px 14px', border: `1px solid ${resultado.errores.length ? C.errorBorder : C.brandBd}`, background: resultado.errores.length ? C.errorBg : C.brandBg }}>
                <b style={{ fontWeight: 600 }}>{resultado.ok ? `Se importaron ${resultado.ok} producto${resultado.ok === 1 ? '' : 's'} o servicio${resultado.ok === 1 ? '' : 's'}.` : 'No se importó ningún producto.'}</b>
                {resultado.errores.length > 0 && <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: C.error, maxHeight: 140, overflowY: 'auto' }}>{resultado.errores.map(x => <li key={x}>{x}</li>)}</ul>}
              </div>
            )}
          </div>
        </Modal>
      )}

      <BulkActionBar count={seleccion.size} onClose={() => setSeleccion(new Set())}
        actions={puede('fe.config.productos.eliminar') ? [{ label: 'Eliminar seleccionados', onClick: quitarSeleccionados, variant: 'danger' }] : []} />

      {lista.barra}
      {lista.chips}

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {cargando ? <p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p> : (
          <DataTable headers={['', 'Código', 'Producto o servicio', 'Grupo CABYS', 'Tipo', 'Unidad', 'Precio sin IVA', 'IVA', '']}>
            {lista.filasPagina.map(f => {
              return (
                <DataRow key={f.id} onClick={() => { if (puede('fe.config.productos.editar')) abrirFicha(f.id); }}>
                  <Td width="32px"><input type="checkbox" checked={seleccion.has(f.id)} onClick={e => e.stopPropagation()} onChange={e => setSeleccion(s => { const n = new Set(s); if (e.target.checked) n.add(f.id); else n.delete(f.id); return n; })} /></Td>
                  <Td muted><span style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{f.codigo_interno || '-'}</span></Td>
                  <Td>
                    <div style={{ fontWeight: 500 }}>{f.nombre || f.descripcion}</div>
                    <div style={{ fontSize: 10.5, color: C.n700, fontVariantNumeric: 'tabular-nums' }}>CABYS {f.codigo}{f.nombre ? ` · ${f.descripcion}` : ''}</div>
                  </Td>
                  <Td muted>{nombreGrupo(f.grupo_id) ?? 'Sin grupo'}</Td>
                  <Td muted>{tipoDeCabys(f.codigo)}</Td>
                  <Td muted>{f.unidad_medida}</Td>
                  <Td width="150px"><MontoCelda valor={f.precio_unitario} moneda={f.moneda} /></Td>
                  <Td><StatusBadge label={`${f.impuesto}%`} color={f.impuesto === 13 ? 'brand' : f.impuesto === 0 ? 'gray' : 'blue'} /></Td>
                  <Td right>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                      {puede('fe.config.productos.editar') && <button title="Editar" onClick={() => abrirFicha(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, display: 'inline-flex', padding: 4 }}><IcEdit className="w-3.5 h-3.5" /></button>}
                      {puede('fe.config.productos.eliminar') && <button title="Eliminar" onClick={() => quitar(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.error, display: 'inline-flex', padding: 4 }}><IcTrash className="w-4 h-4" /></button>}
                    </div>
                  </Td>
                </DataRow>
              );
            })}
            {lista.filtrados.length === 0 && (
              <DataRow><Td colSpan={9}>{lista.vacio('Todavía no hay productos ni servicios. Crea el primero o impórtalos desde Excel.')}</Td></DataRow>
            )}
          </DataTable>
        )}
        {lista.filasPagina.length > 0 && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: C.n700, marginTop: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={todosMarcados} onChange={e => setSeleccion(e.target.checked ? new Set(lista.filasPagina.map(f => f.id)) : new Set())} /> Seleccionar los de esta página
          </label>
        )}
      </div>
      {!cargando && lista.paginacion}

      {rapido && (
        <ProductoRapidoModal contexto="config" onClose={() => setRapido(false)}
          onCreado={f => { setRapido(false); setToast({ message: `Se creó «${f.nombre}».`, type: 'success' }); cargar(); }}
          onAvanzado={() => { setRapido(false); abrirFicha(); }} />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
