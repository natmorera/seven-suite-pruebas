// Plantillas de Excel para carga masiva (compras, inventario) y lectura del
// archivo que el usuario sube. SheetJS se carga solo cuando hace falta.

export interface HojaPlantilla {
  nombre: string;
  columnas: { titulo: string; ancho?: number; nota?: string }[];
  ejemplos?: (string | number)[][];
}

export async function descargarPlantilla(archivo: string, hojas: HojaPlantilla[], instrucciones: string[]) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  for (const h of hojas) {
    const ws = XLSX.utils.aoa_to_sheet([h.columnas.map(c => c.titulo), ...(h.ejemplos ?? [])]);
    ws['!cols'] = h.columnas.map(c => ({ wch: c.ancho ?? Math.max(12, c.titulo.length + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, h.nombre);
  }
  const filasAyuda: string[][] = [['Instrucciones'], [], ...instrucciones.map(i => [i]), [], ['Columnas']];
  for (const h of hojas) for (const c of h.columnas) filasAyuda.push([`${h.nombre} › ${c.titulo}`, c.nota ?? '']);
  const ayuda = XLSX.utils.aoa_to_sheet(filasAyuda);
  ayuda['!cols'] = [{ wch: 48 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, ayuda, 'Instrucciones');
  XLSX.writeFile(wb, archivo);
}

// Descarga un listado (datos reales, no plantilla) en una hoja de Excel.
export async function descargarListado(archivo: string, hoja: string, columnas: { titulo: string; ancho?: number }[], filas: (string | number | null | undefined)[][]) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([columnas.map(c => c.titulo), ...filas.map(f => f.map(v => v ?? ''))]);
  ws['!cols'] = columnas.map(c => ({ wch: c.ancho ?? Math.max(12, c.titulo.length + 2) }));
  XLSX.utils.book_append_sheet(wb, ws, hoja);
  XLSX.writeFile(wb, archivo);
}

// Devuelve las filas de la primera hoja (o de la hoja indicada) como objetos
// con las claves = títulos de columna. Ignora filas vacías.
export async function leerExcel(file: File, hoja?: string): Promise<Record<string, unknown>[]> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const nombre = hoja && wb.SheetNames.includes(hoja) ? hoja : wb.SheetNames[0];
  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[nombre], { defval: '', raw: true });
  return filas.filter(f => Object.values(f).some(v => String(v ?? '').trim() !== ''));
}

// Busca el valor de una columna tolerando mayúsculas, tildes y el "*" de obligatorio.
export function celda(fila: Record<string, unknown>, ...nombres: string[]): string {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\*/g, '').trim().toLowerCase();
  const claves = Object.keys(fila);
  for (const n of nombres) {
    const k = claves.find(c => norm(c) === norm(n));
    if (k !== undefined) {
      const v = fila[k];
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      return String(v ?? '').trim();
    }
  }
  return '';
}
export function numero(s: string): number {
  if (!s) return 0;
  // Acepta 1,234.50 y 1.234,50
  const t = s.replace(/[^\d.,-]/g, '');
  const normal = /,\d{1,2}$/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  return Number(normal) || 0;
}
