

// ── Main ───────────────────────────────────────────────────────────────────────

// ── Modal: Exportar listado de la bandeja (preview + PDF/CSV) ──────────────────
export function csvEscape(v: string) { return `"${String(v).replace(/"/g,'""')}"`; }
