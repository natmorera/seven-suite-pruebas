'use client';
// Asistente de configuración inicial de la contabilidad (ver datos/estado.ts):
// pantalla completa, sin menú, y no se puede salir hasta terminarlo. Cada paso
// se guarda al continuar y trae valores por defecto, así que casi siempre
// basta con «Continuar».
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { C, FONT, radius } from '@/components/ui/tokens';
import { Button, FormField, Select } from '@/components/ui/formulario';
import { Logo } from '@/components/ui/icons';
import CamposIdentificacion from '@/components/pages/empresa/CamposIdentificacion';
import ConsecutivosDocumentos from '@/components/pages/empresa/ConsecutivosDocumentos';
import { empresaAlmacen } from '@/components/pages/empresa/datos/empresa';
import { monedaPrimariaDePais, paisPorCodigo, simboloMoneda } from '@/components/pages/empresa/datos/paises';
import { NOMENCLATURA_INICIAL, mismaNomenclatura, planBase, armarPlan, type Nomenclatura, type PasoId } from './datos/plan';
import { onboardingAlmacen, calcularEstado, guardarPaso, type DatosOnboarding } from './datos/estado';
import PasoNomenclatura from './PasoNomenclatura';
import PasoCatalogo, { type ModoCatalogo, type PlanSubido } from './PasoCatalogo';
import { aFilasPlan, type FilaEditor } from './EditorPlan';
import Fin from './Fin';
import { Aviso, Marca, Vista, MESES, iso, fmtFecha, periodos, pasoBtn } from './piezas';
import { useAlmacen } from '@/components/pages/empresa/datos/almacen';

const PASOS: { id: PasoId; titulo: string; detalle: string }[] = [
  { id: 'empresa', titulo: 'Empresa', detalle: 'Identificación y país' },
  { id: 'nomenclatura', titulo: 'Código de cuenta', detalle: 'Cómo se forman los códigos' },
  { id: 'catalogo', titulo: 'Plan de cuentas', detalle: 'Las cuentas donde se registra' },
  { id: 'ejercicio', titulo: 'Ejercicio fiscal', detalle: 'El año contable y sus períodos' },
  { id: 'consecutivos', titulo: 'Consecutivos', detalle: 'Cómo se numera cada documento' },
];

// Valores iniciales de cada paso: lo ya guardado o los valores por defecto
function inicial(d: DatosOnboarding) {
  const x = empresaAlmacen.leer();
  const hoy = new Date();
  const [anio, mes] = d.ejercicio ? d.ejercicio.inicio.split('-').map(Number) : [hoy.getFullYear(), 1];
  return {
    emp: { nombreLegal: x.nombreLegal, nombreComercial: x.nombreComercial, tipoId: x.tipoId || '02', numeroId: x.numeroId, pais: x.pais || 'CR',
      zonaHoraria: x.zonaHoraria || paisPorCodigo(x.pais)?.zona || 'America/Costa_Rica', numeroLegalizacion: x.numeroLegalizacion, citasPresentacion: x.citasPresentacion },
    nom: d.nomenclatura ?? NOMENCLATURA_INICIAL,
    primaria: d.monedaFuncional || monedaPrimariaDePais(x.pais),
    secundarias: d.monedaFuncional ? d.monedasSecundarias : ['USD'],
    modoCat: (d.catalogo || 'base') as ModoCatalogo,
    anio, mes,
  };
}

export default function OnboardingContable() {
  const router = useRouter();
  const datos = useAlmacen(onboardingAlmacen);
  const estado = calcularEstado(datos, useAlmacen(empresaAlmacen));
  const [ini] = useState(() => inicial(onboardingAlmacen.leer()));
  const [actual, setActual] = useState<PasoId | 'fin'>(() => PASOS.find(p => !estado.listos[p.id])?.id ?? 'fin');
  const [error, setError] = useState<string | null>(null);
  const [emp, setEmp] = useState(ini.emp);
  const [nom, setNom] = useState<Nomenclatura>(ini.nom);
  const [primaria, setPrimaria] = useState(ini.primaria);
  const [secundarias, setSecundarias] = useState<string[]>(ini.secundarias);
  const [modoCat, setModoCat] = useState<ModoCatalogo>(ini.modoCat);
  const [filasCrear, setFilasCrear] = useState<FilaEditor[]>([]);
  const [subido, setSubido] = useState<PlanSubido | null>(null);
  const [anio, setAnio] = useState(ini.anio);
  const [mesInicio, setMesInicio] = useState(ini.mes);

  const idx = actual === 'fin' ? PASOS.length : PASOS.findIndex(p => p.id === actual);
  const habilitado = (i: number) => PASOS.slice(0, i).every(p => estado.listos[p.id]);
  const todos = PASOS.every(p => estado.listos[p.id]);
  const inicioEj = new Date(anio, mesInicio - 1, 1);
  const anioHoy = new Date().getFullYear();
  const moneda = datos.monedaFuncional || primaria;
  const base = planBase(moneda, datos.nomenclatura ?? nom);
  const planCreado = armarPlan(aFilasPlan(filasCrear, nom), nom, moneda);
  const cero = (m?: string) => `${simboloMoneda(m ?? moneda)}${nom.decimalSep === ',' ? '0,00' : '0.00'}`;
  const ir = (p: PasoId | 'fin') => { setActual(p); setError(null); };

  function continuar() {
    if (actual === 'fin') return;
    if (actual === 'catalogo' && modoCat === 'importar' && subido?.errores.length) { setError('Corrige los errores del archivo y súbelo de nuevo.'); return; }
    if (actual === 'catalogo' && modoCat === 'crear' && planCreado.errores.length) { setError(planCreado.errores[0]); return; }
    const valores: Record<string, unknown> =
      actual === 'empresa' ? { empresa: emp, monedaPrimaria: primaria, monedasSecundarias: secundarias }
        : actual === 'nomenclatura' ? { nomenclatura: nom }
          : actual === 'catalogo' ? (modoCat === 'base' ? { modo: 'base' } : { modo: modoCat, cuentas: modoCat === 'importar' ? subido?.cuentas ?? [] : planCreado.cuentas })
            : actual === 'ejercicio' ? { inicio: iso(inicioEj), primerPeriodo: iso(inicioEj) }
              : {};
    const e = guardarPaso(actual, valores);
    if (e) { setError(e); return; }
    const sig = PASOS[idx + 1];
    if (sig) { ir(sig.id); return; }
    const fin = guardarPaso('completar', {});
    if (fin) setError(fin); else ir('fin');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: FONT, background: C.n200 }}>
      <header style={{ height: 56, flexShrink: 0, background: C.n000, borderBottom: `1px solid ${C.n500}`, display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px' }}>
        <span aria-hidden style={{ width: 30, height: 30, borderRadius: radius.sm, background: C.brand, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Logo /></span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.n900 }}>Configura tu contabilidad</span>
          <span style={{ fontSize: 11, color: C.n700 }}>Seven Accounting</span>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: C.n700 }}>{estado.completos} de {PASOS.length} pasos</span>
        <div style={{ width: 120, height: 6, borderRadius: 3, background: C.n500, overflow: 'hidden' }}>
          <div style={{ width: `${(estado.completos / PASOS.length) * 100}%`, height: '100%', background: C.brand, transition: 'width .3s' }} />
        </div>
      </header>

      <div className="onb-cuerpo" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div className="onb-grid" style={{ maxWidth: 1280, height: '100%', boxSizing: 'border-box', margin: '0 auto', padding: '20px 24px', display: 'grid', gridTemplateColumns: '240px 1fr', gridTemplateRows: 'minmax(0, 1fr)', gap: 20 }}>
          <nav aria-label="Pasos" style={{ display: 'flex', flexDirection: 'column', alignSelf: 'start' }}>
            {PASOS.map((p, i) => {
              const activo = actual === p.id; const abierto = habilitado(i);
              return (
                <button key={p.id} type="button" disabled={!abierto} onClick={() => ir(p.id)} style={pasoBtn(activo, abierto)}>
                  <Marca n={i + 1} listo={estado.listos[p.id]} activo={activo} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: activo ? 600 : 500, color: C.n900 }}>{p.titulo}</span>
                    <span style={{ fontSize: 11, color: C.n700 }}>{p.detalle}</span>
                  </span>
                </button>
              );
            })}
            <button type="button" disabled={!todos} onClick={() => ir('fin')} style={{ ...pasoBtn(actual === 'fin', todos), alignItems: 'center' }}>
              <Marca n={6} listo={datos.completado} activo={actual === 'fin'} />
              <span style={{ fontSize: 13, fontWeight: 500, color: C.n900 }}>Listo para registrar</span>
            </button>
          </nav>

          {/* Altura fija: los botones Atrás / Continuar quedan siempre en el mismo lugar y el contenido se desplaza adentro */}
          <section style={{ background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.lg, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            {actual === 'fin' ? <Fin estado={estado} onEmpezar={r => router.replace(r)} /> : <>
              <div style={{ padding: '16px 24px 0' }}>
                <div style={{ fontSize: 11, color: C.brand, fontWeight: 500 }}>Paso {idx + 1} de {PASOS.length}</div>
                <h2 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 600, color: C.n900 }}>{actual === 'consecutivos' ? 'Consecutivos de documentos' : PASOS[idx].titulo}</h2>
              </div>

              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {actual === 'empresa' && (
                  <CamposIdentificacion config={emp}
                    patch={p => { setEmp(e => ({ ...e, ...p })); if (p.pais) { const m = monedaPrimariaDePais(p.pais); setPrimaria(m); setSecundarias(s => s.filter(x => x !== m)); } }}
                    monedas={{ primaria, secundarias, cambiar: (pr, se) => { setPrimaria(pr); setSecundarias(se); } }} />
                )}

                {actual === 'nomenclatura' && <>
                  <PasoNomenclatura config={nom} patch={p => setNom(n => ({ ...n, ...p }))} />
                  {estado.listos.catalogo && datos.nomenclatura && !mismaNomenclatura(datos.nomenclatura, nom) && (
                    <Aviso>Los códigos de tu plan de cuentas se actualizarán con este formato.</Aviso>
                  )}
                </>}

                {actual === 'catalogo' && (
                  <PasoCatalogo modo={modoCat} onModo={setModoCat} moneda={moneda} monedas={[moneda, ...datos.monedasSecundarias]} nom={nom}
                    base={base} subido={subido} onSubido={setSubido} filas={filasCrear} onFilas={setFilasCrear} plan={planCreado} onError={setError} cero={cero} />
                )}

                {actual === 'ejercicio' && <>
                  <div className="onb-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 480 }}>
                    <FormField label="Año del ejercicio" required>
                      <Select value={String(anio)} onChange={v => setAnio(Number(v))} options={[0, 1].map(d => ({ value: String(anioHoy + d), label: String(anioHoy + d) }))} />
                    </FormField>
                    <FormField label="Inicio del ejercicio" required>
                      <Select value={String(mesInicio)} onChange={v => setMesInicio(Number(v))} options={MESES.map((m, i) => ({ value: String(i + 1), label: m }))} />
                    </FormField>
                  </div>
                  <Vista titulo={`Ejercicio del ${fmtFecha(inicioEj)} al ${fmtFecha(new Date(anio, 11, 31))} · ${periodos(inicioEj).length} períodos abiertos`}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 6 }}>
                      {periodos(inicioEj).map((p, i) => (
                        <div key={i} style={{ padding: '7px 10px', borderRadius: radius.sm, background: C.n000, border: `1px solid ${C.n500}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5 }}>
                          <span>{MESES[p.getMonth()].slice(0, 3)} {p.getFullYear()}</span>
                          <span style={{ width: 7, height: 7, borderRadius: 4, background: C.success }} title="Abierto" />
                        </div>
                      ))}
                    </div>
                  </Vista>
                </>}

                {actual === 'consecutivos' && <>
                  <p style={{ margin: 0, fontSize: 12.5, color: C.n700, lineHeight: 1.55 }}>
                    Así se numerará cada documento. Puedes dejarlo como está; para cambiar un formato usa el lápiz.
                  </p>
                  <ConsecutivosDocumentos onboarding />
                </>}

                {error && <div role="alert" style={{ fontSize: 12, color: C.error, background: C.errorBg, border: `1px solid ${C.error}`, borderRadius: radius.md, padding: '8px 12px' }}>{error}</div>}
              </div>

              <div style={{ padding: '12px 24px', borderTop: `1px solid ${C.n500}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button variant="ghost" disabled={idx === 0} onClick={() => ir(PASOS[idx - 1].id)}>Atrás</Button>
                <Button onClick={continuar} disabled={actual === 'catalogo' && ((modoCat === 'importar' && !subido) || (modoCat === 'base' && Boolean(base.error)))}>
                  {idx === PASOS.length - 1 ? 'Terminar' : 'Continuar'}
                </Button>
              </div>
            </>}
          </section>
        </div>
      </div>
      <style>{'@media (max-width: 820px) { .onb-grid { grid-template-columns: 1fr !important; height: auto !important; grid-template-rows: auto !important; } .onb-cuerpo { overflow: auto !important; } .onb-2col, .onb-3col { grid-template-columns: 1fr !important; } }'}</style>
    </div>
  );
}
