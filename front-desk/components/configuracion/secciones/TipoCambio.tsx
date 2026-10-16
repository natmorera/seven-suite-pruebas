'use client';
// Configuración › Parámetros generales › Tipo de cambio: historial por fecha y divisa, como en Accounting.
import { useRef, useState } from 'react';
import { AccionesEnHeader, FiltrosEnBarra } from '@/components/layout/Pantalla';
import { C } from '@/components/suite/tokens';
import { Button, Input, Select } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { HOY } from '@/components/hotel/datos';
import { useDato } from '../store';
import { Aviso, Campo, Celda, ConfigCard, Fila, FilaVacia, Grid, IcEdit, IcUpload, ModalBase, OutlineButton, Paginacion, Tabla, leerCSV, uid, usePaginado } from '../kit';
import type { TipoCambio as Registro } from '../datos';
import { fmtTasa } from './Monedas';

const fmtF = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}`;
const PERIODOS = [{ value: '', label: 'Fecha: todas' }, { value: '7', label: 'Últimos 7 días' }, { value: 'mes', label: 'Este mes' }];
const diasAntes = (f: string, n: number) => { const d = new Date(f + 'T12:00:00'); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

export default function TipoCambio() {
  const [l, set] = useDato('tiposCambio');
  const [monedas] = useDato('monedas');
  const [periodo, setPeriodo] = useState('');
  const [moneda, setMoneda] = useState('');
  const [modal, setModal] = useState<Registro | 'nuevo' | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const divisas = monedas.filter(m => !m.referencia);
  const desde = periodo === '7' ? diasAntes(HOY, 6) : periodo === 'mes' ? HOY.slice(0, 8) + '01' : '';
  const filtradas = [...l].filter(t => (!moneda || t.moneda === moneda) && (!desde || t.fecha >= desde)).sort((a, b) => b.fecha.localeCompare(a.fecha) || a.moneda.localeCompare(b.moneda));
  const { pagina, setPagina, total, visibles } = usePaginado(filtradas, 12);

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
    <ConfigCard title="Historial de tipo de cambio" subtitle="Registre las tasas de cambio de divisas por fecha.">
      <AccionesEnHeader>
        <OutlineButton icon={<IcUpload size={12} />} onClick={() => archivo.current?.click()}>Importar</OutlineButton>
        <Button icon={<IcPlus size={12} />} onClick={() => setModal('nuevo')} disabled={!divisas.length}>Nuevo registro</Button>
      </AccionesEnHeader>
      <FiltrosEnBarra>
        <div style={{ width: 180 }}><Select value={periodo} onChange={v => { setPeriodo(v); setPagina(1); }} options={PERIODOS} /></div>
        <div style={{ width: 180 }}><Select value={moneda} onChange={v => { setMoneda(v); setPagina(1); }} options={[{ value: '', label: 'Moneda: todas' }, ...divisas.map(d => ({ value: d.codigo, label: `${d.codigo} - ${d.descripcion}` }))]} /></div>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: C.n700 }}>{filtradas.length} registros</span>
      </FiltrosEnBarra>
      <input ref={archivo} type="file" accept=".csv" hidden aria-label="Archivo de tipos de cambio"
        onChange={e => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = ''; }} />
      <Aviso>Las tasas se aplican a los movimientos según la fecha hotelera del registro. Para importar, use un CSV con fecha (AAAA-MM-DD), divisa y tasa.</Aviso>
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
      {total > 1 && <Paginacion pagina={pagina} total={total} onChange={setPagina} />}
      {modal && <ModalRegistro inicial={modal === 'nuevo' ? { id: uid(), fecha: HOY, moneda: divisas[0]?.codigo ?? '', tasa: 0, fuente: 'Manual' } : modal}
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
