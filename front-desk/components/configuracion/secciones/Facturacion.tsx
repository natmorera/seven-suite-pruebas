'use client';
import { BarraSeccion, TabsEnBarra } from '@/components/layout/Pantalla';
import { BotonExportar, exportarCSV } from '@/components/hotel/ui';
import { useState } from 'react';
import { C } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Modal, Select } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { useDato } from '../store';
import { Buscador, Campo, Celda, ConfigCard, Contador, Fila, FilaVacia, Grid, IcTrash, IconButton, ItemMaestro, OutlineButton, Tabla, norm, uid, useConfirmar } from '../kit';
import { CUENTAS_OPC, MONEDAS_OPC, type Concepto, type GrupoProd } from '../datos';
import { Servicios } from './FacturacionServicios';
import { Descuentos, Exoneracion, FoliosExternos, Impuestos, TiposCobro } from './FacturacionCobros';
import { CabeceraDetalle, MaestroDetalle, ops } from './FacturacionPiezas';

const TABS = ['Producción', 'Servicios', 'Tipos de cobro', 'Impuestos', 'Exoneración', 'Descuentos', 'Folios externos'] as const;
/** Una línea por pestaña: el título de la tarjeta es la pestaña (no se repite «Facturación»). */
const AYUDA: Record<(typeof TABS)[number], string> = {
  'Producción': 'Grupos → conceptos → cuentas contables. Elige un grupo o concepto para editarlo.',
  'Servicios': 'Servicios que se cargan a las cuentas: precios por moneda, impuestos y descuentos.',
  'Tipos de cobro': 'Formas de pago que acepta la caja y su cuenta contable.',
  'Impuestos': 'Impuestos que se aplican a los conceptos y servicios.',
  'Exoneración': 'Tipos de exoneración de impuestos para clientes autorizados.',
  'Descuentos': 'Descuentos que se pueden aplicar a cargos y servicios.',
  'Folios externos': 'Tipos de folio externo, su moneda y su cuenta contable.',
};

export default function Facturacion() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Producción');
  return (
    <ConfigCard title={tab} subtitle={AYUDA[tab]}>
      <TabsEnBarra items={TABS} activo={tab} onChange={setTab} />
      {tab === 'Producción' && <Produccion />}
      {tab === 'Servicios' && <Servicios />}
      {tab === 'Tipos de cobro' && <TiposCobro />}
      {tab === 'Impuestos' && <Impuestos />}
      {tab === 'Exoneración' && <Exoneracion />}
      {tab === 'Descuentos' && <Descuentos />}
      {tab === 'Folios externos' && <FoliosExternos />}
    </ConfigCard>
  );
}

// ── Producción: Grupos → Conceptos → Cuentas contables ─────────────────────
function Produccion() {
  const [grupos, setGrupos] = useDato('gruposProd');
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState<string>(grupos[0]?.id ?? '');
  const [sel, setSel] = useState<{ g: string; c?: string }>({ g: grupos[0]?.id ?? '', c: grupos[0]?.conceptos[0]?.id });
  const [modal, setModal] = useState<'grupo' | 'concepto' | null>(null);
  const [nuevo, setNuevo] = useState({ descripcion: '', grupo: '' });
  const [buscarMsg, setBuscarMsg] = useState('');
  const { pedir, dialogo } = useConfirmar();

  const grupo = grupos.find(g => g.id === sel.g);
  const concepto = grupo?.conceptos.find(c => c.id === sel.c);
  const setGrupo = (id: string, f: (g: GrupoProd) => GrupoProd) => setGrupos(gs => gs.map(g => (g.id === id ? f(g) : g)));
  const setConcepto = (p: Partial<Concepto>) => grupo && concepto && setGrupo(grupo.id, g => ({ ...g, conceptos: g.conceptos.map(c => (c.id === concepto.id ? { ...c, ...p } : c)) }));
  const moverA = (nombreGrupo: string) => {
    const destino = grupos.find(g => g.nombre === nombreGrupo);
    if (!grupo || !concepto || !destino || destino.id === grupo.id) return;
    setGrupos(gs => gs.map(g => g.id === grupo.id ? { ...g, conceptos: g.conceptos.filter(c => c.id !== concepto.id) }
      : g.id === destino.id ? { ...g, conceptos: [...g.conceptos, { ...concepto, agrupadoEn: destino.nombre }] } : g));
    setSel({ g: destino.id, c: concepto.id }); setAbierto(destino.id);
  };
  const crear = () => {
    const d = nuevo.descripcion.trim();
    if (!d) return;
    if (modal === 'grupo') {
      const g: GrupoProd = { id: uid(), nombre: d, conceptos: [] };
      setGrupos(gs => [...gs, g]); setSel({ g: g.id }); setAbierto(g.id);
    } else {
      const destino = grupos.find(g => g.id === nuevo.grupo) ?? grupo;
      if (!destino) return;
      const c: Concepto = { id: uid(), descripcion: d.toUpperCase(), activo: true, agrupadoEn: destino.nombre, codigoTributario: '',
        monedas: [{ id: uid(), moneda: MONEDAS_OPC[0], ctaProduccion: '', ctaCasa: '' }] };
      setGrupo(destino.id, g => ({ ...g, conceptos: [...g.conceptos, c] })); setSel({ g: destino.id, c: c.id }); setAbierto(destino.id);
    }
    setModal(null); setNuevo({ descripcion: '', grupo: '' });
  };
  const filtrados = grupos.filter(g => !q || norm(g.nombre).includes(norm(q)) || g.conceptos.some(c => norm(c.descripcion).includes(norm(q))));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <MaestroDetalle titulo="Grupos y conceptos" contador={filtrados.length} lista={<>
        <BarraSeccion filtros={<Buscador value={q} onChange={setQ} placeholder="Buscar grupo o concepto" width={240} />}
          derecha={<span style={{ fontSize: 12, color: C.n700 }}>{filtrados.length} grupos · {filtrados.reduce((n, g) => n + g.conceptos.length, 0)} conceptos</span>}
          acciones={<>
            <BotonExportar disabled={!filtrados.length} titulo="Grupos y conceptos de producción" onCSV={() => exportarCSV('conceptos-produccion', ['Grupo', 'Concepto', 'Código tributario', 'Activo', 'Monedas'], filtrados.flatMap(g => g.conceptos.map(c => [g.nombre, c.descripcion, c.codigoTributario, c.activo ? 'Sí' : 'No', c.monedas.map(m => m.moneda).join(' ')])))} />
            <Button variant="secondary" icon={<IcPlus size={12} />} onClick={() => { setNuevo({ descripcion: '', grupo: '' }); setModal('grupo'); }}>Grupo</Button>
            <Button icon={<IcPlus size={12} />} disabled={!grupos.length} onClick={() => { setNuevo({ descripcion: '', grupo: sel.g }); setModal('concepto'); }}>Concepto</Button>
          </>} />
        <div>
          {filtrados.map(g => (
            <div key={g.id}>
              <ItemMaestro titulo={g.nombre} detalle="Grupo de producción" activo={sel.g === g.id && !sel.c} extra={<Contador n={g.conceptos.length} />}
                onClick={() => { setAbierto(abierto === g.id && sel.g === g.id && !sel.c ? '' : g.id); setSel({ g: g.id }); }} />
              {(abierto === g.id || q) && g.conceptos.filter(c => !q || norm(c.descripcion).includes(norm(q)) || norm(g.nombre).includes(norm(q))).map(c => (
                <ItemMaestro key={c.id} indent titulo={c.descripcion} activo={sel.c === c.id} onClick={() => setSel({ g: g.id, c: c.id })} />
              ))}
            </div>
          ))}
        </div>
      </>}>
        {grupo && !concepto && (
          <>
            <CabeceraDetalle titulo={grupo.nombre} sub={`Grupo de producción · ${grupo.conceptos.length} conceptos`}
              onEliminar={() => pedir('Eliminar grupo', grupo.conceptos.length ? `«${grupo.nombre}» tiene ${grupo.conceptos.length} conceptos que también se eliminarán. ¿Continuar?` : `¿Eliminar «${grupo.nombre}»?`,
                () => { setGrupos(gs => gs.filter(g => g.id !== grupo.id)); setSel({ g: '' }); })} />
            <Campo label="Descripción"><Input value={grupo.nombre} onChange={v => setGrupo(grupo.id, g => ({ ...g, nombre: v, conceptos: g.conceptos.map(c => ({ ...c, agrupadoEn: v })) }))} /></Campo>
            <Tabla headers={['Concepto', 'Activo', 'Código tributario']}>
              {grupo.conceptos.length === 0 && <FilaVacia cols={3} texto="Este grupo no tiene conceptos. Usa «+ Concepto»." />}
              {grupo.conceptos.map(c => (
                <Fila key={c.id} onClick={() => setSel({ g: grupo.id, c: c.id })}><Celda>{c.descripcion}</Celda><Celda>{c.activo ? 'Sí' : 'No'}</Celda><Celda muted>{c.codigoTributario || '-'}</Celda></Fila>
              ))}
            </Tabla>
          </>
        )}
        {grupo && concepto && (
          <>
            <CabeceraDetalle titulo={concepto.descripcion} sub={`Grupo de producción: ${grupo.nombre}`}
              onEliminar={() => pedir('Eliminar concepto', `¿Eliminar «${concepto.descripcion}»?`, () => { setGrupo(grupo.id, g => ({ ...g, conceptos: g.conceptos.filter(c => c.id !== concepto.id) })); setSel({ g: grupo.id }); })} />
            <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>Información básica</p>
            <Checkbox checked={concepto.activo} onChange={b => setConcepto({ activo: b })} label="Activo en producción" />
            <Grid cols={2}>
              <Campo label="Descripción"><Input value={concepto.descripcion} onChange={v => setConcepto({ descripcion: v })} /></Campo>
              <Campo label="Agrupado en"><Select value={grupo.nombre} onChange={moverA} options={ops(grupos.map(g => g.nombre))} /></Campo>
            </Grid>
            <Campo label="Código tributario (facturación electrónica)" hint={buscarMsg || 'Código CABYS de 13 dígitos'}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Input value={concepto.codigoTributario} onChange={v => { setConcepto({ codigoTributario: v.replace(/\D/g, '').slice(0, 13) }); setBuscarMsg(''); }} placeholder="Ej: 6311100000000" />
                <OutlineButton onClick={() => setBuscarMsg(/^\d{13}$/.test(concepto.codigoTributario) ? 'Formato válido. Se validará contra el catálogo CABYS de Hacienda al guardar.' : 'El código debe tener 13 dígitos.')}>Buscar</OutlineButton>
              </div>
            </Campo>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>Monedas</p>
              <OutlineButton icon={<IcPlus size={12} />} disabled={concepto.monedas.length >= MONEDAS_OPC.length}
                onClick={() => setConcepto({ monedas: [...concepto.monedas, { id: uid(), moneda: MONEDAS_OPC.find(m => !concepto.monedas.some(x => x.moneda === m)) ?? MONEDAS_OPC[0], ctaProduccion: '', ctaCasa: '' }] })}>Nueva moneda</OutlineButton>
            </div>
            <Tabla headers={['Moneda', 'Cuenta de producción', 'Cuenta de casa', '']} anchos={{ 0: 190, 3: 40 }}>
              {concepto.monedas.map(m => {
                const setM = (p: Partial<typeof m>) => setConcepto({ monedas: concepto.monedas.map(x => (x.id === m.id ? { ...x, ...p } : x)) });
                return (
                  <Fila key={m.id}>
                    <Celda><Select value={m.moneda} onChange={v => setM({ moneda: v })} options={ops(MONEDAS_OPC)} /></Celda>
                    <Celda><Select value={m.ctaProduccion} onChange={v => setM({ ctaProduccion: v })} options={[{ value: '', label: 'Ingrese cta' }, ...ops(CUENTAS_OPC)]} /></Celda>
                    <Celda><Select value={m.ctaCasa} onChange={v => setM({ ctaCasa: v })} options={[{ value: '', label: 'Ingrese cta' }, ...ops(CUENTAS_OPC)]} /></Celda>
                    <Celda><IconButton label="Quitar moneda" tono="peligro" onClick={() => setConcepto({ monedas: concepto.monedas.filter(x => x.id !== m.id) })}><IcTrash /></IconButton></Celda>
                  </Fila>
                );
              })}
            </Tabla>
          </>
        )}
        {!grupo && <p style={{ fontSize: 12, color: C.n700 }}>Selecciona un grupo de producción.</p>}
      </MaestroDetalle>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'grupo' ? 'Nuevo grupo de producción' : 'Nuevo concepto de producción'} width={440}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button><Button onClick={crear} disabled={!nuevo.descripcion.trim()}>Guardar</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Campo label="Descripción" required><Input value={nuevo.descripcion} onChange={v => setNuevo({ ...nuevo, descripcion: v })} placeholder={modal === 'grupo' ? 'Ej: Servicios Hospedaje' : 'Ej: HOSPEDAJE HAB DELUXE'} autoFocus /></Campo>
          {modal === 'concepto' && <Campo label="Agrupado en"><Select value={nuevo.grupo} onChange={v => setNuevo({ ...nuevo, grupo: v })} options={grupos.map(g => ({ value: g.id, label: g.nombre }))} /></Campo>}
        </div>
      </Modal>
      {dialogo}
    </div>
  );
}
