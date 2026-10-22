'use client';
// Asistente de configuración inicial de la contabilidad (ver
// lib/onboardingContable.ts): pantalla completa, sin menú, y no se puede
// salir hasta terminarlo. Cada paso se guarda al continuar y trae valores por
// defecto, así que casi siempre basta con «Continuar».
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { C, FONT, Button, FormField, Select, Modal, radius } from '@/components/ui/primitives';
import SeccionApiKey from '@/components/ui/integracion/SeccionApiKey';
import { AyudaApiKey, obtenerApiKey, regenerarApiKey } from '@/components/pages/empresa/ApiKeyPagina';
import CamposIdentificacion from '@/components/pages/empresa/CamposIdentificacion';
import ConsecutivosDocumentos from '@/components/pages/empresa/ConsecutivosDocumentos';
import { MONEDAS_CONTABLES, monedaPrimariaDePais, paisPorCodigo, simboloMoneda } from '@/lib/paises';
import { NOMENCLATURA_INICIAL, mismaNomenclatura, planBase, aplanar, armarPlan, posteablesConMoneda, type Nomenclatura, type PasoId } from '@/lib/onboardingComun';
import { Logo, IcUser, IcBancos, IcGlobe, IcChevronRight, IcInvoice } from '@/components/ui/icons';
import type { EstadoOnboarding } from '@/lib/onboardingContable';
import { TabNomenclatura } from '@/components/pages/parametros/TabOtros';
import type { Cuenta } from '@/components/pages/catalogo/catalogoData';
import { descargarPlantilla, leerExcel, celda } from '@/lib/excel';
import { PasoTributaria, PasoHacienda, PasoSucursal, PasoCuentas, type Guardar } from './PasosFacturacion';
import { recargarCatalogo } from '@/components/pages/catalogo/catalogoStore';
import { PasoTributariaGT, PasoCertificadorGT } from './PasosFacturacionGT';
import { textosDe, esGuatemala } from '@/lib/perfilPais';
import { useModulos } from '@/lib/modulosCliente';
import { origenDemostracion, salirDeDemostracion, olvidarDemostracion } from './useOnboardingObligatorio';

const TODOS_LOS_PASOS: { id: PasoId; titulo: string; detalle: string }[] = [
  { id: 'empresa', titulo: 'Empresa', detalle: 'Identificación y país' },
  { id: 'nomenclatura', titulo: 'Código de cuenta', detalle: 'Cómo se forman los códigos' },
  { id: 'catalogo', titulo: 'Plan de cuentas', detalle: 'Las cuentas donde se registra' },
  { id: 'cuentas', titulo: 'Cuentas de facturación', detalle: 'Para los asientos automáticos' },
  { id: 'ejercicio', titulo: 'Ejercicio fiscal', detalle: 'El año contable y sus períodos' },
  { id: 'consecutivos', titulo: 'Consecutivos', detalle: 'Cómo se numera cada documento' },
  { id: 'tributaria', titulo: 'Datos para Hacienda', detalle: 'Actividad, dirección y correo' },
  { id: 'hacienda', titulo: 'Conexión con Hacienda', detalle: 'Certificado y credenciales' },
  { id: 'sucursal', titulo: 'Sucursal y caja', detalle: 'Desde donde se emite' },
];
// Encabezado según la versión (con contabilidad o solo facturación)
const marca = (contabilidad: boolean) => contabilidad
  ? { titulo: 'Configura tu empresa', sub: 'Seven Accounting · Digital Invoices', fin: 'Listo para empezar' }
  : { titulo: 'Configura tu facturación', sub: 'Seven Digital Invoices', fin: 'Listo para facturar' };
const TITULO_PASO: Partial<Record<PasoId, string>> = { consecutivos: 'Consecutivos de documentos' };

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const p2 = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-01`;
const fmtFecha = (d: Date) => `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
// El ejercicio va del mes de inicio al cierre del año: se crea un período por mes, abierto
function periodos(inicio: Date) {
  const r: Date[] = [];
  for (let m = inicio.getMonth(); m < 12; m++) r.push(new Date(inicio.getFullYear(), m, 1));
  return r;
}

export default function OnboardingContable() {
  const [estado, setEstado] = useState<EstadoOnboarding | null>(null);
  const [actual, setActual] = useState<PasoId | 'fin'>('empresa');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const [verApiKey, setVerApiKey] = useState(false);
  const [emp, setEmp] = useState({ nombreLegal: '', nombreComercial: '', tipoId: '02', numeroId: '', pais: 'CR', zonaHoraria: 'America/Costa_Rica', numeroLegalizacion: '', citasPresentacion: '' });
  const [nom, setNom] = useState<Nomenclatura>(NOMENCLATURA_INICIAL);
  const [primaria, setPrimaria] = useState('CRC');
  const [secundarias, setSecundarias] = useState<string[]>(['USD']);
  const [modoCat, setModoCat] = useState<'base' | 'importar' | 'crear'>('base');
  const [subido, setSubido] = useState<{ archivo: string; cuentas: Cuenta[]; errores: string[]; total: number } | null>(null);
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mesInicio, setMesInicio] = useState(1);
  const planRef = useRef<HTMLInputElement>(null);

  const pedir = () => fetch('/api/onboarding-contable').then(r => r.json() as Promise<EstadoOnboarding>);
  function aplicar(e: EstadoOnboarding) {
    setEstado(e);
    const d = e.datos;
    const x = e.empresa;
    setEmp({ nombreLegal: x.nombreLegal, nombreComercial: x.nombreComercial, tipoId: x.tipoId || '02', numeroId: x.numeroId, pais: x.pais || 'CR',
      zonaHoraria: x.zonaHoraria || paisPorCodigo(x.pais)?.zona || 'America/Costa_Rica', numeroLegalizacion: x.numeroLegalizacion ?? '', citasPresentacion: x.citasPresentacion ?? '' });
    if (d.nomenclatura) setNom(d.nomenclatura);
    // Volviendo del Catálogo de cuentas (Crear mi plan): queda elegida esa opción
    let desdeCatalogo = false;
    try { desdeCatalogo = sessionStorage.getItem('onboarding-plan-propio') === '1'; sessionStorage.removeItem('onboarding-plan-propio'); } catch { /* sin almacenamiento */ }
    if (desdeCatalogo || d.catalogo === 'propio' || d.catalogo === 'crear') setModoCat('crear');
    else if (d.catalogo) setModoCat(d.catalogo);
    setPrimaria(d.monedaFuncional || monedaPrimariaDePais(x.pais));
    if (d.monedaFuncional) setSecundarias(d.monedasSecundarias ?? []);
    if (d.ejercicio) { const [a, m] = d.ejercicio.inicio.split('-').map(Number); setAnio(a); setMesInicio(m); }
    const pendiente = e.pasos.find(p => !e.listos[p]);
    setActual(pendiente ?? 'fin');
  }
  // Se vuelve a leer al cambiar la versión (con contabilidad o solo
  // facturación), porque los pasos son otros.
  const { contabilidad } = useModulos();
  useEffect(() => {
    let vivo = true;
    pedir().then(e => { if (vivo) aplicar(e); }).catch(() => {});
    return () => { vivo = false; };
  }, [contabilidad]);
  // Abierto como demostración: se puede salir y volver a la pantalla de origen
  const [origen] = useState(origenDemostracion);

  // Pasos de esta versión
  // Guatemala: los pasos de facturación tienen los nombres de la SAT (certificador, establecimiento)
  const textosPais = textosDe(emp.pais);
  const nombresPais: Partial<Record<PasoId, { titulo: string; detalle: string }>> = {
    tributaria: textosPais.pasoTributaria, hacienda: textosPais.pasoConexion, sucursal: textosPais.pasoSucursal,
  };
  const PASOS = estado ? TODOS_LOS_PASOS.filter(p => estado.pasos.includes(p.id)).map(p => ({ ...p, ...nombresPais[p.id] })) : [];
  const gtPais = esGuatemala(emp.pais);
  const [permitirPruebas, setPermitirPruebas] = useState(false);
  useEffect(() => {
    let vivo = true;
    fetch('/api/empresa/plan').then(r => r.json()).then(p => { if (vivo) setPermitirPruebas(Boolean(p?.permitirPruebas)); }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  // Los pasos de facturación guardan su propio formulario antes de avanzar
  const guardarFormulario = useRef<Guardar | null>(null);
  const registrarGuardado = useCallback((f: Guardar) => { guardarFormulario.current = f; }, []);
  const idx = actual === 'fin' ? PASOS.length : PASOS.findIndex(p => p.id === actual);
  const habilitado = (i: number) => !estado || PASOS.slice(0, i).every(p => estado.listos[p.id]);
  const todos = estado ? PASOS.every(p => estado.listos[p.id]) : false;
  const inicioEj = new Date(anio, mesInicio - 1, 1);
  const finEj = new Date(anio, 11, 31);

  async function guardar(paso: PasoId | 'completar', valores: Record<string, unknown>) {
    setGuardando(true); setError(null);
    const r = await fetch('/api/onboarding-contable', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paso, valores }) });
    const d = await r.json().catch(() => ({}));
    setGuardando(false);
    if (!r.ok) { setError(d.error ?? 'No se pudo guardar.'); return false; }
    setEstado(d as EstadoOnboarding);
    return true;
  }

  async function continuar() {
    if (actual === 'fin') return;
    let valores: Record<string, unknown> =
      actual === 'empresa' ? { empresa: emp, monedaPrimaria: primaria, monedasSecundarias: secundarias }
        : actual === 'nomenclatura' ? { nomenclatura: nom }
          : actual === 'catalogo' ? (modoCat === 'base' ? { modo: 'base' } : modoCat === 'crear' ? { modo: 'propio' } : { modo: modoCat, cuentas: subido?.cuentas ?? [] })
            : actual === 'ejercicio' ? { inicio: iso(inicioEj), primerPeriodo: iso(inicioEj) }
              : {};
    if ((actual === 'cuentas' || actual === 'tributaria' || actual === 'hacienda' || actual === 'sucursal') && guardarFormulario.current) {
      setGuardando(true); setError(null);
      const r = await guardarFormulario.current();
      setGuardando(false);
      if (typeof r === 'string') { setError(r); return; }
      if (r) valores = r.valores;
    }
    if (actual === 'catalogo' && modoCat === 'importar' && subido?.errores.length) { setError('Corrige los errores del archivo y súbelo de nuevo.'); return; }
    if (!(await guardar(actual, valores))) return;
    // El plan cambió en la base: las pantallas que lo usan (buscadores de cuentas) lo vuelven a leer
    if (actual === 'nomenclatura' || actual === 'catalogo') recargarCatalogo();
    const sig = PASOS[idx + 1];
    if (sig) setActual(sig.id);
    else if (await guardar('completar', {})) setActual('fin');
  }

  const monedaPlan = () => estado?.datos.monedaFuncional || primaria;
  const pad = (n: number, d = '1') => d.padEnd(n, '0');
  const codigo = (...s: string[]) => s.join(nom.separador);
  async function bajarPlantilla() {
    const l = nom.longitudes;
    const m = pad(l.mayor), s = '1'.padStart(l.submajor, '0'), d1 = '1'.padStart(l.detalle, '0'), d2 = '2'.padStart(l.detalle, '0');
    await descargarPlantilla('plantilla-plan-de-cuentas.xlsx', [{
      nombre: 'Plan de cuentas',
      columnas: [
        { titulo: 'Código*', ancho: 20, nota: `Con la nomenclatura definida: ${l.mayor}, ${l.submajor} y ${l.detalle} dígitos${nom.separador ? `, separados por «${nom.separador}»` : ''}.` },
        { titulo: 'Nombre*', ancho: 36 },
        { titulo: 'Naturaleza', ancho: 14, nota: 'Deudora o Acreedora. Si se deja vacío se toma del grupo (primer dígito).' },
        { titulo: 'Posteable', ancho: 12, nota: 'Sí o No. Si se deja vacío, solo las cuentas sin subcuentas son posteables.' },
        { titulo: 'Moneda', ancho: 10, nota: `CRC, USD… Si se deja vacío queda en ${monedaPlan()}.` },
      ],
      ejemplos: [
        [codigo(m), 'Efectivo y equivalentes', 'Deudora', 'No', ''],
        [codigo(m, s), 'Caja', 'Deudora', 'No', ''],
        [codigo(m, s, d1), 'Caja general', 'Deudora', 'Sí', monedaPlan()],
        [codigo(m, s, d2), 'Caja chica', 'Deudora', 'Sí', monedaPlan()],
      ],
    }], ['Una fila por cuenta. Cada cuenta necesita su cuenta superior en el mismo archivo.', 'Los saldos iniciales quedan en cero.']);
  }
  async function subirPlan(f: File) {
    setError(null);
    try {
      const filas = await leerExcel(f, 'Plan de cuentas');
      const r = armarPlan(filas.map(x => ({
        codigo: celda(x, 'Código', 'Codigo'), nombre: celda(x, 'Nombre'), naturaleza: celda(x, 'Naturaleza'),
        posteable: celda(x, 'Posteable'), moneda: celda(x, 'Moneda'),
      })), nom, monedaPlan());
      setSubido({ archivo: f.name, ...r });
    } catch { setError('No se pudo leer el archivo. Usa la plantilla en formato Excel.'); }
  }

  if (!estado) return <div style={{ padding: 24, fontFamily: FONT, fontSize: 12, color: C.n700 }}>Cargando…</div>;
  const moneda = estado.datos.monedaFuncional || primaria;
  const base = planBase(moneda, estado.datos.nomenclatura ?? nom);
  const planVista = modoCat === 'base' ? (base.error ? [] : base.cuentas) : modoCat === 'importar' ? subido?.cuentas ?? [] : [];
  const cero = (m?: string) => `${simboloMoneda(m ?? moneda)}${nom.decimalSep === ',' ? '0,00' : '0.00'}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: FONT, background: C.n200 }}>
      <header style={{ height: 56, flexShrink: 0, background: C.n000, borderBottom: `1px solid ${C.n500}`, display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px' }}>
        <span aria-hidden style={{ width: 30, height: 30, borderRadius: radius.sm, background: C.brand, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Logo /></span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.n900 }}>{marca(estado.modulos.contabilidad).titulo}</span>
          <span style={{ fontSize: 11, color: C.n700 }}>{marca(estado.modulos.contabilidad).sub}</span>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: C.n700 }}>{estado.completos} de {PASOS.length} pasos</span>
        <div style={{ width: 120, height: 6, borderRadius: 3, background: C.n500, overflow: 'hidden' }}>
          <div style={{ width: `${(estado.completos / PASOS.length) * 100}%`, height: '100%', background: C.brand, transition: 'width .3s' }} />
        </div>
        {/* La API Key se obtiene sin terminar el asistente: así se conecta el módulo con Management desde el inicio */}
        <Button variant="secondary" onClick={() => setVerApiKey(true)}>API Key</Button>
        {origen && <Button variant="secondary" onClick={() => salirDeDemostracion(r => router.replace(r))}>Salir de la demostración</Button>}
      </header>
      {verApiKey && (
        <Modal open title="API Key para Management" onClose={() => setVerApiKey(false)} width={640}>
          <AyudaApiKey />
          <SeccionApiKey obtener={obtenerApiKey} regenerar={regenerarApiKey} marca={C.brand} />
        </Modal>
      )}

      <div className="onb-cuerpo" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div className="onb-grid" style={{ maxWidth: 1280, height: '100%', boxSizing: 'border-box', margin: '0 auto', padding: '20px 24px', display: 'grid', gridTemplateColumns: '240px 1fr', gridTemplateRows: 'minmax(0, 1fr)', gap: 20 }}>
          <nav aria-label="Pasos" style={{ display: 'flex', flexDirection: 'column', alignSelf: 'start' }}>
            {PASOS.map((p, i) => {
              const listo = estado.listos[p.id]; const activo = actual === p.id; const abierto = habilitado(i);
              return (
                <button key={p.id} disabled={!abierto} onClick={() => { setActual(p.id); setError(null); }} style={pasoBtn(activo, abierto)}>
                  <Marca n={i + 1} listo={listo} activo={activo} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: activo ? 600 : 500, color: C.n900 }}>{p.titulo}</span>
                    <span style={{ fontSize: 11, color: C.n700 }}>{p.detalle}</span>
                  </span>
                </button>
              );
            })}
            <button disabled={!todos} onClick={() => setActual('fin')} style={{ ...pasoBtn(actual === 'fin', todos), alignItems: 'center' }}>
              <Marca n={PASOS.length + 1} listo={estado.datos.completado} activo={actual === 'fin'} />
              <span style={{ fontSize: 13, fontWeight: 500, color: C.n900 }}>{marca(estado.modulos.contabilidad).fin}</span>
            </button>
          </nav>

          {/* Altura fija: los botones Atrás / Continuar quedan siempre en el mismo lugar y el contenido se desplaza adentro */}
          <section style={{ background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.lg, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            {actual === 'fin' ? <Fin estado={estado} onEmpezar={r => { olvidarDemostracion(); router.replace(r); }} /> : <>
              <div style={{ padding: '16px 24px 0' }}>
                <div style={{ fontSize: 11, color: C.brand, fontWeight: 500 }}>Paso {idx + 1} de {PASOS.length}</div>
                <h2 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 600, color: C.n900 }}>{TITULO_PASO[PASOS[idx].id] ?? PASOS[idx].titulo}</h2>
              </div>

              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {actual === 'empresa' && (
                  <CamposIdentificacion config={emp}
                    patch={p => { setEmp(e => ({ ...e, ...p })); if (p.pais) { const m = monedaPrimariaDePais(p.pais); setPrimaria(m); setSecundarias(s => s.filter(x => x !== m)); } }}
                    libros={estado.modulos.contabilidad}
                    monedas={estado.modulos.contabilidad ? { primaria, secundarias, cambiar: (pr, se) => { setPrimaria(pr); setSecundarias(se); } } : undefined} />
                )}

                {actual === 'nomenclatura' && <>
                  <TabNomenclatura compacto config={nom} patch={(p: Partial<Nomenclatura>) => setNom(n => ({ ...n, ...p }))} />
                  {estado.listos.catalogo && estado.datos.nomenclatura && !mismaNomenclatura(estado.datos.nomenclatura, nom) && (
                    <Aviso>Los códigos de tu plan de cuentas se actualizarán con este formato.</Aviso>
                  )}
                </>}

                {actual === 'catalogo' && <>
                  <div className="onb-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <Opcion activo={modoCat === 'base'} onClick={() => setModoCat('base')}
                      titulo="Usar el plan base" texto={`El plan del sistema, en ${moneda} y en cero.`} />
                    <Opcion activo={modoCat === 'importar'} onClick={() => setModoCat('importar')}
                      titulo="Importar mi plan" texto="Desde la plantilla de Excel." />
                    <Opcion activo={modoCat === 'crear'} onClick={() => setModoCat('crear')}
                      titulo="Crear mi plan" texto="En el Catálogo de cuentas, con todas sus herramientas." />
                  </div>

                  {modoCat === 'base' && base.error && <Aviso>{base.error}</Aviso>}

                  {modoCat === 'importar' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Button variant="secondary" onClick={bajarPlantilla}>Descargar plantilla</Button>
                      <input ref={planRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) subirPlan(f); e.target.value = ''; }} />
                      <Button onClick={() => planRef.current?.click()}>{subido ? 'Subir otro archivo' : 'Subir archivo'}</Button>
                      {subido && <span style={{ fontSize: 12, color: C.n700 }}>{subido.archivo} · {subido.total} cuentas · {posteablesConMoneda(subido.cuentas)} posteables</span>}
                    </div>
                  )}
                  {modoCat === 'importar' && subido && subido.errores.length > 0 && <Errores lista={subido.errores} />}

                  {modoCat === 'crear' && (
                    <div style={{ border: `1px solid ${C.brandBd}`, background: C.brandBg, borderRadius: radius.md, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Crea tu plan en el Catálogo de cuentas</div>
                      <div style={{ fontSize: 12.5, color: C.n700, lineHeight: 1.55 }}>
                        Ahí agregas cuentas, niveles y monedas con todas las herramientas. Cuando termines, vuelve al asistente con el botón «Volver al asistente»
                        y pulsa Continuar: en el paso siguiente asocias las cuentas de facturación a tu plan.
                      </div>
                      <div><Button onClick={() => { try { sessionStorage.setItem('onboarding-plan-propio', '1'); } catch { /* sin almacenamiento */ } router.push('/catalogo'); }}>Ir al Catálogo de cuentas</Button></div>
                    </div>
                  )}

                  {planVista.length > 0 && <TablaPlan cuentas={planVista} cero={cero} />}
                </>}

                {actual === 'ejercicio' && <>
                  <div className="onb-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 480 }}>
                    <FormField label="Año del ejercicio" required>
                      <Select value={String(anio)} onChange={v => setAnio(Number(v))} options={[0, 1].map(d => ({ value: String(hoy.getFullYear() + d), label: String(hoy.getFullYear() + d) }))} />
                    </FormField>
                    <FormField label="Inicio del ejercicio" required>
                      <Select value={String(mesInicio)} onChange={v => setMesInicio(Number(v))} options={MESES.map((m, i) => ({ value: String(i + 1), label: m }))} />
                    </FormField>
                  </div>
                  <Vista titulo={`Ejercicio del ${fmtFecha(inicioEj)} al ${fmtFecha(finEj)} · ${periodos(inicioEj).length} períodos abiertos`}>
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

                {actual === 'cuentas' && <PasoCuentas onRegistrar={registrarGuardado} />}
                {actual === 'tributaria' && (gtPais ? <PasoTributariaGT onRegistrar={registrarGuardado} /> : <PasoTributaria onRegistrar={registrarGuardado} />)}
                {actual === 'hacienda' && (gtPais ? <PasoCertificadorGT onRegistrar={registrarGuardado} /> : <PasoHacienda onRegistrar={registrarGuardado} permitirPruebas={permitirPruebas} />)}
                {actual === 'sucursal' && <PasoSucursal onRegistrar={registrarGuardado} />}

                {actual === 'consecutivos' && <>
                  <p style={{ margin: 0, fontSize: 12.5, color: C.n700, lineHeight: 1.55 }}>
                    Así se numerará cada documento. Puedes dejarlo como está; para cambiar un formato usa el lápiz.
                  </p>
                  <ConsecutivosDocumentos onboarding />
                </>}

                {error && <div role="alert" style={{ fontSize: 12, color: C.error, background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: radius.md, padding: '8px 12px' }}>{error}</div>}
              </div>

              <div style={{ padding: '12px 24px', borderTop: `1px solid ${C.n500}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button variant="ghost" disabled={idx === 0 || guardando} onClick={() => { setActual(PASOS[idx - 1].id); setError(null); }}>Atrás</Button>
                <Button onClick={continuar} disabled={guardando || (actual === 'catalogo' && ((modoCat === 'importar' && !subido) || (modoCat === 'base' && Boolean(base.error))))}>
                  {guardando ? 'Guardando…' : idx === PASOS.length - 1 ? 'Terminar' : 'Continuar'}
                </Button>
              </div>
            </>}
          </section>
        </div>
      </div>
      <style>{`@media (max-width: 820px) { .onb-grid { grid-template-columns: 1fr !important; } .onb-cuerpo { overflow: auto !important; } .onb-grid { height: auto !important; grid-template-rows: auto !important; } .onb-2col, .onb-3col { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

const RECOMENDADOS: { titulo: string; texto: string; ruta: string; Icono: typeof IcUser; siSecundarias?: boolean; contable?: boolean; soloFacturacion?: boolean }[] = [
  { titulo: 'Productos o servicios', texto: 'Así cada línea de factura trae su CABYS, IVA y precio.', ruta: '/facturacion-config?tab=productos', Icono: IcInvoice },
  { titulo: 'Clientes y proveedores', texto: 'Para facturarles y registrar cobros, pagos y anticipos.', ruta: '/clientes', Icono: IcUser, contable: true },
  { titulo: 'Clientes', texto: 'Para facturarles sin escribir sus datos cada vez.', ruta: '/facturacion-config?tab=receptores', Icono: IcUser, soloFacturacion: true },
  { titulo: 'Cuentas bancarias y afiliados', texto: 'Para transferencias, depósitos y liquidaciones de tarjeta.', ruta: '/config-actividad-bancaria', Icono: IcBancos, contable: true },
  { titulo: 'Tipo de cambio', texto: 'Para registrar en tus monedas secundarias.', ruta: '/parametros', Icono: IcGlobe, siSecundarias: true, contable: true },
  { titulo: 'Usuarios y permisos', texto: 'Invita a tu equipo y define qué puede hacer cada uno.', ruta: '/usuarios-permisos', Icono: IcUser },
];

const pasoBtn = (activo: boolean, abierto: boolean) => ({
  display: 'flex', gap: 12, alignItems: 'flex-start', textAlign: 'left' as const, padding: '10px 12px', border: 'none', borderRadius: radius.md,
  background: activo ? C.n000 : 'transparent', boxShadow: activo ? `inset 0 0 0 1px ${C.brandBd}` : 'none',
  cursor: abierto ? 'pointer' : 'not-allowed', opacity: abierto ? 1 : 0.45, fontFamily: FONT,
});

function TablaPlan({ cuentas, cero }: { cuentas: Cuenta[]; cero: (moneda?: string) => string }) {
  const filas = aplanar(cuentas).filter(c => c.nivel !== 'subgrupo' && c.nivel !== 'subsubgrupo');
  const sangria: Record<string, number> = { grupo: 0, mayor: 1, submajor: 2, detalle: 3, auxiliar: 4 };
  return (
    <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, maxHeight: 300, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead style={{ position: 'sticky', top: 0, background: C.n200 }}>
          <tr style={{ textAlign: 'left' }}>
            {['Código', 'Nombre', 'Moneda', 'Saldo'].map((h, i) => <th key={h} style={{ padding: '8px 12px', fontWeight: 500, color: C.n700, fontSize: 11.5, textAlign: i === 3 ? 'right' : 'left' }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {filas.map(c => (
            <tr key={c.id} style={{ borderTop: `1px solid ${C.n500}` }}>
              <td style={{ padding: '6px 12px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: C.n900 }}>{c.code}</td>
              <td style={{ padding: '6px 12px', paddingLeft: 12 + (sangria[c.nivel] ?? 0) * 14, color: C.n900, fontWeight: c.posteable ? 400 : 600 }}>{c.nombre}</td>
              <td style={{ padding: '6px 12px', color: C.n700 }}>{c.posteable ? c.moneda : ''}</td>
              <td style={{ padding: '6px 12px', textAlign: 'right', color: C.n700, fontVariantNumeric: 'tabular-nums' }}>{c.posteable ? cero(c.moneda) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Marca({ n, listo, activo }: { n: number; listo: boolean; activo: boolean }) {
  return (
    <span aria-hidden style={{ width: 24, height: 24, borderRadius: 12, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600,
      background: listo ? C.success : activo ? C.brand : C.n000, color: listo || activo ? '#fff' : C.n700, border: `1.5px solid ${listo ? C.success : activo ? C.brand : C.n500}` }}>
      {listo ? <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7.2l3 3 6-6.4" /></svg> : n}
    </span>
  );
}

function Aviso({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 12, color: C.n900, background: C.warningBg, border: `1px solid ${C.warning}`, borderRadius: radius.md, padding: '9px 12px' }}>{children}</div>;
}

function Vista({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div style={{ background: C.n200, border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ fontSize: 11.5, fontWeight: 500, color: C.n700 }}>{titulo}</span>
      {children}
    </div>
  );
}

function Opcion({ activo, onClick, titulo, texto, disabled }: { activo: boolean; onClick: () => void; titulo: string; texto: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={activo}
      style={{ textAlign: 'left', padding: 14, borderRadius: radius.md, fontFamily: FONT, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        border: `1.5px solid ${activo ? C.brand : C.n500}`, background: activo ? C.brandBg : C.n000, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span aria-hidden style={{ width: 16, height: 16, borderRadius: 8, flexShrink: 0, marginTop: 1, border: `1.5px solid ${activo ? C.brand : C.n500}`, background: C.n000, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {activo && <span style={{ width: 8, height: 8, borderRadius: 4, background: C.brand }} />}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.n900 }}>{titulo}</span>
        <span style={{ fontSize: 11.5, color: C.n700, lineHeight: 1.45 }}>{texto}</span>
      </span>
    </button>
  );
}

function Errores({ lista }: { lista: string[] }) {
  return (
    <div role="alert" style={{ fontSize: 12, color: C.error, background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: radius.md, padding: '8px 12px' }}>
      {lista.slice(0, 5).map((e, i) => <div key={i}>{e}</div>)}
      {lista.length > 5 && <div>y {lista.length - 5} más.</div>}
    </div>
  );
}

function Fin({ estado, onEmpezar }: { estado: EstadoOnboarding; onEmpezar: (ruta: string) => void }) {
  const d = estado.datos;
  const contabilidad = estado.modulos.contabilidad;
  const n = d.nomenclatura;
  const pais = paisPorCodigo(estado.empresa.pais);
  const ej = d.ejercicio ? (() => {
    const [a, m] = d.ejercicio!.inicio.split('-').map(Number); const inicio = new Date(a, m - 1, 1);
    return `${fmtFecha(inicio)} al ${fmtFecha(new Date(a, 11, 31))} · ${periodos(inicio).length} períodos abiertos`;
  })() : '';
  const fe = estado.facturacion;
  const filasContables: [string, string][] = [
    ['Monedas', [d.monedaFuncional, ...(d.monedasSecundarias ?? [])].map(m => MONEDAS_CONTABLES.find(x => x.value === m)?.label ?? m).join(' · ')],
    ['Código de cuenta', n ? ['1'.padEnd(n.longitudes.mayor, '0'), '1'.padStart(n.longitudes.submajor, '0'), '1'.padStart(n.longitudes.detalle, '0')].join(n.separador) : ''],
    ['Plan de cuentas', `${d.catalogo === 'base' ? 'Plan base' : 'Plan propio'} · ${estado.cuentasPosteables} cuentas posteables en cero`],
    ['Ejercicio fiscal', ej],
    ['Consecutivos', 'Formatos de los documentos revisados'],
    ['Creado automáticamente', 'Clase de asiento GENERAL y libros GEN, AJU y CIE'],
  ];
  const filas: [string, string][] = [
    ['Empresa', `${estado.empresa.nombreLegal} · ${pais?.label ?? estado.empresa.pais}`],
    ...(contabilidad ? filasContables : []),
    ['Facturación electrónica', [fe.actividad, fe.ambiente === 'pruebas' ? 'Ambiente de pruebas' : 'Producción', `${textosDe(estado.empresa.pais).sucursal} ${fe.sucursal}`, fe.caja ? `Caja ${fe.caja}` : ''].filter(Boolean).join(' · ')],
  ];
  const recomendados = RECOMENDADOS.filter(r => (contabilidad ? !r.soloFacturacion : !r.contable) && (!r.siSecundarias || (d.monedasSecundarias ?? []).length > 0))
    .map(r => (r.ruta === '/facturacion-config?tab=productos' ? { ...r, texto: textosDe(estado.empresa.pais).recomendadoProductos } : r));
  const titulo = contabilidad ? ['Todo está listo', 'Ya puedes registrar asientos y emitir comprobantes.'] : ['Tu facturación está lista', 'Ya puedes emitir comprobantes.'];
  return (
    <>
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: C.n900 }}>{titulo[0]}</h2>
        <p style={{ margin: '6px 0 0', fontSize: 12.5, color: C.n700 }}>{titulo[1]}</p>
      </div>
      <dl style={{ margin: 0, flexShrink: 0, display: 'grid', gridTemplateColumns: 'minmax(150px, 200px) 1fr', border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'hidden' }}>
        {filas.map(([k, v], i) => (
          <div key={k} style={{ display: 'contents' }}>
            <dt style={{ padding: '10px 14px', fontSize: 12, color: C.n700, background: C.n200, borderTop: i ? `1px solid ${C.n500}` : 'none' }}>{k}</dt>
            <dd style={{ margin: 0, padding: '10px 14px', fontSize: 12.5, color: C.n900, borderTop: i ? `1px solid ${C.n500}` : 'none' }}>{v}</dd>
          </div>
        ))}
      </dl>
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: C.n900 }}>Siguientes pasos recomendados</p>
        <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'hidden', flexShrink: 0 }}>
          {recomendados.map((r, i) => (
            <button key={r.titulo} onClick={() => onEmpezar(r.ruta)} className="onb-reco"
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: 'none', borderTop: i ? `1px solid ${C.n500}` : 'none', background: C.n000, cursor: 'pointer', fontFamily: FONT, textAlign: 'left' }}>
              <span aria-hidden style={{ width: 28, height: 28, borderRadius: 14, background: C.brandBg, color: C.brand, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><r.Icono className="w-3.5 h-3.5" /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: C.n900 }}>{r.titulo}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: C.n700, marginTop: 1 }}>{r.texto}</span>
              </span>
              <span aria-hidden style={{ color: C.n700, display: 'inline-flex' }}><IcChevronRight className="w-3.5 h-3.5" /></span>
            </button>
          ))}
        </div>
      </div>
    </div>
    <style>{`.onb-reco:hover { background: ${C.n200} !important; }`}</style>
    {/* Mismo pie que los pasos: el botón principal queda en el mismo lugar */}
    <div style={{ padding: '12px 24px', borderTop: `1px solid ${C.n500}`, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
      {contabilidad && <Button variant="secondary" onClick={() => onEmpezar('/asientos')}>Crear el primer asiento</Button>}
      <Button variant="secondary" onClick={() => onEmpezar('/facturacion/emitidos/nuevo')}>Emitir la primera factura</Button>
      <Button onClick={() => onEmpezar('/dashboard')}>Empezar a usar</Button>
    </div>
    </>
  );
}
