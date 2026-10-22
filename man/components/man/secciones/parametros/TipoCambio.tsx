'use client';
// Parámetros › Tipo de cambio: historial por fecha y divisa, con el modelo de Accounting. Todos los módulos toman de aquí la tasa vigente.
import { useRef, useState } from 'react';
import { AccionesEnHeader, FiltrosEnBarra } from '@/components/layout/Pantalla';
import { C } from '@/components/suite/tokens';
import { Button, Input, Select } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { hoy } from '@/components/kit/fechas';
import { useDato } from '../../store';
import { Aviso, Campo, Celda, ConfigCard, Fila, FilaVacia, FiltroFechas, FiltroOpciones, enRango, type Rango, Grid, IcEdit, IcUpload, leerCSV, ModalBase, OutlineButton, Paginacion, Tabla, uid, usePaginado } from '@/components/kit';
import type { TipoCambio as Registro } from '../../tipos';
import { fmtTasa } from './Monedas';
import { useCrearEnEscritorio } from '@/components/layout/SoloEscritorio';

const fmtF = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}`;

export default function TipoCambio() {
  const enEscritorio = useCrearEnEscritorio();
  const [l, set] = useDato('tiposCambio');
  const [monedas] = useDato('monedas');
  const [rango, setRango] = useState<Rango>({ desde: '', hasta: '' });
  const [moneda, setMoneda] = useState('');
  const [modal, setModal] = useState<Registro | 'nuevo' | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const divisas = monedas.filter(m => !m.principal);
  const filtradas = [...l].filter(t => (!moneda || t.moneda === moneda) && enRango(t.fecha, rango)).sort((a, b) => b.fecha.localeCompare(a.fecha) || a.moneda.localeCompare(b.moneda));
  const pag = usePaginado(filtradas, 10);
  const { setPagina, visibles } = pag;

  const guardar = (r: Registro) => {
    // Un solo registro por fecha y divisa: uno nuevo reemplaza al existente de ese día.
    const existe = l.some(t => t.id === r.id);
    set(existe ? l.map(t => (t.id === r.id ? r : t)) : [...l.filter(t => !(t.fecha === r.fecha && t.moneda === r.moneda)), r]);
    setModal(null);
  };
  const importar = async (f: File) => {
    const filas = (await leerCSV(f)).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x[0]?.trim() ?? ''));
    const nuevos = filas.map(([fecha, mon, tasa]) => ({ id: uid(), fecha: fecha.trim(), moneda: (mon ?? '').trim().toUpperCase(), tasa: Number(String(tasa).replace(',', '.')), fuente: 'Importación' as const }))
      .filter(r => divisas.some(d => d.codigo === r.moneda) && r.tasa > 0);
    const clave = (r: Registro) => r.fecha + r.moneda;
    set([...l.filter(t => !nuevos.some(n => clave(n) === clave(t))), ...nuevos]);
    setAviso(nuevos.length ? `Se importaron ${nuevos.length} tasas.` : 'El archivo no tiene filas válidas (fecha AAAA-MM-DD, divisa y tasa).');
  };

  return (
    <ConfigCard title="Historial de tipo de cambio">
      <AccionesEnHeader>
        <OutlineButton icon={<IcUpload size={12} />} onClick={() => archivo.current?.click()}>Importar</OutlineButton>
        <Button icon={<IcPlus size={12} />} onClick={enEscritorio(() => setModal('nuevo'))} disabled={!divisas.length}>Nuevo registro</Button>
      </AccionesEnHeader>
      <FiltrosEnBarra>
        <FiltroFechas value={rango} onChange={r => { setRango(r); setPagina(1); }} />
        <FiltroOpciones etiqueta="Divisa" value={moneda} onChange={v => { setMoneda(v); setPagina(1); }} todos="Todas" opciones={divisas.map(d => ({ value: d.codigo, label: `${d.codigo} - ${d.descripcion}` }))} />
        <span style={{ marginLeft: 'auto', fontSize: 12, color: C.n700 }}>{filtradas.length} registros</span>
      </FiltrosEnBarra>
      <input ref={archivo} type="file" accept=".csv" hidden aria-label="Archivo de tipos de cambio"
        onChange={e => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = ''; }} />
      {aviso && <Aviso tono="warning">{aviso}</Aviso>}
      <Tabla headers={['Fecha', 'Divisa', 'Tasa', 'Fuente', 'Acciones']} alinearDerecha={[4]} anchos={{ 4: 150 }}>
        {visibles.length === 0 && <FilaVacia cols={5} />}
        {visibles.map(t => (
          <Fila key={t.id}>
            <Celda>{fmtF(t.fecha)}</Celda>
            <Celda><b style={{ fontWeight: 600 }}>{t.moneda}</b></Celda>
            <Celda>{fmtTasa(t.tasa)}</Celda>
            <Celda muted>{t.fuente}</Celda>
            <Celda derecha><OutlineButton icon={<IcEdit size={12} />} onClick={() => setModal(t)}>Corregir tasa</OutlineButton></Celda>
          </Fila>
        ))}
      </Tabla>
      <Paginacion pag={pag} />
      {modal && <ModalRegistro inicial={modal === 'nuevo' ? { id: uid(), fecha: hoy(), moneda: divisas[0]?.codigo ?? '', tasa: 0, fuente: 'Manual' } : modal}
        correccion={modal !== 'nuevo'} divisas={divisas.map(d => ({ value: d.codigo, label: `${d.codigo} - ${d.descripcion}` }))} onClose={() => setModal(null)} onGuardar={guardar} />}
    </ConfigCard>
  );
}

function ModalRegistro({ inicial, correccion, divisas, onClose, onGuardar }: {
  inicial: Registro; correccion: boolean; divisas: { value: string; label: string }[]; onClose: () => void; onGuardar: (r: Registro) => void;
}) {
  const [r, setR] = useState(inicial);
  const valido = r.tasa > 0 && !!r.fecha && !!r.moneda;
  return (
    <ModalBase titulo={correccion ? `Corregir tasa — ${r.moneda} · ${fmtF(r.fecha)}` : 'Nuevo registro de tipo de cambio'} onClose={onClose} ancho={480}
      pie={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!valido} onClick={() => onGuardar({ ...r, fuente: 'Manual' })}>Guardar</Button></>}>
      <Grid cols={2}>
        <Campo label="Fecha"><Input type="date" value={r.fecha} onChange={v => setR({ ...r, fecha: v })} disabled={correccion} /></Campo>
        <Campo label="Divisa"><Select value={r.moneda} onChange={v => setR({ ...r, moneda: v })} options={divisas} disabled={correccion} /></Campo>
        <Campo label="Tasa (moneda principal por 1 unidad)" style={{ gridColumn: '1 / -1' }}>
          <Input type="number" value={r.tasa || ''} onChange={v => setR({ ...r, tasa: Number(v) })} placeholder="Ej: 506,00" />
        </Campo>
      </Grid>
    </ModalBase>
  );
}
