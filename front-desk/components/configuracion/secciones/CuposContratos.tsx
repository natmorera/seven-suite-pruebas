'use client';
// Contratos › Cupos y precios directos: por tipo de habitación, los períodos con cupos garantizados para la tarifa
// del contrato. Los cupos se guardan por día en el tarifario (vista «Cupos»), así que también se ven y se
// cambian desde el Tarifario y su Actualización masiva.
import { useState } from 'react';
import { C } from '@/components/suite/tokens';
import { Button, Input } from '@/components/suite/ui';
import { useDato } from '../store';
import { CabeceraDetalle, Celda, Fila, FilaVacia, IcTrash, IconButton, ItemMaestro, MaestroDetalle, Tabla, useConfirmar } from '../kit';
import type { Contrato } from '../datos';
import { cuposDe, diasDe, fijarCupos, tramosCupos } from '../cupos';
import { iso } from '../tarifario';

const fmt = (d: string) => d.split('-').reverse().join('/');

/** Tarifa (id) negociada en el contrato. */
export function useTarifaDeContrato() {
  const [tarifas] = useDato('tarifas');
  return (c?: Contrato) => (c ? tarifas.find(t => t.nombre === c.tarifa)?.id : undefined);
}

export function CuposDeContrato({ contrato }: { contrato: Contrato }) {
  const [tipos] = useDato('tiposHab');
  const [mapa, setMapa] = useDato('tarifario');
  const tarifa = useTarifaDeContrato()(contrato);
  const [tipoSel, setTipoSel] = useState(tipos[0]?.id ?? '');
  const hoy = iso(new Date());
  const [nuevo, setNuevo] = useState({ desde: contrato.desde > hoy ? contrato.desde : hoy, hasta: contrato.hasta, cupos: '' });
  const [error, setError] = useState('');
  const { pedir, dialogo } = useConfirmar();

  if (!tarifa) {
    return <p style={{ margin: 0, fontSize: 12.5, color: C.n700 }}>Elige el «Tarifario» del contrato para asignarle cupos.</p>;
  }
  const tramos = tramosCupos(mapa, { tarifas: [tarifa], desde: hoy });
  const delTipo = tramos.filter(t => t.tipo === tipoSel);
  const tipo = tipos.find(t => t.id === tipoSel);

  const agregar = () => {
    const n = Math.round(Number(nuevo.cupos));
    if (!nuevo.desde || !nuevo.hasta || nuevo.hasta < nuevo.desde) return setError('Revisa las fechas: «A» no puede ser anterior a «De».');
    if (nuevo.cupos.trim() === '' || isNaN(n) || n < 1) return setError('Indica cuántos cupos se guardan por día.');
    const choca = diasDe(nuevo.desde, nuevo.hasta).some(d => cuposDe(mapa, tipoSel, tarifa, d) > 0);
    const guardar = () => { setMapa(m => fijarCupos(m, [tipoSel], [tarifa], diasDe(nuevo.desde, nuevo.hasta), n)); setNuevo(x => ({ ...x, cupos: '' })); setError(''); };
    if (choca) pedir('Reemplazar cupos', 'Ese período ya tiene cupos en algunos días. ¿Reemplazarlos por el valor nuevo?', guardar, { accion: 'Reemplazar' });
    else guardar();
  };

  return (
    <>
    <MaestroDetalle titulo="Tipo de habitación" contador={tipos.length} anchoLista={240}
      lista={tipos.map(t => {
        const n = tramos.filter(x => x.tipo === t.id).length;
        return <ItemMaestro key={t.id} activo={t.id === tipoSel} onClick={() => { setTipoSel(t.id); setError(''); }}
          titulo={`${t.codigo} · ${t.nombre}`} detalle={n ? `${n} ${n === 1 ? 'período' : 'períodos'} con cupos` : 'Sin cupos'} />;
      })}>
        <CabeceraDetalle titulo={`Cupos · ${tipo?.nombre ?? ''}`} sub={`Tarifa ${contrato.tarifa} · habitaciones guardadas por día`} />
        <Tabla headers={['De', 'A', 'Días', 'Cupos por día', '']} alinearDerecha={[2, 3]} anchos={{ 2: 70, 3: 120, 4: 50 }}>
          {delTipo.length === 0 && <FilaVacia cols={5} texto="Sin cupos desde hoy." />}
          {delTipo.map(t => (
            <Fila key={t.desde}>
              <Celda>{fmt(t.desde)}</Celda>
              <Celda>{fmt(t.hasta)}</Celda>
              <Celda derecha muted>{t.dias}</Celda>
              <Celda derecha><b style={{ fontWeight: 600 }}>{t.cupos}</b></Celda>
              <Celda>
                <IconButton label={`Quitar cupos del ${fmt(t.desde)} al ${fmt(t.hasta)}`} tono="peligro"
                  onClick={() => pedir('Quitar cupos', `¿Quitar los ${t.cupos} cupos del ${fmt(t.desde)} al ${fmt(t.hasta)}?`, () => setMapa(m => fijarCupos(m, [t.tipo], [t.tarifa], diasDe(t.desde, t.hasta), 0)), { accion: 'Quitar' })}>
                  <IcTrash />
                </IconButton>
              </Celda>
            </Fila>
          ))}
        </Tabla>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px auto', gap: 8, alignItems: 'center' }}>
          <Input type="date" value={nuevo.desde} aria-label="De" onChange={v => { setNuevo(x => ({ ...x, desde: v })); setError(''); }} />
          <Input type="date" value={nuevo.hasta} min={nuevo.desde} aria-label="A" onChange={v => { setNuevo(x => ({ ...x, hasta: v })); setError(''); }} />
          <Input type="number" min={1} value={nuevo.cupos} placeholder="Cupos" aria-label="Cupos por día" onChange={v => { setNuevo(x => ({ ...x, cupos: v })); setError(''); }} style={{ textAlign: 'right' }} />
          <Button onClick={agregar}>Agregar</Button>
        </div>
        {error && <span role="alert" style={{ fontSize: 12, color: C.error }}>{error}</span>}
    </MaestroDetalle>
    {dialogo}
    </>
  );
}
