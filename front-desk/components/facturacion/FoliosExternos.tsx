'use client';
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckFila, CheckTodos, useSeleccion } from '@/components/layout/Pantalla';
import { C, FONT } from '@/components/suite/tokens';
import { Button, StatusBadge, Toast } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { Buscador, Celda, Fila, FilaVacia, Tabla, norm } from '@/components/configuracion/kit';
import { exportarCSV, usePrint } from '@/components/hotel/ui';
import { HOY, fmtF, sumarDias } from '@/components/hotel/datos';
import { fmtMon, r2 } from '@/components/hotel/finanzas';
import { Exportar, FiltroUno, HojaSistema, KpiChip, Kpi, PaginaFact, TablaReporte, Tarjeta, tdR } from './comun';
import { useFolios, type FolioVista } from './folios/modelo';
import { PanelFolio, tituloNombre } from './folios/Panel';
import { NuevoFolioExterno } from './folios/NuevoFolioExterno';

export default function FoliosExternos() {
  return <Suspense fallback={null}><Pantalla /></Suspense>;
}

const ORDEN = [{ value: 'numero', label: 'Número' }, { value: 'perfil', label: 'Perfil' }, { value: 'vencimiento', label: 'Vencimiento' }, { value: 'saldo', label: 'Saldo' }];

function Pantalla() {
  const { cuentas } = useFolios();
  const sp = useSearchParams();
  const externos = useMemo(() => cuentas.filter(c => c.clase === 'externo'), [cuentas]);
  const [selId, setSelId] = useState<string | null>(() => { const n = sp.get('folio'); return n ? `fx-${n}` : null; });
  const [q, setQ] = useState('');
  const [orden, setOrden] = useState('numero');
  const [estado, setEstado] = useState('');
  const s = useSeleccion();
  const [nuevo, setNuevo] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { imprimir, portal } = usePrint();
  const sel = externos.find(f => f.id === selId);
  const abiertos = externos.filter(f => f.estado === 'Abierto');
  const kpi = {
    activos: abiertos.length, saldo: r2(abiertos.reduce((s, f) => s + f.saldo, 0)),
    porVencer: abiertos.filter(f => f.vencimiento >= HOY && f.vencimiento <= sumarDias(HOY, 30)).length,
    credito: abiertos.filter(f => f.limite > 0 && f.saldo > f.limite).length,
  };
  const filas = useMemo(() => externos.filter(f => (!q || norm(`${f.numero} ${f.nombre} ${f.fiscal.numeroId}`).includes(norm(q))) && (!estado || f.estado === estado)).sort((a, b) =>
    orden === 'perfil' ? a.nombre.localeCompare(b.nombre) : orden === 'vencimiento' ? a.vencimiento.localeCompare(b.vencimiento) : orden === 'saldo' ? b.saldo - a.saldo : a.numero.localeCompare(b.numero)), [externos, q, orden, estado]);
  const csv = (xs: FolioVista[] = filas) => exportarCSV('folios-externos', ['N° Folio', 'Perfil', 'Emisión', 'Vencimiento', 'Límite de crédito', 'Tipo', 'Cuenta', 'Estado', 'Saldo'],
    xs.map(f => [f.numero, f.nombre, fmtF(f.emision), fmtF(f.vencimiento), f.limite, f.tipo, f.cuenta, f.estado, f.saldo]));
  const pdf = () => imprimir(
    <HojaSistema titulo="Reporte de Información Básica de Folios" subtitulo="Listado general de folios registrados en el sistema">
      <TablaReporte headers={['N° Folio', 'Perfil', 'Vencimiento', 'Límite de crédito', 'Tipo', 'Cuenta', 'Saldo', 'Estado']} derecha={[3, 6]}>
        {filas.map(f => <tr key={f.id}><td style={tdR(false, { fontWeight: 600 })}>{f.numero}</td><td style={tdR()}>{f.nombre}</td><td style={tdR()}>{fmtF(f.vencimiento)}</td><td style={tdR(true)}>{f.limite ? fmtMon(f.limite) : '-'}</td>
          <td style={tdR()}>{f.tipo}</td><td style={tdR()}>{f.cuenta}</td><td style={tdR(true)}>{fmtMon(f.saldo)}</td><td style={tdR(false, { color: f.estado === 'Abierto' ? '#2E7D32' : C.n700, fontWeight: 600 })}>{f.estado.toUpperCase()}</td></tr>)}
      </TablaReporte>
    </HojaSistema>);
  const link = (f: FolioVista) => <button type="button" onClick={e => { e.stopPropagation(); setSelId(f.id === selId ? null : f.id); }} style={{ border: 'none', background: 'none', padding: 0, color: C.brand, textDecoration: 'underline', cursor: 'pointer', fontFamily: FONT, fontSize: 12 }}>{f.numero}</button>;
  const venc = (f: FolioVista) => <span style={{ color: f.estado === 'Abierto' && f.vencimiento < HOY ? C.error : undefined }}>{fmtF(f.vencimiento)}</span>;

  return (
    <PaginaFact titulo="Folios externos" acciones={<>
      <Exportar onCSV={() => csv()} onPDF={pdf} disabled={!filas.length} />
      <Button icon={<IcPlus size={12} />} onClick={() => setNuevo(true)}>Nuevo folio externo</Button>
    </>} filtros={<>
      <div style={{ width: 280 }}><Buscador value={q} onChange={setQ} placeholder="Cliente, folio o identificación" /></div>
      <FiltroUno label="Estado" value={estado} onChange={setEstado} opciones={[{ value: 'Abierto', label: 'Abierto' }, { value: 'Cerrado', label: 'Cerrado' }]} />
      <FiltroUno label="Ordenar" value={orden} onChange={v => setOrden(v || 'numero')} opciones={ORDEN} todos={null} />
      {(q || estado) && <Button variant="ghost" style={{ color: C.error }} onClick={() => { setQ(''); setEstado(''); }}>Limpiar filtros</Button>}
    </>} filtrosDerecha={<span style={{ fontSize: 12, color: C.n700 }}>{filas.length} folios</span>}
      seleccion={{ n: s.n, onLimpiar: s.limpiar, acciones: <Button variant="secondary" onClick={() => csv(filas.filter(f => s.tiene(f.id)))}>Exportar selección</Button> }}>
      <Tarjeta style={{ flexDirection: 'row', gap: 44, flexWrap: 'wrap', padding: '16px 20px' }}>
        <KpiChip label="Folios activos" n={kpi.activos} chip="Externos abiertos" />
        <KpiChip label="Por vencer" n={kpi.porVencer} chip="Próximos 30 días" tono="gray" />
        <KpiChip label="En crédito" n={kpi.credito} chip="Límite excedido" tono="red" />
        <Kpi label="Saldo total">{fmtMon(kpi.saldo)}</Kpi>
      </Tarjeta>
      <Tarjeta>
        <Tabla headers={[<CheckTodos key="t" s={s} ids={filas.map(f => f.id)} />, 'Cliente', 'Vencimiento', 'Tipo', 'Cuenta', 'Estado', 'Saldo', 'Crédito']} alinearDerecha={[6]} minWidth={980}>
          {filas.length === 0 && <FilaVacia cols={8} texto="Ningún folio coincide con la búsqueda." />}
          {filas.map(f => {
            const excede = !!f.limite && f.saldo > f.limite;
            const uso = f.limite ? Math.min(1, Math.max(0, f.saldo) / f.limite) : 0;
            return (
              <Fila key={f.id} onClick={() => setSelId(f.id)} activa={f.id === selId}>
                <Celda style={{ width: 28 }}><CheckFila s={s} id={f.id} label={`Seleccionar ${f.numero}`} /></Celda>
                <Celda><span style={{ display: 'block', fontSize: 12.5, fontWeight: 500 }}>{tituloNombre(f.nombre)}</span><span style={{ fontSize: 11.5, color: C.n700 }}>Folio {link(f)}{f.fiscal.numeroId ? ` · ${f.fiscal.numeroId}` : ''}</span></Celda>
                <Celda style={{ whiteSpace: 'nowrap' }}>{venc(f)}</Celda>
                <Celda style={{ maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.tipo}</Celda>
                <Celda muted style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.cuenta}</Celda>
                <Celda><StatusBadge label={f.estado} color={f.estado === 'Abierto' ? 'green' : 'gray'} /></Celda>
                <Celda derecha><b style={{ fontWeight: 600, color: excede ? C.error : C.n900 }}>{fmtMon(f.saldo)}</b></Celda>
                <Celda style={{ width: 120 }}>{f.limite ? <span title={`${Math.round(uso * 100)}% de ${fmtMon(f.limite)}`} style={{ display: 'block' }}>
                  <span style={{ display: 'block', fontSize: 11, color: excede ? C.error : C.n700 }}>{excede ? 'Excedido' : `${Math.round(uso * 100)}% de ${fmtMon(f.limite)}`}</span>
                  <span style={{ display: 'block', height: 4, background: C.n500, borderRadius: 2, marginTop: 4 }}><span style={{ display: 'block', width: `${uso * 100}%`, height: '100%', borderRadius: 2, background: excede ? C.error : uso > 0.8 ? '#E0A800' : C.brand }} /></span>
                </span> : <span style={{ color: C.n700 }}>—</span>}</Celda>
              </Fila>
            );
          })}
        </Tabla>
      </Tarjeta>
      {sel && <PanelFolio key={sel.id} folio={sel} onClose={() => setSelId(null)} onToast={setToast} onEliminado={() => { setSelId(null); setToast('Cuenta eliminada'); }} />}
      {nuevo && <NuevoFolioExterno onClose={() => setNuevo(false)} onListo={(id, t) => { setNuevo(false); setSelId(id); setToast(t); }} />}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      {portal}
    </PaginaFact>
  );
}
