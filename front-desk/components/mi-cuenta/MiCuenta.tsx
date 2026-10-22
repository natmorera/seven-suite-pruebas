'use client';
// Mi cuenta: datos, permisos, contraseña e impresoras del usuario con sesión iniciada.
// El usuario solo consulta sus permisos; los cambia un administrador en Configuración › Usuarios y Permisos.
import { useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Input, Select, Toast } from '@/components/suite/ui';
import { IcCheck } from '@/components/suite/icons';
import { Pantalla } from '@/components/layout/Pantalla';
import { HOY, USUARIO_ACTUAL, fmtF } from '@/components/hotel/datos';
import { useDato } from '@/components/configuracion/store';
import { usePermisos } from '@/components/configuracion/permisos/store';
import { ARBOL, contar, hojasDe, marcada } from '@/components/configuracion/permisos/arbol';
import { Campo, Celda, Fila, Tabla } from '@/components/configuracion/kit';

const TABS = ['Mi perfil', 'Mis permisos', 'Contraseña', 'Impresora'] as const;
type Tab = (typeof TABS)[number];

const tarjeta: CSSProperties = { background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.card, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT };
const nota: CSSProperties = { fontSize: 12, color: C.n700, margin: 0, lineHeight: 1.6 };

export default function MiCuenta() {
  const { usuarios, setUsuarios, roles } = usePermisos();
  // ?tab=Impresora (u otra pestaña) abre directo esa pestaña
  const tabUrl = useSyncExternalStore(() => () => {}, () => new URLSearchParams(window.location.search).get('tab'), () => null);
  const [tabManual, setTab] = useState<Tab | null>(null);
  const tab: Tab = tabManual ?? ((TABS as readonly string[]).includes(tabUrl ?? '') ? (tabUrl as Tab) : 'Mi perfil');
  const [toast, setToast] = useState<string | null>(null);
  const yo = usuarios.find(u => u.nombre === USUARIO_ACTUAL);

  if (!yo) {
    return <Pantalla titulo="Mi cuenta"><p style={nota}>No se encontró el usuario de la sesión ({USUARIO_ACTUAL}).</p></Pantalla>;
  }
  const rol = roles.find(r => r.id === yo.rolId);
  const actualizar = (p: Partial<typeof yo>) => setUsuarios(us => us.map(u => (u.id === yo.id ? { ...u, ...p } : u)));

  return (
    <Pantalla titulo="Mi cuenta" tabs={{ items: TABS, activo: tab, onChange: setTab }}>
      <div style={{ maxWidth: tab === 'Impresora' ? 1040 : 720, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {tab === 'Mi perfil' && (
          <div style={tarjeta}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <Dato label="Usuario">{yo.usuario}</Dato>
              <Dato label="Nombre">{yo.nombre}</Dato>
              <Dato label="Correo electrónico">{yo.correo}</Dato>
              <Dato label="Rol">{rol?.nombre ?? 'Sin rol asignado'}{yo.admin ? ' · Administrador' : ''}</Dato>
              <Dato label="Estado"><span style={{ color: yo.activo ? C.successDk : C.n700 }}>{yo.activo ? 'Activo' : 'Inactivo'}</span></Dato>
              <Dato label="Último acceso">{fmtF(yo.ultimoAcceso)}</Dato>
              <Dato label="Último cambio de contraseña">{fmtF(yo.claveCambiada)}</Dato>
              <Dato label="Usuario desde">{fmtF(yo.creado)}</Dato>
            </div>
            <p style={{ ...nota, fontSize: 11.5, borderTop: `1px solid ${C.n500}`, paddingTop: 12 }}>
              Para cambiar tu nombre, rol o permisos, contacta a un administrador en Configuración › Usuarios y Permisos.
            </p>
          </div>
        )}

        {tab === 'Mis permisos' && <MisPermisos permisos={yo.permisos} rol={rol?.nombre} />}

        {tab === 'Contraseña' && (
          <CambiarClave onListo={() => { actualizar({ claveCambiada: HOY }); setToast('Contraseña actualizada'); }} />
        )}

        {tab === 'Impresora' && (
          <MisImpresoras valores={yo.impresoras ?? {}} onChange={(codigo, impresora, texto) => {
            const n = { ...(yo.impresoras ?? {}) };
            if (impresora) n[codigo] = impresora; else delete n[codigo];
            actualizar({ impresoras: n });
            setToast(texto);
          }} />
        )}
      </div>
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
    </Pantalla>
  );
}

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p style={{ fontSize: 11, color: C.n700, margin: '0 0 3px' }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 500, color: C.n900, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</p>
    </div>
  );
}

// ── Permisos (solo lectura) ──────────────────────────────────────────────────
function MisPermisos({ permisos, rol }: { permisos: Set<string>; rol?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT }}>
      <p style={nota}>
        Estos son los permisos que tienes activos{rol && <> por tu rol <b style={{ color: C.n900, fontWeight: 500 }}>{rol}</b></>}.
        Son solo de consulta: si necesitas más acceso, pídelo a un administrador.
      </p>
      {permisos.size === 0 && <p style={{ ...nota, textAlign: 'center', padding: 24 }}>No tienes permisos asignados todavía.</p>}
      {ARBOL.map(cat => (
        <div key={cat.key}>
          <p style={{ fontSize: 11, fontWeight: 600, color: C.n700, letterSpacing: '.05em', textTransform: 'uppercase', margin: '0 0 8px' }}>{cat.label}</p>
          {cat.modulos.map(mod => {
            const hojas = hojasDe(mod);
            const n = contar(hojas, permisos);
            const cabecera: CSSProperties = { padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.n200 };
            if (n === 0) {
              return (
                <div key={mod.key} style={{ ...cabecera, border: `1px solid ${C.n500}`, borderRadius: radius.md, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.n700 }}>{mod.label}</span>
                  <span style={{ fontSize: 11, color: C.n700, fontStyle: 'italic' }}>Sin acceso</span>
                </div>
              );
            }
            return (
              <div key={mod.key} style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, marginBottom: 8, overflow: 'hidden', background: C.n000 }}>
                <div style={{ ...cabecera, borderBottom: `1px solid ${C.n500}` }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.n900 }}>{mod.label}</span>
                  <span style={{ fontSize: 11, color: n === hojas.length ? C.successDk : C.n700 }}>{n}/{hojas.length}</span>
                </div>
                <div style={{ padding: '6px 14px' }}>
                  {[{ key: '', label: '', hojas: mod.hojas ?? [] }, ...(mod.grupos ?? [])].map(g => {
                    const activas = g.hojas.filter(x => marcada(x, permisos));
                    if (!activas.length) return null;
                    return (
                      <div key={g.key || 'base'} style={{ padding: '4px 0' }}>
                        {g.label && <p style={{ fontSize: 11.5, color: C.n700, margin: '6px 0 2px' }}>{g.label}</p>}
                        {activas.map(x => (
                          <div key={x.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                            <span style={{ width: 16, height: 16, borderRadius: 4, background: '#EAF5EE', border: '1px solid #C1DECD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: C.successDk }}>
                              <IcCheck size={9} />
                            </span>
                            <span style={{ fontSize: 12.5, color: C.n900 }}>
                              {x.label}
                              {x.subOpciones && <span style={{ color: C.n700 }}> · {x.subOpciones.filter(o => permisos.has(`${x.key}:${o}`)).join(', ')}</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Contraseña ───────────────────────────────────────────────────────────────
function CambiarClave({ onListo }: { onListo: () => void }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState('');
  const limpiar = (f: (v: string) => void) => (v: string) => { f(v); setError(''); };
  const guardar = () => {
    if (!actual.trim()) return setError('Ingresa tu contraseña actual.');
    if (nueva.trim().length < 8) return setError('La nueva contraseña debe tener al menos 8 caracteres.');
    if (nueva === actual) return setError('La nueva contraseña debe ser distinta de la actual.');
    if (nueva !== confirmar) return setError('Las contraseñas no coinciden.');
    setActual(''); setNueva(''); setConfirmar('');
    onListo();
  };
  const tipo = ver ? 'text' : 'password';
  return (
    <div style={{ ...tarjeta, maxWidth: 400 }}>
      <Campo label="Contraseña actual"><Input type={tipo} value={actual} onChange={limpiar(setActual)} autoComplete="current-password" /></Campo>
      <Campo label="Nueva contraseña" hint="Mínimo 8 caracteres."><Input type={tipo} value={nueva} onChange={limpiar(setNueva)} autoComplete="new-password" /></Campo>
      <Campo label="Confirmar nueva contraseña" error={error || undefined}><Input type={tipo} value={confirmar} onChange={limpiar(setConfirmar)} autoComplete="new-password" /></Campo>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.n700, cursor: 'pointer' }}>
        <input type="checkbox" checked={ver} onChange={e => setVer(e.target.checked)} /> Mostrar contraseñas
      </label>
      <div><Button onClick={guardar}>Actualizar contraseña</Button></div>
    </div>
  );
}

// ── Impresora personal por tipo de documento ────────────────────────────────
function MisImpresoras({ valores, onChange }: { valores: Record<string, string>; onChange: (codigo: string, impresora: string, texto: string) => void }) {
  const [tipos] = useDato('tiposDocumento');
  const [impresoras] = useDato('impresoras');
  const [asignaciones] = useDato('asignaciones');
  const activas = impresoras.filter(i => i.activa);
  const nombre = (id?: string) => (id === 'no' ? 'No se imprime' : impresoras.find(i => i.id === id)?.nombre ?? 'Predeterminada del sistema');
  return (
    <div style={tarjeta}>
      <p style={nota}>
        Elige la impresora que se usa para cada tipo de documento cuando imprimes desde tu sesión. Si dejas uno sin asignar,
        se usa la que la empresa tiene configurada en Empresa › Asignación de impresoras.
      </p>
      <Tabla headers={['Tipo', 'Código', 'De la empresa', 'Mi impresora']} anchos={{ 3: 240 }}>
        {tipos.filter(t => t.enUso).map(t => {
          const empresa = nombre(asignaciones.find(a => a.tipo === t.codigo)?.impresora);
          return (
            <Fila key={t.id}>
              <Celda style={{ whiteSpace: 'nowrap' }}><span style={{ padding: '3px 8px', background: C.n200, border: `1px solid ${C.n500}`, borderRadius: 4, fontSize: 12 }}>{t.nombre}</span></Celda>
              <Celda muted style={{ whiteSpace: 'nowrap' }}>{t.codigo}</Celda>
              <Celda muted style={{ whiteSpace: 'nowrap' }}>{empresa}</Celda>
              <Celda>
                <Select value={valores[t.codigo] ?? ''} options={[{ value: '', label: '- Usar la de la empresa -' }, ...activas.map(i => ({ value: i.id, label: i.nombre }))]}
                  onChange={v => onChange(t.codigo, v, v ? `${t.nombre}: se imprimirá en ${nombre(v)}` : `${t.nombre}: se usará la impresora de la empresa`)} />
              </Celda>
            </Fila>
          );
        })}
      </Tabla>
    </div>
  );
}
