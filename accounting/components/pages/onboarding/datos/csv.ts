// Plantilla del plan de cuentas en CSV (se abre en Excel) y lectura del
// archivo que sube el usuario.
const SEP = ';';

const celdaCsv = (v: string) => /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

export function descargarCsv(archivo: string, filas: string[][]) {
  // El BOM hace que Excel lea bien las tildes
  const texto = '\uFEFF' + filas.map(f => f.map(celdaCsv).join(SEP)).join('\r\n');
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = archivo; a.click();
  URL.revokeObjectURL(url);
}

// Parte una línea respetando comillas; acepta «;» o «,» como separador
function partirLinea(linea: string, sep: string): string[] {
  const r: string[] = []; let actual = ''; let comillas = false;
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i];
    if (comillas) {
      if (ch === '"' && linea[i + 1] === '"') { actual += '"'; i++; }
      else if (ch === '"') comillas = false;
      else actual += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) { r.push(actual); actual = ''; }
    else actual += ch;
  }
  r.push(actual);
  return r.map(x => x.trim());
}

// Filas del archivo como objetos con las claves = títulos de columna
export async function leerCsv(file: File): Promise<Record<string, string>[]> {
  const texto = (await file.text()).replace(/^\uFEFF/, '');
  const lineas = texto.split(/\r?\n/).filter(l => l.trim());
  if (!lineas.length) return [];
  const sep = lineas[0].includes(';') ? ';' : ',';
  const titulos = partirLinea(lineas[0], sep);
  return lineas.slice(1).map(l => {
    const v = partirLinea(l, sep);
    return Object.fromEntries(titulos.map((t, i) => [t, v[i] ?? '']));
  });
}

// Valor de una columna tolerando mayúsculas, tildes y el «*» de obligatorio
export function celda(fila: Record<string, string>, ...nombres: string[]): string {
  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\*/g, '').trim().toLowerCase();
  const claves = Object.keys(fila);
  for (const n of nombres) {
    const k = claves.find(c => norm(c) === norm(n));
    if (k && fila[k].trim()) return fila[k].trim();
  }
  return '';
}
