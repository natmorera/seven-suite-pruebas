'use client';
import { RowAction } from '@/components/ui/primitives';
import { C, FONT, radius } from '@/components/ui/tokens';
import { Button } from '@/components/ui/formulario';
import { IcTrash } from '@/components/ui/icons';
import { type FilaPlan, type Nomenclatura } from './datos/plan';
import { Errores } from './piezas';

type NivelEditor = 'mayor' | 'submajor' | 'detalle';
export interface FilaEditor { id: string; nivel: NivelEditor; padre: string; segmento: string; nombre: string; naturaleza: 'Deudora' | 'Acreedora'; posteable: boolean; moneda: string }
const NIVELES_EDITOR: { value: NivelEditor; label: string }[] = [
  { value: 'mayor', label: 'Mayor' }, { value: 'submajor', label: 'Sub mayor' }, { value: 'detalle', label: 'Detalle' },
];
const NIVEL_PADRE: Record<NivelEditor, NivelEditor | null> = { mayor: null, submajor: 'mayor', detalle: 'submajor' };
const largoNivel = (n: NivelEditor, nom: Nomenclatura) => nom.longitudes[n];
const natDeGrupo = (seg: string): 'Deudora' | 'Acreedora' => (['2', '3', '4'].includes(seg[0]) ? 'Acreedora' : 'Deudora');

function codigoFila(f: FilaEditor, filas: FilaEditor[], nom: Nomenclatura, visto = new Set<string>()): string {
  if (f.nivel === 'mayor') return f.segmento;
  const padre = filas.find(x => x.id === f.padre);
  if (!padre || visto.has(padre.id)) return '';
  visto.add(f.id);
  const base = codigoFila(padre, filas, nom, visto);
  return base ? base + nom.separador + f.segmento : '';
}
export function aFilasPlan(filas: FilaEditor[], nom: Nomenclatura): FilaPlan[] {
  return filas.map(f => ({ codigo: codigoFila(f, filas, nom), nombre: f.nombre, naturaleza: f.naturaleza, posteable: f.posteable ? 'Sí' : 'No', moneda: f.posteable ? f.moneda : '' }));
}
// Siguiente número libre entre las cuentas hermanas
function siguienteSegmento(nivel: NivelEditor, padre: string, filas: FilaEditor[], nom: Nomenclatura, sinId = '') {
  const l = largoNivel(nivel, nom);
  const hermanas = filas.filter(x => x.id !== sinId && x.nivel === nivel && x.padre === padre).map(x => Number(x.segmento) || 0);
  if (nivel === 'mayor') {
    const paso = 10 ** Math.max(0, l - 2);
    const n = hermanas.length ? Math.max(...hermanas) + paso : 10 ** (l - 1);
    return String(n).padStart(l, '0').slice(-l);
  }
  return String((hermanas.length ? Math.max(...hermanas) : 0) + 1).padStart(l, '0');
}

export default function EditorPlan({ filas, onChange, nom, monedas, errores, posteables }: {
  filas: FilaEditor[]; onChange: (f: FilaEditor[]) => void; nom: Nomenclatura; monedas: string[]; errores: string[]; posteables: number;
}) {
  const cambiar = (id: string, x: Partial<FilaEditor>) => onChange(filas.map(f => (f.id === id ? { ...f, ...x } : f)));
  const candidatosPadre = (n: NivelEditor) => { const p = NIVEL_PADRE[n]; return p ? filas.filter(f => f.nivel === p) : []; };
  function cambiarNivel(f: FilaEditor, nivel: NivelEditor) {
    const padres = candidatosPadre(nivel); const padre = padres[padres.length - 1]?.id ?? '';
    const p = filas.find(x => x.id === padre);
    cambiar(f.id, { nivel, padre, segmento: siguienteSegmento(nivel, padre, filas, nom, f.id), posteable: nivel === 'detalle', naturaleza: p?.naturaleza ?? f.naturaleza });
  }
  function agregar() {
    const ultima = filas[filas.length - 1];
    const nivel: NivelEditor = ultima ? (ultima.nivel === 'mayor' ? 'submajor' : 'detalle') : 'mayor';
    const padre = nivel === 'mayor' ? '' : ultima.nivel === NIVEL_PADRE[nivel] ? ultima.id : ultima.padre;
    const p = filas.find(x => x.id === padre);
    onChange([...filas, { id: 'f' + Math.random().toString(36).slice(2, 9), nivel, padre, segmento: siguienteSegmento(nivel, padre, filas, nom), nombre: '',
      naturaleza: p?.naturaleza ?? 'Deudora', posteable: nivel === 'detalle', moneda: monedas[0] }]);
  }
  const th = { padding: '8px', fontWeight: 500, color: C.n700, fontSize: 11.5, whiteSpace: 'nowrap' as const, textAlign: 'left' as const };
  const td = { padding: '5px 8px', borderTop: `1px solid ${C.n500}`, verticalAlign: 'middle' as const };
  const campo = { width: '100%', height: 30, padding: '0 8px', border: `1px solid ${C.n500}`, borderRadius: radius.sm, fontSize: 12, fontFamily: FONT, boxSizing: 'border-box' as const, background: C.n000, color: C.n900 };
  const sangria: Record<NivelEditor, number> = { mayor: 0, submajor: 14, detalle: 28 };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, maxHeight: 'calc(100vh - 420px)', minHeight: 160, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed', minWidth: 760 }}>
          <colgroup>
            <col style={{ width: 120 }} /><col style={{ width: 128 }} /><col style={{ width: 132 }} /><col />
            <col style={{ width: 118 }} /><col style={{ width: 56 }} /><col style={{ width: 92 }} /><col style={{ width: 34 }} />
          </colgroup>
          <thead style={{ position: 'sticky', top: 0, background: C.n200, zIndex: 1 }}>
            <tr>
              <th style={th}>Nivel</th><th style={th}>Cuenta superior</th><th style={th}>Código</th><th style={th}>Nombre</th>
              <th style={th}>Naturaleza</th><th style={{ ...th, textAlign: 'center' }}>Postea</th><th style={th}>Moneda</th><th style={th} />
            </tr>
          </thead>
          <tbody>
            {filas.map(f => {
              const padres = candidatosPadre(f.nivel);
              const padre = filas.find(x => x.id === f.padre);
              const prefijo = padre ? codigoFila(padre, filas, nom) + nom.separador : '';
              const largo = largoNivel(f.nivel, nom);
              const segMal = f.segmento.length !== largo;
              return (
                <tr key={f.id}>
                  <td style={td}>
                    <select aria-label="Nivel" value={f.nivel} onChange={e => cambiarNivel(f, e.target.value as NivelEditor)} style={campo}>
                      {NIVELES_EDITOR.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                    </select>
                  </td>
                  <td style={td}>
                    {f.nivel === 'mayor' ? <span style={{ fontSize: 11.5, color: C.n700 }}>—</span> : (
                      <select aria-label="Cuenta superior" value={f.padre} style={{ ...campo, borderColor: padre ? C.n500 : C.error }}
                        onChange={e => { const p = filas.find(x => x.id === e.target.value); cambiar(f.id, { padre: e.target.value, segmento: siguienteSegmento(f.nivel, e.target.value, filas, nom, f.id), naturaleza: p?.naturaleza ?? f.naturaleza }); }}>
                        <option value="">Elegir…</option>
                        {padres.map(p => <option key={p.id} value={p.id}>{codigoFila(p, filas, nom) || '(sin código)'}{p.nombre ? ` · ${p.nombre}` : ''}</option>)}
                      </select>
                    )}
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', height: 30, border: `1px solid ${segMal ? C.error : C.n500}`, borderRadius: radius.sm, background: C.n000, overflow: 'hidden' }}>
                      {prefijo && <span style={{ padding: '0 0 0 8px', fontSize: 12, color: C.n700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{prefijo}</span>}
                      <input aria-label="Código" value={f.segmento} maxLength={largo} placeholder={'0'.repeat(largo)} inputMode="numeric"
                        onChange={e => cambiar(f.id, { segmento: e.target.value.replace(/\D/g, '').slice(0, largo), ...(f.nivel === 'mayor' ? { naturaleza: natDeGrupo(e.target.value) } : {}) })}
                        style={{ flex: 1, minWidth: 0, height: '100%', border: 'none', outline: 'none', padding: prefijo ? '0 8px 0 1px' : '0 8px', fontSize: 12, fontFamily: FONT, fontVariantNumeric: 'tabular-nums', color: C.n900 }} />
                    </div>
                  </td>
                  <td style={td}>
                    <input aria-label="Nombre" value={f.nombre} placeholder="Nombre de la cuenta" onChange={e => cambiar(f.id, { nombre: e.target.value })}
                      style={{ ...campo, paddingLeft: 8 + sangria[f.nivel], fontWeight: f.nivel === 'detalle' ? 400 : 600 }} />
                  </td>
                  <td style={td}>
                    <select aria-label="Naturaleza" value={f.naturaleza} onChange={e => cambiar(f.id, { naturaleza: e.target.value as FilaEditor['naturaleza'] })} style={campo}>
                      <option value="Deudora">Deudora</option><option value="Acreedora">Acreedora</option>
                    </select>
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <input type="checkbox" aria-label="Posteable" checked={f.posteable} onChange={e => cambiar(f.id, { posteable: e.target.checked })} />
                  </td>
                  <td style={td}>
                    {f.posteable && (
                      <select aria-label="Moneda" value={f.moneda || monedas[0]} onChange={e => cambiar(f.id, { moneda: e.target.value })} style={campo}>
                        {monedas.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    )}
                  </td>
                  <td style={td}>
                    <RowAction title="Quitar cuenta" danger onClick={() => onChange(filas.filter(x => x.id !== f.id))}><IcTrash className="w-3.5 h-3.5" /></RowAction>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button variant="secondary" onClick={agregar}>Agregar cuenta</Button>
        <span style={{ fontSize: 12, color: posteables >= 2 ? C.successDk : C.n700 }}>{posteables} cuentas posteables (mínimo 2)</span>
      </div>
      {errores.length > 0 && <Errores lista={errores} />}
    </div>
  );
}
