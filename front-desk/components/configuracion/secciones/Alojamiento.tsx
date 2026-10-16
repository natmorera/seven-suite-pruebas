'use client';
import { TabsEnBarra } from '@/components/layout/Pantalla';
import { useRef, useState } from 'react';
import { Toast } from '@/components/suite/ui';
import { useDato } from '../store';
import { Camareras, Rangos } from './AmaDeLlaves';
import { CrudCatalogo } from '../CrudCatalogo';
import { ConfigCard, IcExcel, OutlineButton, descargarCSV, leerCSV, uid } from '../kit';
import { CENTROS_COSTO, MONEDAS_OPC, type Habitacion } from '../datos';

// Orden: lo físico (habitaciones y cómo se agrupan para vender) → servicios (regímenes) → ama de llaves (camareras y rangos).
const TABS = ['Habitaciones', 'Grupos de disponibilidad', 'Regímenes', 'Camareras / Mucamas', 'Rangos de habitación'] as const;
const AYUDA: Record<(typeof TABS)[number], string> = {
  'Habitaciones': 'Cada habitación física: tipo, servicio de facturación, características, centro de costos, adultos, niños, pax y color en el mapa.',
  'Grupos de disponibilidad': 'Agrupan habitaciones para mostrar y vender la disponibilidad por bloques (p. ej. Hotel, Cabañas).',
  'Regímenes': 'Planes de alimentación que se pueden vender con la habitación y su precio por persona.',
  'Camareras / Mucamas': 'Personal de limpieza que aparece en Ama de llaves para repartir las habitaciones.',
  'Rangos de habitación': 'Conjuntos de habitaciones que se asignan juntos a una camarera.',
};

export default function Alojamiento() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Habitaciones');
  return (
    <>
      <TabsEnBarra items={TABS} activo={tab} onChange={setTab} />
      <ConfigCard title={tab} subtitle={AYUDA[tab]}>
        {tab === 'Habitaciones' && <Habitaciones />}
        {tab === 'Grupos de disponibilidad' && <Grupos />}
        {tab === 'Regímenes' && <Regimenes />}
        {tab === 'Camareras / Mucamas' && <Camareras />}
        {tab === 'Rangos de habitación' && <Rangos />}
      </ConfigCard>
    </>
  );
}

const COLS_EXCEL = ['Código', 'Tipo', 'Servicio de facturación', 'Características (separadas por |)', 'Centro de costos', 'Adultos', 'Niños', 'Color'];

function Habitaciones() {
  const [habs, setHabs] = useDato('habitaciones');
  const [caract, setCaract] = useDato('caracteristicas');
  const [grupos] = useDato('gruposProd');
  const [toast, setToast] = useState<{ m: string; t: 'success' | 'error' } | null>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const servicios = grupos.find(g => g.nombre === 'Hospedaje')?.conceptos.map(c => c.descripcion) ?? [];

  const importar = async (f: File) => {
    try {
      if (!/\.csv$/i.test(f.name)) { setToast({ m: 'Guardá la plantilla como CSV (Excel → Guardar como → CSV) e importala de nuevo.', t: 'error' }); return; }
      const [cab, ...filas] = await leerCSV(f);
      if (!cab || norm(cab[0]) !== 'codigo') { setToast({ m: 'El archivo no tiene el formato de la plantilla.', t: 'error' }); return; }
      const existentes = new Set(habs.map(h => h.codigo));
      const nuevas: Habitacion[] = filas.filter(r => r[0] && !existentes.has(r[0].trim())).map(r => {
        const [codigo, tipo, servicio, car, centro, ad, ni, color] = r.map(x => (x ?? '').trim());
        const adultos = Number(ad) || 0, ninos = Number(ni) || 0;
        return { id: uid(), codigo, tipo, servicio, caracteristicas: car ? car.split('|').map(s => s.trim().toUpperCase()) : [], centroCosto: centro, adultos, ninos, pax: adultos + ninos, color: color || '#FFFFFF' };
      });
      setHabs([...habs, ...nuevas]);
      setCaract(c => [...c, ...nuevas.flatMap(n => n.caracteristicas).filter((x, i, a) => !c.includes(x) && a.indexOf(x) === i)]);
      const omitidas = filas.length - nuevas.length;
      setToast({ m: `${nuevas.length} habitaciones importadas${omitidas ? ` · ${omitidas} omitidas (ya existían o sin código)` : ''}`, t: 'success' });
    } catch { setToast({ m: 'No se pudo leer el archivo.', t: 'error' }); }
  };

  return (
    <>
      <CrudCatalogo<Habitacion>
        entidad="habitación" femenino filas={habs} onChange={setHabs} nombre={h => `${h.codigo} - ${h.tipo}`} buscarEn={['codigo', 'tipo']}
        nuevo={() => ({ codigo: '', tipo: '', servicio: '', caracteristicas: [], centroCosto: '', adultos: 0, ninos: 0, pax: 0, color: '#FFFFFF' })}
        acciones={<>
          <OutlineButton icon={<IcExcel />} onClick={() => archivo.current?.click()}>Importa Excel</OutlineButton>
          <OutlineButton onClick={() => descargarCSV('plantilla-habitaciones.csv', [COLS_EXCEL, ['101', 'Habitación estándar', servicios[0] ?? '', 'CAMA DOBLE|MINIBAR', CENTROS_COSTO[0], 2, 0, '#FFFFFF']])}>Plantilla</OutlineButton>
          <input ref={archivo} type="file" accept=".csv,.xlsx,.xls" hidden onChange={e => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = ''; }} />
        </>}
        columnas={[
          { key: 'codigo', label: 'Código', link: true, ancho: 70 },
          { key: 'tipo', label: 'Tipo' },
          { key: 'servicio', label: 'Serv. Facturación' },
          { key: 'caracteristicas', label: 'Características', tipo: 'lista' },
          { key: 'centroCosto', label: 'Centro de costos' },
          { key: 'adultos', label: 'Adultos', tipo: 'num0', ancho: 64 },
          { key: 'ninos', label: 'Niños', tipo: 'num0', ancho: 56 },
          { key: 'pax', label: 'Pax.', tipo: 'num0', ancho: 50 },
          { key: 'color', label: 'Color', tipo: 'color', ancho: 90 },
        ]}
        contador={false}
        campos={[
          { key: 'codigo', label: 'Código', requerido: true, unico: true, placeholder: 'Ej: 101' },
          { key: 'tipo', label: 'Tipo', requerido: true, placeholder: 'Ej: Habitación estándar' },
          { key: 'servicio', label: 'Servicio de Facturación', tipo: 'select', opciones: servicios },
          { key: 'caracteristicas', label: 'Características', tipo: 'multi', opciones: caract, crearLabel: 'Nueva característica',
            onCrear: t => { const v = t.toUpperCase(); setCaract(c => (c.includes(v) ? c : [...c, v])); return v; } },
          { key: 'centroCosto', label: 'Centro de costos', tipo: 'select', opciones: CENTROS_COSTO },
          { key: 'adultos', label: 'Adultos', tipo: 'number', span: 2 },
          { key: 'ninos', label: 'Niños', tipo: 'number', span: 2 },
          { key: 'pax', label: 'Pax', span: 2, calcular: h => h.adultos + h.ninos },
          { key: 'color', label: 'Color', tipo: 'color' },
        ]}
        validar={h => (h.adultos < 0 || h.ninos < 0 ? 'Adultos y niños no pueden ser negativos.' : undefined)}
      />
      {toast && <Toast message={toast.m} type={toast.t} onClose={() => setToast(null)} />}
    </>
  );
}

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function Grupos() {
  const [grupos, setGrupos] = useDato('gruposDisp');
  const [habs] = useDato('habitaciones');
  const opciones = habs.map(h => ({ value: h.codigo, label: h.tipo, detalle: h.codigo }));
  return (
    <CrudCatalogo
      entidad="grupo de disponibilidad" filas={[...grupos].sort((a, b) => a.orden - b.orden)} onChange={setGrupos} nombre={g => g.nombre} buscarEn={['nombre']}
      nuevo={() => ({ nombre: '', orden: grupos.length, habitaciones: [] as string[] })}
      columnas={[
        { key: 'nombre', label: 'Grupo', link: true },
        { key: 'orden', label: 'Orden', ancho: 80 },
        { key: 'habitaciones', label: 'Habitaciones seleccionadas', render: g => g.habitaciones.length === 1
          ? `${g.habitaciones[0]} - ${habs.find(h => h.codigo === g.habitaciones[0])?.tipo ?? ''}`
          : `${g.habitaciones.length} habitaciones` },
      ]}
      campos={[
        { key: 'nombre', label: 'Nombre del grupo', requerido: true, unico: true, placeholder: 'Ej: Hotel, Prueba', span: 4 },
        { key: 'orden', label: 'Orden', tipo: 'number', span: 2 },
        { key: 'habitaciones', label: 'Habitaciones', tipo: 'multi', opciones, placeholder: 'Seleccione habitaciones', requerido: true },
      ]}
    />
  );
}

function Regimenes() {
  const [regs, setRegs] = useDato('regimenes');
  const [grupos] = useDato('gruposProd');
  const conceptos = grupos.flatMap(g => g.conceptos.map(c => c.descripcion));
  return (
    <CrudCatalogo
      entidad="régimen" filas={regs} onChange={setRegs} nombre={r => `${r.codigo} - ${r.descripcion}`} buscarEn={['codigo', 'descripcion']}
      nuevo={() => ({ codigo: '', descripcion: '', concepto: '', tipo: '', moneda: MONEDAS_OPC[0], precio: 0 })}
      columnas={[
        { key: 'codigo', label: 'Código', link: true, ancho: 80 },
        { key: 'descripcion', label: 'Descripción' },
        { key: 'concepto', label: 'Concepto de producción' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'moneda', label: 'Moneda' },
        { key: 'precio', label: 'Precio', tipo: 'num' },
      ]}
      contador={false}
      campos={[
        { key: 'codigo', label: 'Código', requerido: true, unico: true, placeholder: 'Ej: DES', span: 2 },
        { key: 'descripcion', label: 'Descripción', requerido: true, placeholder: 'Ej: Desayuno', span: 4 },
        { key: 'concepto', label: 'Concepto de producción', tipo: 'select', opciones: ['Desayuno', ...conceptos], span: 3 },
        { key: 'tipo', label: 'Tipo', tipo: 'select', opciones: ['Diario', 'Primera noche', 'Última noche', 'Por estancia'], span: 3 },
        { key: 'moneda', label: 'Moneda', tipo: 'select', opciones: MONEDAS_OPC, span: 3 },
        { key: 'precio', label: 'Precio', tipo: 'number', span: 3 },
      ]}
    />
  );
}
