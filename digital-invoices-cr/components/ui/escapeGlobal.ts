// Cierra con la tecla Escape la ventana (modal, panel lateral) que está
// encima. Sirve para todos los modales de la aplicación sin que cada uno
// tenga que escuchar la tecla:
//   1. Busca la capa fija que cubre toda la pantalla y está más arriba.
//   2. Pulsa su botón de cerrar (aria-label o título «Cerrar», o «×»).
//   3. Si no tiene, hace clic en el fondo oscuro, como si se tocara afuera.
//   4. Si sigue abierta, pulsa «Cancelar».
// Un menú desplegable abierto se cierra primero: sus componentes marcan la
// tecla como atendida (preventDefault) y aquí no se hace nada. Las listas
// flotantes (data-flotante) se cierran quitando el foco.

function capaSuperior(): HTMLElement | null {
  const ancho = window.innerWidth, alto = window.innerHeight;
  let mejor: HTMLElement | null = null, zMejor = -Infinity;
  document.querySelectorAll<HTMLElement>('[style*="position: fixed"], .fixed').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.left > 1 || r.top > 1 || r.width < ancho - 2 || r.height < alto - 2) return;
    const estilo = getComputedStyle(el);
    if (estilo.position !== 'fixed' || estilo.display === 'none' || estilo.visibility === 'hidden' || estilo.pointerEvents === 'none') return;
    const z = Number.parseInt(estilo.zIndex, 10) || 0;
    if (z >= zMejor) { zMejor = z; mejor = el; }
  });
  return mejor;
}

function botonDe(capa: HTMLElement, cumple: (b: HTMLButtonElement) => boolean): HTMLButtonElement | null {
  return Array.from(capa.querySelectorAll<HTMLButtonElement>('button')).find(b => !b.disabled && cumple(b)) ?? null;
}
const texto = (b: HTMLElement) => (b.textContent ?? '').trim();

function cerrarCapa(capa: HTMLElement) {
  const cerrar = botonDe(capa, b => /cerrar/i.test(b.getAttribute('aria-label') ?? '') || /^cerrar$/i.test(b.title) || ['×', '✕', '✖'].includes(texto(b)));
  if (cerrar) { cerrar.click(); return; }
  capa.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  requestAnimationFrame(() => {
    if (!capa.isConnected) return;
    botonDe(capa, b => /^cancelar$/i.test(texto(b)))?.click();
  });
}

export function instalarEscapeGlobal(): () => void {
  const alTeclear = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) return;
    // Una lista flotante abierta (buscador, menú ⋯) se cierra al perder el foco
    const activo = document.activeElement as HTMLElement | null;
    if (document.querySelector('[data-flotante]') && activo && activo !== document.body) {
      e.preventDefault();
      activo.blur();
      return;
    }
    const capa = capaSuperior();
    if (!capa) return;
    e.preventDefault();
    cerrarCapa(capa);
  };
  window.addEventListener('keydown', alTeclear);
  return () => window.removeEventListener('keydown', alTeclear);
}
