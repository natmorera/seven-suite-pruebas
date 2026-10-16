'use client';
// Inicio de Seven Suite: buscar y abrir los módulos de la empresa, ver los
// demás módulos de la suite y las promociones (slides que se editan en WordPress).
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { MODULOS_SUITE, MODULOS_EMPRESA, EMPRESAS, enlaceDe, type ModuloSuite } from '@/modulos';

interface Slide { titulo: string; texto: string; boton: string; enlace: string; imagen: string; fondo: string }

// Prototipo: un solo usuario, «seven» con contraseña «1»
const USUARIO = { nombre: 'seven', correo: 'seven@mysevensuite.com', rol: 'Superusuario' };
const CREDENCIALES = { usuario: 'seven', clave: '1' };
const VERSION = 'v1.0.1';
const nada = () => () => {};
const leer = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const guardarUltimo = (id: string) => { try { localStorage.setItem('ultimo-modulo', id); } catch { /* sin almacenamiento */ } };
const normal = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function Isotipo({ colores, size = 34 }: { colores: [string, string]; size?: number }) {
  const id = colores.join('').replace(/#/g, '') + size;
  return (
    <svg width={size} height={size * 11 / 12} viewBox="0 0 12 11" fill="none" aria-hidden>
      <path d="M4.48475 10.3275H0V0H8.77964C6.95357 3.08871 5.38741 6.75999 4.49772 10.2777C4.49254 10.2948 4.48942 10.3109 4.48475 10.3275Z" fill={`url(#a${id})`} />
      <path d="M11.9998 10.3277H8.02295C8.91783 6.83795 10.2256 3.66728 11.9998 0.404785V10.3277Z" fill={`url(#b${id})`} />
      <defs>
        <linearGradient id={`a${id}`} x1="7.64316" y1="-3.88477" x2="-1.21149" y2="-2.42678" gradientUnits="userSpaceOnUse"><stop stopColor={colores[0]} /><stop offset="1" stopColor={colores[1]} /></linearGradient>
        <linearGradient id={`b${id}`} x1="11.485" y1="-3.32777" x2="7.39012" y2="-3.0099" gradientUnits="userSpaceOnUse"><stop stopColor={colores[0]} /><stop offset="1" stopColor={colores[1]} /></linearGradient>
      </defs>
    </svg>
  );
}
const Isotipos = ({ m, size }: { m: ModuloSuite; size?: number }) =>
  <span className="isos">{m.colores.map((c, i) => <Isotipo key={i} colores={c} size={size} />)}</span>;

function Logo({ alto = 30 }: { alto?: number }) {
  return <img className="logo" src="/logo-seven-suite.svg" alt="Seven Suite" height={alto} style={{ height: alto, width: 'auto' }} />;
}

function Promociones({ clase = '' }: { clase?: string }) {
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [i, setI] = useState(0);
  const pausa = useRef(false);
  useEffect(() => {
    let vivo = true;
    fetch('/api/promociones').then(r => r.json()).then((d: Slide[]) => { if (vivo && Array.isArray(d)) setSlides(d); }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  useEffect(() => {
    if (!slides || slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => { if (!pausa.current) setI(x => (x + 1) % slides.length); }, 7000);
    return () => clearInterval(t);
  }, [slides]);
  if (!slides?.length) return <aside className="promo vacia" aria-hidden />;
  const s = slides[i % slides.length];
  return (
    <aside className={`promo ${clase}`} style={{ background: s.fondo || '#1F2A26' }} onMouseEnter={() => { pausa.current = true; }} onMouseLeave={() => { pausa.current = false; }}
      aria-roledescription="carrusel" aria-label="Novedades de Seven">
      {s.imagen
        ? <img className="promo-img" src={s.imagen} alt="" />
        : <span className="promo-marca" aria-hidden><Isotipo colores={['#FFFFFF', '#FFFFFF']} size={240} /></span>}
      <div className="promo-velo" />
      <div className="promo-etiqueta">Novedades</div>
      <div className="promo-contenido" key={i}>
        <h2>{s.titulo}</h2>
        <p>{s.texto}</p>
        {s.boton && s.enlace && <a className="promo-boton" href={s.enlace} target="_blank" rel="noreferrer">{s.boton}</a>}
      </div>
      {slides.length > 1 && (
        <div className="promo-nav">
          <button aria-label="Anterior" onClick={() => setI(x => (x - 1 + slides.length) % slides.length)}>‹</button>
          <div className="puntos">
            {slides.map((_, k) => <button key={k} aria-label={`Ir a la novedad ${k + 1}`} aria-current={k === i} className={k === i ? 'activo' : ''} onClick={() => setI(k)} />)}
          </div>
          <button aria-label="Siguiente" onClick={() => setI(x => (x + 1) % slides.length)}>›</button>
        </div>
      )}
    </aside>
  );
}

// Selector de empresa del encabezado
function SelectorEmpresa({ empresa, onCambio }: { empresa: string; onCambio: (e: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);
  return (
    <div className="menu-sup" ref={ref}>
      <button className="boton-sup" onClick={() => setAbierto(v => !v)} aria-haspopup="menu" aria-expanded={abierto}>
        <span className="etq">Empresa</span><span className="val">{empresa}</span><span aria-hidden className="chev">▾</span>
      </button>
      {abierto && (
        <div className="desplegable" role="menu">
          {EMPRESAS.map(e => (
            <button key={e} role="menuitemradio" aria-checked={e === empresa} className={e === empresa ? 'activo' : ''} onClick={() => { onCambio(e); setAbierto(false); }}>
              {e}{e === empresa && <span aria-hidden>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Usuario de la sesión: nombre, correo, rol y cerrar sesión
function MenuUsuario({ onSalir }: { onSalir: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);
  return (
    <div className="menu-sup" ref={ref}>
      <button className="avatar" onClick={() => setAbierto(v => !v)} aria-label={`${USUARIO.nombre}: opciones`} aria-haspopup="menu" aria-expanded={abierto}>{USUARIO.nombre.charAt(0).toUpperCase()}</button>
      {abierto && (
        <div className="desplegable derecha usuario" role="menu">
          <div className="usuario-datos">
            <span className="avatar grande" aria-hidden>{USUARIO.nombre.charAt(0).toUpperCase()}</span>
            <span><b>{USUARIO.nombre}</b><span>{USUARIO.correo}</span><span className="rol">{USUARIO.rol}</span></span>
          </div>
          <span className="en-linea"><span className="punto" aria-hidden /> En línea</span>
          <button role="menuitem" className="salir" onClick={onSalir}>Cerrar sesión</button>
        </div>
      )}
    </div>
  );
}

// Pie: empresa dueña, ayuda, versión y fecha y hora
function Pie() {
  const ahora = useSyncExternalStore(cada30s, () => Math.floor(Date.now() / 30000), () => 0);
  const texto = ahora ? new Date(ahora * 30000).toLocaleString('es-CR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  return (
    <footer className="pie">
      <span>©2026 My Seven Suite S.A.</span>
      <span className="pie-der">
        <a href="mailto:soporte@myseven.cr">Ayuda</a>
        <span>{VERSION}</span>
        <span className="fecha">{texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : ''}</span>
      </span>
    </footer>
  );
}
const cada30s = (avisar: () => void) => { const t = setInterval(avisar, 30000); return () => clearInterval(t); };

// Tarjeta de un módulo de la empresa: compacta (isotipo, sigla y nombre). Solo
// la de «Continuar donde quedaste» muestra la descripción y los accesos directos.
function TarjetaModulo({ m, destacado, empresa }: { m: ModuloSuite; destacado?: boolean; empresa: string }) {
  const url = enlaceDe(m, empresa);
  const estilo = { ['--acento' as string]: m.texto, ['--suave' as string]: m.fondo } as React.CSSProperties;
  return (
    <article className={`mio${destacado ? ' destacado' : ''}${url ? '' : ' sin-enlace'}`} style={estilo}>
      <a className="mio-abrir" href={url ?? undefined} aria-disabled={!url} title={destacado ? undefined : m.descripcion}
        onClick={e => { if (!url) e.preventDefault(); else guardarUltimo(m.id); }}>
        <Isotipos m={m} size={destacado ? 40 : 30} />
        <span className="mio-texto">
          {m.sigla && <span className="mio-sigla">{m.sigla}</span>}
          <span className="mio-nombre">{m.nombre}</span>
          {destacado && <span className="mio-desc">{url ? m.descripcion : 'Disponible pronto.'}</span>}
          {!destacado && !url && <span className="mio-desc">Disponible pronto</span>}
        </span>
        <span className="mio-flecha" aria-hidden>→</span>
      </a>
      {destacado && url && m.accesos?.length ? (
        <nav className="accesos" aria-label={`Accesos directos de ${m.nombre}`}>
          {m.accesos.map(a => { const base = new URL(url); const d = new URL(a.ruta, base); d.search = base.search; return <a key={a.ruta} href={d.href} onClick={() => guardarUltimo(m.id)}>{a.label}</a>; })}
        </nav>
      ) : null}
    </article>
  );
}

// Inicio de sesión: usuario, contraseña y entidad (empresa). En el prototipo
// siempre es «seven» / «1». A la derecha, las mismas promociones del inicio.
const IDIOMAS = [{ id: 'es', nombre: 'Español', bandera: '🇪🇸' }, { id: 'en', nombre: 'English', bandera: '🇺🇸' }, { id: 'pt', nombre: 'Português', bandera: '🇧🇷' }];
function Login({ empresa, onEntrar }: { empresa: string; onEntrar: (empresa: string) => void }) {
  const [f, setF] = useState({ usuario: CREDENCIALES.usuario, clave: '', entidad: empresa });
  const [ver, setVer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idioma, setIdioma] = useState('es');
  const [abierto, setAbierto] = useState(false);
  function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (f.usuario.trim().toLowerCase() !== CREDENCIALES.usuario || f.clave !== CREDENCIALES.clave) { setError('El usuario o la contraseña no coinciden.'); return; }
    onEntrar(f.entidad);
  }
  const id = IDIOMAS.find(i => i.id === idioma)!;
  return (
    <div className="login">
      <div className="login-izq">
        <form className="login-form" onSubmit={entrar} noValidate>
          <div className="login-cabeza">
            <Logo alto={38} />
            <div className="menu-sup">
              <button type="button" className="idioma" onClick={() => setAbierto(v => !v)} aria-label={`Idioma: ${id.nombre}`} aria-haspopup="menu" aria-expanded={abierto}>
                <span aria-hidden>{id.bandera}</span><span aria-hidden className="chev">▾</span>
              </button>
              {abierto && (
                <div className="desplegable derecha" role="menu">
                  {IDIOMAS.map(i => <button type="button" key={i.id} role="menuitemradio" aria-checked={i.id === idioma} className={i.id === idioma ? 'activo' : ''} onClick={() => { setIdioma(i.id); setAbierto(false); }}><span>{i.bandera} {i.nombre}</span>{i.id === idioma && <span aria-hidden>✓</span>}</button>)}
                </div>
              )}
            </div>
          </div>
          <h1 className="login-titulo">Iniciar sesión</h1>
          <p className="sub">Ingresa los datos para abrir tu cuenta</p>
          <label className="campo">Usuario
            <input autoComplete="username" value={f.usuario} onChange={e => { setF(x => ({ ...x, usuario: e.target.value })); setError(null); }} />
          </label>
          <label className="campo">Contraseña
            <span className="clave">
              <input type={ver ? 'text' : 'password'} autoComplete="current-password" autoFocus value={f.clave} onChange={e => { setF(x => ({ ...x, clave: e.target.value })); setError(null); }} />
              <button type="button" onClick={() => setVer(v => !v)}>{ver ? 'Ocultar' : 'Mostrar'}</button>
            </span>
          </label>
          <label className="campo">Entidad
            <select value={f.entidad} onChange={e => setF(x => ({ ...x, entidad: e.target.value }))}>{EMPRESAS.map(x => <option key={x}>{x}</option>)}</select>
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="ingresar" type="submit">Ingresar</button>
        </form>
        <Pie />
      </div>
      <Promociones clase="login-promo" />
    </div>
  );
}

// Estado del inicio guardado en este navegador: empresa elegida y sesión
let version = 0;
const oyentes = new Set<() => void>();
const suscribir = (f: () => void) => { oyentes.add(f); return () => { oyentes.delete(f); }; };
const guardar = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } version++; oyentes.forEach(f => f()); };

export default function Inicio() {
  useSyncExternalStore(suscribir, () => version, () => 0);
  const hora = useSyncExternalStore(nada, () => new Date().getHours(), () => 12);
  const empresa = useSyncExternalStore(suscribir, () => leer('empresa') ?? EMPRESAS[0], () => EMPRESAS[0]);
  // Sin sesión se muestra el inicio de sesión (también la primera vez)
  const fuera = useSyncExternalStore(suscribir, () => leer('sesion') !== '1', () => true);
  const [q, setQ] = useState('');
  const buscador = useRef<HTMLInputElement>(null);

  // «Cerrar sesión» desde un módulo llega con ?salir=1
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('salir') === '1') { guardar('sesion', null); window.history.replaceState(null, '', window.location.pathname); }
  }, []);

  // Ctrl/⌘ + K enfoca el buscador
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); buscador.current?.focus(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  if (fuera) return <Login empresa={empresa} onEntrar={e => { guardar('empresa', e); guardar('sesion', '1'); }} />;

  const coincide = (m: ModuloSuite) => !q || normal(`${m.nombre} ${m.sigla} ${m.descripcion}`).includes(normal(q));
  const mios = MODULOS_EMPRESA.map(id => MODULOS_SUITE.find(m => m.id === id)).filter((m): m is ModuloSuite => Boolean(m));
  const disponibles = MODULOS_SUITE.filter(m => !MODULOS_EMPRESA.includes(m.id));
  const miosVisibles = mios.filter(coincide);
  const dispVisibles = disponibles.filter(coincide);
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <>
      <header className="barra">
        <Logo />
        <label className="buscar">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><circle cx="7" cy="7" r="5" /><path d="M11 11l3.5 3.5" /></svg>
          <input ref={buscador} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar un módulo" aria-label="Buscar un módulo"
            onKeyDown={e => {
              if (e.key === 'Escape') setQ('');
              if (e.key === 'Enter') { const m = mios.find(x => coincide(x) && enlaceDe(x)); if (m) { guardarUltimo(m.id); window.location.href = enlaceDe(m, empresa)!; } }
            }} />
          <kbd>Ctrl K</kbd>
        </label>
        <div className="sesion">
          <SelectorEmpresa empresa={empresa} onCambio={e => guardar('empresa', e)} />
          <MenuUsuario onSalir={() => guardar('sesion', null)} />
        </div>
      </header>

      <div className="pagina">
        <main className="principal">
          <p className="saludo">{saludo}, {USUARIO.nombre}</p>
          <h1>¿En qué vas a trabajar hoy?</h1>


          {/* Cada bloque: panel blanco con su título adentro y separadores entre módulos */}
          <section className="seccion panel" aria-labelledby="t-mios">
            <h2 id="t-mios" className="panel-titulo">Mis módulos <span className="cuenta">{mios.length}</span></h2>
            {miosVisibles.length
              ? <div className="rejilla"><div className="mios">{miosVisibles.map(m => <TarjetaModulo key={m.id} m={m} empresa={empresa} />)}</div></div>
              : <p className="vacio">{q ? `Ninguno de tus módulos coincide con «${q}».` : 'Todavía no hay módulos activos para tu empresa.'}</p>}
          </section>

          {dispVisibles.length > 0 && (
            <section className="seccion panel" aria-labelledby="t-disp">
              <h2 id="t-disp" className="panel-titulo">Módulos disponibles <span className="cuenta">{disponibles.length}</span></h2>
              <div className="rejilla"><div className="disponibles">
                {dispVisibles.map(m => (
                  <div key={m.id} className="disponible" style={{ ['--acento' as string]: m.texto }}>
                    <Isotipos m={m} size={24} />
                    <span className="disp-texto">
                      <span className="disp-nombre">{m.nombre}</span>
                      <span className="disp-desc">{m.descripcion}</span>
                    </span>
                  </div>
                ))}
              </div></div>
            </section>
          )}
          <Pie />
        </main>

        <Promociones />
      </div>

    </>
  );
}
