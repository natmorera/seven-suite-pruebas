'use client';
// Folios (Reservas): folios vinculados a reservas in-house y finalizadas.
import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, StatusBadge, Toast } from '@/components/suite/ui';
import { CheckFila, CheckTodos, useSeleccion } from '@/components/layout/Pantalla';
import { Buscador, Celda, Fila, FilaVacia, Paginacion, Tabla, norm, usePaginado } from '@/components/configuracion/kit';
import { RangoBoton, exportarCSV, usePrint } from '@/components/hotel/ui';
import { fmtF } from '@/components/hotel/datos';
import { fmtMon, r2 } from '@/components/hotel/finanzas';
import { Exportar, FiltroUno, HojaSistema, PaginaFact, TablaReporte, Tarjeta, tdR } from './comun';
import { useFolios, type FolioVista } from './folios/modelo';
import { PanelFolio, tituloNombre } from './folios/Panel';
import { MontoCelda, celdaMonto } from '@/components/suite/Monto';

export default function Folios() {
  return <Suspense fallback={null}><Pantalla /></Suspense>;
}

type Vista = 'abiertos' | 'casa' | 'agencias' | 'saldo' | 'excede' | 'cerrados' | 'todos';
const VISTAS: { id: Vista; label: string; de: (f: FolioVista) => boolean }[] = [
  { id: 'abiertos', label: 'Abiertos', de: f => f.estado === 'Abierto' },
  { id: 'casa', label: 'En casa', de: f => f.reserva?.estado === 'In-House' },
  { id: 'agencias', label: 'Agencias por cobrar', de: f => f.reserva?.estado === 'Completada' && f.estado === 'Abierto' && f.reserva.cliente === 'Agencia de Viajes' },
  { id: 'saldo', label: 'Con saldo', de: f => f.estado === 'Abierto' && f.saldo > 0.005 },
  { id: 'excede', label: 'Exceden crédito', de: f => !!f.limite && f.saldo > f.limite },
  { id: 'cerrados', label: 'Cerrados', de: f => f.estado === 'Cerrado' },
  { id: 'todos', label: 'Todos', de: () => true },
];

function Pantalla() {
  const { reservas } = useFolios();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [perfil, setPerfil] = useState('');
  const [entrada, setEntrada] = useState('');
  const [fin, setFin] = useState('');
  const [vista, setVista] = useState<Vista>(sp.get('q') ? 'todos' : 'abiertos');
  const [selId, setSelId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { imprimir, portal } = usePrint();

  const base = useMemo(() => reservas.filter(f => (!q || norm(`${f.numero} ${f.reservaNumero} ${f.nombre} ${f.habitacion}`).includes(norm(q))) && (!perfil || f.perfilId === perfil) &&
    (!entrada || f.emision >= entrada) && (!fin || f.vencimiento <= fin)), [reservas, q, perfil, entrada, fin]);
  const filas = useMemo(() => base.filter(VISTAS.find(v => v.id === vista)!.de)
    .sort((a, b) => (a.estado === b.estado ? b.saldo - a.saldo : a.estado === 'Abierto' ? -1 : 1)), [base, vista]);
  const pag = usePaginado(filas, 15);
  const sel = reservas.find(f => f.id === selId);
  const abiertos = reservas.filter(f => f.estado === 'Abierto');
  const pendiente = r2(abiertos.reduce((s, f) => s + Math.max(0, f.saldo), 0));
  const perfilesOpc = useMemo(() => [...new Map(reservas.filter(f => f.perfilId).map(f => [f.perfilId!, f.nombre])).entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label: tituloNombre(label) })), [reservas]);
  const hayFiltros = !!(q || perfil || entrada || fin);
  const s = useSeleccion();
  const csv = (xs: FolioVista[] = filas) => exportarCSV('folios-reservas', ['N° Folio', 'N° Reserva', 'Cliente', 'Habitación', 'Entrada', 'Salida', 'Factura electrónica', 'Estado', 'Cargos', 'Pagado', 'Saldo', 'Límite de crédito'],
    xs.map(f => [f.numero, f.reservaNumero, tituloNombre(f.nombre), f.habitacion, fmtF(f.emision), fmtF(f.vencimiento), f.factura ?? '', f.estado, f.totalCargos, f.totalPagado, f.saldo, f.limite]));
  const pdf = () => imprimir(
    <HojaSistema titulo="Folios de reservas" subtitulo={VISTAS.find(v => v.id === vista)!.label}>
      <TablaReporte headers={['N° Folio', 'N° Reserva', 'Cliente', 'Hab.', 'Fact. electrónica', 'Estado', 'Saldo', 'Límite crédito']} derecha={[6, 7]}>
        {filas.map(f => <tr key={f.id}><td style={tdR()}>{f.numero}</td><td style={tdR()}>{f.reservaNumero}</td><td style={tdR()}>{tituloNombre(f.nombre)}</td><td style={tdR()}>{f.habitacion}</td><td style={tdR()}>{f.factura ?? '-'}</td>
          <td style={tdR()}>{f.estado}</td><td style={tdR(true)}><MontoCelda texto={fmtMon(f.saldo)} /></td><td style={tdR(true)}>{celdaMonto(f.limite ? fmtMon(f.limite) : '-')}</td></tr>)}
      </TablaReporte>
    </HojaSistema>);

  return (
    <PaginaFact titulo="Folios (Reservas)" acciones={<Exportar onCSV={() => csv()} onPDF={pdf} disabled={!filas.length} />}
      filtros={<>
        <div style={{ width: 260 }}><Buscador value={q} onChange={setQ} placeholder="Cliente, habitación, folio o reserva" /></div>
        <FiltroUno label="Estado" value={vista} onChange={v => setVista((v || 'abiertos') as Vista)} todos={null} ancho={240}
          opciones={VISTAS.map(v => ({ value: v.id, label: `${v.label} (${base.filter(v.de).length})` }))} />
        <FiltroUno label="Perfil" value={perfil} onChange={setPerfil} opciones={perfilesOpc} ancho={280} />
        <RangoBoton label="Estancia" desde={entrada} hasta={fin} onChange={(d, h) => { setEntrada(d); setFin(h); }} />
        {hayFiltros && <button type="button" onClick={() => { setQ(''); setPerfil(''); setEntrada(''); setFin(''); }} style={{ border: 'none', background: 'none', color: C.error, fontSize: 12, cursor: 'pointer', fontFamily: FONT }}>Limpiar filtros</button>}
      </>}
      filtrosDerecha={<span style={{ fontSize: 12, color: C.n700 }}>Pendiente de cobro <b style={{ color: C.n900 }}>{fmtMon(pendiente)}</b> · {abiertos.length} abiertos</span>}
      seleccion={{ n: s.n, onLimpiar: s.limpiar, acciones: <Button variant="secondary" onClick={() => csv(filas.filter(f => s.tiene(f.id)))}>Exportar selección</Button> }}>
      <Tarjeta>
        <Tabla headers={[<CheckTodos key="t" s={s} ids={pag.visibles.map(f => f.id)} />, 'Cliente', 'Reserva', 'Estancia', 'Estado', 'Cargos', 'Pagado', 'Saldo', 'Crédito']} alinearDerecha={[5, 6, 7]} minWidth={1000}>
          {pag.visibles.length === 0 && <FilaVacia cols={9} texto="Ningún folio coincide con los filtros." />}
          {pag.visibles.map(f => {
            const excede = !!f.limite && f.saldo > f.limite;
            const uso = f.limite ? Math.min(1, Math.max(0, f.saldo) / f.limite) : 0;
            return (
              <Fila key={f.id} onClick={() => setSelId(f.id)} activa={f.id === selId}>
                <Celda style={{ width: 28 }}><CheckFila s={s} id={f.id} label={`Seleccionar ${f.numero}`} /></Celda>
                <Celda>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ minWidth: 44, height: 28, borderRadius: radius.sm, background: f.reserva?.estado === 'In-House' ? C.brand : C.n200, color: f.reserva?.estado === 'In-House' ? '#fff' : C.n700, fontSize: 11.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{f.habitacion || '—'}</span>
                    <span><span style={{ display: 'block', fontSize: 12.5, fontWeight: 500 }}>{tituloNombre(f.nombre)}</span><span style={{ fontSize: 11.5, color: C.n700 }}>Folio {f.numero}{f.factura ? ` · ${f.factura}` : ''}</span></span>
                  </span>
                </Celda>
                <Celda style={{ whiteSpace: 'nowrap' }}>{f.reserva ? <Link href={`/reservaciones/reservas?id=${f.reserva.id}`} onClick={e => e.stopPropagation()} style={{ color: C.brand, textDecoration: 'underline' }}>{f.reservaNumero}</Link> : f.reservaNumero}</Celda>
                <Celda style={{ whiteSpace: 'nowrap' }}>{fmtF(f.emision)} – <span style={{ color: f.estado === 'Abierto' && f.reserva?.estado === 'Completada' ? C.error : undefined }}>{fmtF(f.vencimiento)}</span></Celda>
                <Celda><StatusBadge label={f.reserva?.estado === 'In-House' ? 'En casa' : f.estado === 'Abierto' ? 'Por cobrar' : 'Cerrado'} color={f.reserva?.estado === 'In-House' ? 'brand' : f.estado === 'Abierto' ? 'yellow' : 'gray'} /></Celda>
                <Celda derecha><MontoCelda texto={fmtMon(f.totalCargos)} /></Celda>
                <Celda derecha muted><MontoCelda texto={fmtMon(f.totalPagado)} /></Celda>
                <Celda derecha><b style={{ fontWeight: 600, color: excede ? C.error : f.saldo > 0.005 ? C.n900 : '#0E7A57' }}>{celdaMonto(fmtMon(f.saldo))}</b></Celda>
                <Celda style={{ width: 120 }}>{f.limite ? <span title={`${Math.round(uso * 100)}% de ${fmtMon(f.limite)}`} style={{ display: 'block' }}>
                  <span style={{ display: 'block', fontSize: 11, color: excede ? C.error : C.n700 }}>{excede ? 'Excedido' : `${Math.round(uso * 100)}% de ${fmtMon(f.limite)}`}</span>
                  <span style={{ display: 'block', height: 4, background: C.n500, borderRadius: 2, marginTop: 4 }}><span style={{ display: 'block', width: `${uso * 100}%`, height: '100%', borderRadius: 2, background: excede ? C.error : uso > 0.8 ? '#E0A800' : C.brand }} /></span>
                </span> : <span style={{ color: C.n700 }}>—</span>}</Celda>
              </Fila>
            );
          })}
        </Tabla>
        <Paginacion pagina={pag.pagina} total={pag.total} onChange={pag.setPagina} filas={pag.filas} porPagina={pag.tam} />
      </Tarjeta>
      {sel && <PanelFolio key={sel.id} folio={sel} onClose={() => setSelId(null)} onToast={setToast} />}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      {portal}
    </PaginaFact>
  );
}
