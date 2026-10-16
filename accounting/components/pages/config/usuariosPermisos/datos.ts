import React from 'react';
import { C, FONT, radius } from '../../../ui/tokens';
import { Usuario, PlantillaPermiso, flatPermissionRows, permisosAgrupadosPorUsuario } from '../permissionsData';

export const F = FONT;
export const BRAND = C.brand;
// ── Exportar permisos por usuario (CSV: una fila por permiso concedido) ─────
export function csvEscapePermisos(v: string) { return `"${String(v).replace(/"/g,'""')}"`; }
export function exportarPermisosPorUsuario(usuarios: Usuario[], plantillas: PlantillaPermiso[]) {
  const filas = flatPermissionRows();
  const headers = ['Usuario','Descripción','Activo','Rol','Categoría','Módulo','Sección','Permiso','Tipo/Estado'];
  const lines = [headers.map(csvEscapePermisos).join(',')];
  usuarios.forEach(u => {
    const rol = u.admin ? 'Administrador' : (plantillas.find(p=>p.id===u.plantillaId)?.nombre ?? 'Sin rol');
    filas.forEach(f => {
      if (u.permisos.has(f.key)) {
        lines.push([u.usuario, u.descripcion, u.activo?'Sí':'No', rol, f.categoria, f.modulo, f.grupo ?? '', f.permiso, f.subopcion ?? '']
          .map(v=>csvEscapePermisos(String(v))).join(','));
      }
    });
  });
  const blob = new Blob(['\ufeff'+lines.join('\n')], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `permisos-por-usuario-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
// Estilo compartido para inputs/selects de filtro: SIEMPRE fondo blanco y
// aspecto "activo" (nunca gris como si estuviera deshabilitado), salvo que
// explícitamente esté disabled.
export function filterInputStyle(disabled?: boolean): React.CSSProperties {
  return {
    height: 36, padding: '0 10px', border: `1px solid ${C.n500}`, borderRadius: radius.md,
    fontSize: 12, fontFamily: F, outline: 'none',
    background: disabled ? C.n200 : '#FFFFFF', backgroundColor: disabled ? C.n200 : '#FFFFFF',
    WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none',
    color: C.n900, boxSizing: 'border-box', cursor: disabled ? 'default' : 'pointer',
  };
}
// ── Enviar por correo el detalle de permisos de un usuario ──────────────────
// Permite varios destinatarios (chips, uno por correo) y un mensaje opcional.
// Se abre encima del detalle de permisos (modal sobre modal) a propósito: el
// detalle sigue visible/disponible detrás mientras se completa el envío.
export const EMAIL_RE = /^\S+@\S+\.\S+$/;
// ── Detalle de permisos por usuario (al tocar la fila) ───────────────────────
// Reemplaza el popover anterior (que solo mostraba fechas y se abría desde un
// hipervínculo en el número). La acción principal de la tabla de usuarios es
// consultar los permisos que tiene cada uno; esta es una vista de SOLO
// LECTURA - para modificar permisos se usa "Gestionar permisos". Desde acá se
// puede imprimir (Guardar como PDF) o enviar por correo.
// ── Exportar detalle de permisos de un usuario a PDF real (jsPDF) ───────────
// Antes esto abría el diálogo de impresión del navegador ("Guardar como PDF"),
// que muestra exactamente lo mismo que ya se ve en pantalla. Generar el PDF
// directamente es más amigable: un clic, sin diálogo del sistema operativo,
// y el archivo se descarga solo.
export async function exportarDetalleUsuarioPDF(u: Usuario, plantillas: PlantillaPermiso[]) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 16;
  let y = 18;

  function ensureSpace(need: number) {
    if (y + need > pageH - 14) { doc.addPage(); y = 18; }
  }

  const brandRGB: [number, number, number] = [167, 118, 0]; // C.brand
  const grayRGB: [number, number, number] = [117, 117, 117]; // C.n700
  const darkRGB: [number, number, number] = [15, 15, 15]; // C.n900

  // Encabezado
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...darkRGB);
  doc.text(u.descripcion, marginX, y); y += 6;
  const rol = u.admin ? 'Administrador' : (plantillas.find(p=>p.id===u.plantillaId)?.nombre ?? 'Sin rol');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...grayRGB);
  doc.text(`Usuario: ${u.usuario}   ·   Rol: ${rol}   ·   ${u.activo ? 'Activo' : 'Inactivo'}`, marginX, y);
  doc.setFontSize(8.5);
  doc.text(`Generado ${new Date().toLocaleString('es-CR')}`, pageW - marginX, 18, { align: 'right' });
  y += 6;
  doc.setDrawColor(200); doc.line(marginX, y, pageW - marginX, y); y += 8;

  // Ficha de fechas
  const datos: [string, string][] = [['Fecha Creación', u.fechaCreacion], ['Último Acceso', u.ultimoAcceso], ['Último Cambio de Clave', u.ultimoCambioClave]];
  const colW = (pageW - marginX * 2) / 3;
  datos.forEach(([l, v], i) => {
    const x = marginX + colW * i;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...grayRGB);
    doc.text(l, x, y);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...darkRGB);
    doc.text(v, x, y + 5);
  });
  y += 14;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...darkRGB);
  doc.text(`Permisos activos (${u.permisos.size})`, marginX, y); y += 8;

  const grupos = permisosAgrupadosPorUsuario(u.permisos);
  if (grupos.length === 0) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...grayRGB);
    doc.text('Este usuario no tiene permisos asignados.', marginX, y);
  }

  grupos.forEach(cat => {
    ensureSpace(10);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...brandRGB);
    doc.text(cat.categoria.toUpperCase(), marginX, y); y += 6;

    cat.grupos.forEach(g => {
      ensureSpace(7);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...darkRGB);
      doc.text(g.modulo + (g.grupo ? ` · ${g.grupo}` : ''), marginX + 3, y); y += 5.5;

      g.items.forEach(it => {
        const linea = it.permiso + (it.subopciones.length > 0 ? `: ${it.subopciones.join(', ')}` : '');
        const wrapped = doc.splitTextToSize(linea, pageW - marginX * 2 - 9);
        ensureSpace(wrapped.length * 4.6 + 1);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...grayRGB);
        doc.text(wrapped, marginX + 7, y);
        y += wrapped.length * 4.6;
      });
      y += 2;
    });
    y += 2;
  });

  doc.save(`permisos-${u.usuario}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
// ── Página principal ──────────────────────────────────────────────────────────
export type Modo =
  | { kind:'usuarios' }
  | { kind:'plantillas' }
  | { kind:'permisos-empty' }
  | { kind:'permisos-usuario'; userId:number }
  | { kind:'permisos-plantilla'; plantillaId:number };
