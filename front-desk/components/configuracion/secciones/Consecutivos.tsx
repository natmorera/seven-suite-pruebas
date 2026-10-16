'use client';
// Configuración › Empresa › Consecutivos de documentos. Misma pantalla que Accounting:
// formato con {AAAA}, {MM} y {N:k}, reinicio y próximo número calculado con la fecha de hoy.
import { useRef, useState } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Input, Select } from '@/components/suite/ui';
import { HOY } from '@/components/hotel/datos';
import { useDato } from '../store';
import { Aviso, Campo, Celda, ConfigCard, Fila, IcEdit, IconButton, ModalBase, Tabla } from '../kit';
import type { Consecutivo, Reinicio } from '../datos';

const REINICIOS: Reinicio[] = ['Nunca', 'Anual', 'Mensual'];
const TOKEN_N = /\{N:(\d+)\}/g;

/** Número que se emitiría hoy con este formato (el contador arranca de nuevo según el reinicio). */
export function proximoNumero(formato: string, emitidos: number, fecha = HOY) {
  if (!formato) return '–';
  // Sin backend no hay fecha por documento emitido: se toma el total emitido como contador del período actual.
  const n = emitidos + 1;
  return formato.replace('{AAAA}', fecha.slice(0, 4)).replace('{MM}', fecha.slice(5, 7)).replace(TOKEN_N, (_, k) => String(n).padStart(Number(k), '0'));
}

export function validarFormato(formato: string, reinicio: Reinicio): string | null {
  const ns = [...formato.matchAll(TOKEN_N)];
  if (ns.length !== 1) return 'El formato debe tener un solo {N:k}.';
  const k = Number(ns[0][1]);
  if (k < 1 || k > 18) return 'Los dígitos de {N:k} van de 1 a 18.';
  if (/\{(?!AAAA\}|MM\}|N:\d+\})[^}]*\}/.test(formato)) return 'Solo se admiten {AAAA}, {MM} y {N:k}.';
  if (reinicio === 'Mensual' && !(formato.includes('{AAAA}') && formato.includes('{MM}'))) return 'El reinicio mensual exige {AAAA} y {MM} en el formato.';
  if (reinicio === 'Anual' && !formato.includes('{AAAA}')) return 'El reinicio anual exige {AAAA} en el formato.';
  return null;
}

export default function Consecutivos() {
  const [l, set] = useDato('consecutivos');
  const [editando, setEditando] = useState<Consecutivo | null>(null);
  return (
    <ConfigCard title="Consecutivos de documentos" subtitle="Cómo se numera cada tipo de documento.">
      <Aviso>
        El contador lo lleva el sistema: sube solo al emitir cada documento y no se retrocede. Año, mes y reinicio salen de la fecha
        hotelera del documento. Un cambio de formato rige solo para los documentos nuevos; los ya emitidos conservan su número.
      </Aviso>
      <Tabla headers={['Tipo', 'Formato', 'Reinicio', 'Emitidos', 'Próximo número (hoy)', 'Acciones']} anchos={{ 3: 90, 5: 80 }} alinearDerecha={[3]}>
        {l.map(c => (
          <Fila key={c.id}>
            <Celda>{c.tipo}</Celda>
            <Celda>{c.formato || '–'}</Celda>
            <Celda>{c.formato ? c.reinicio : '–'}</Celda>
            <Celda derecha>{c.emitidos}</Celda>
            <Celda>{proximoNumero(c.formato, c.emitidos)}</Celda>
            <Celda><IconButton label={`Editar formato de ${c.tipo}`} onClick={() => setEditando(c)}><IcEdit /></IconButton></Celda>
          </Fila>
        ))}
      </Tabla>
      {editando && <EditarFormato c={editando} onClose={() => setEditando(null)}
        onGuardar={(formato, reinicio) => { set(l.map(x => (x.id === editando.id ? { ...x, formato, reinicio } : x))); setEditando(null); }} />}
    </ConfigCard>
  );
}

function EditarFormato({ c, onClose, onGuardar }: { c: Consecutivo; onClose: () => void; onGuardar: (formato: string, reinicio: Reinicio) => void }) {
  const [formato, setFormato] = useState(c.formato);
  const [reinicio, setReinicio] = useState<Reinicio>(c.reinicio);
  const caja = useRef<HTMLDivElement>(null);
  const error = formato ? validarFormato(formato, reinicio) : 'Escribe el formato.';
  const insertar = (t: string) => {
    const input = caja.current?.querySelector('input');
    const ini = input?.selectionStart ?? formato.length;
    const fin = input?.selectionEnd ?? formato.length;
    setFormato(formato.slice(0, ini) + t + formato.slice(fin));
  };
  const chip = { padding: '6px 12px', border: `1px solid ${C.n500}`, borderRadius: radius.control, background: C.n000, fontSize: 12.5, fontFamily: FONT, cursor: 'pointer', color: C.n900 };
  return (
    <ModalBase titulo={`Editar formato — ${c.tipo}`} onClose={onClose} ancho={560}
      pie={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!!error} onClick={() => onGuardar(formato.trim(), reinicio)}>Guardar</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div ref={caja}>
          <Campo label="Formato" hint="Texto fijo más {AAAA} (año), {MM} (mes) y {N:k} (consecutivo con k dígitos, de 1 a 18). Año y mes salen de la fecha hotelera del documento.">
            <Input value={formato} onChange={setFormato} placeholder="Ej: FAC-{AAAA}-{N:6}" />
          </Campo>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {['{AAAA}', '{MM}', '{N:5}'].map(t => <button key={t} type="button" style={chip} onClick={() => insertar(t)}>{t}</button>)}
          </div>
        </div>
        <Campo label="Reinicio" hint="Mensual exige {AAAA} y {MM} en el formato; anual exige {AAAA}. Así los números de distintos períodos no se repiten.">
          <Select value={reinicio} onChange={v => setReinicio(v as Reinicio)} options={REINICIOS.map(r => ({ value: r, label: r }))} />
        </Campo>
        {error && formato && <span role="alert" style={{ fontSize: 12, color: C.error }}>{error}</span>}
        <div style={{ padding: '12px 14px', border: `1px solid ${C.n500}`, borderRadius: radius.md, fontSize: 13, color: C.n700 }}>
          Próximo número con fecha de hoy: <b style={{ color: C.n900, fontWeight: 600 }}>{error ? '–' : proximoNumero(formato, c.emitidos)}</b>
        </div>
      </div>
    </ModalBase>
  );
}
