
const VALOR_MANUAL_RESPALDO = 515; // ₡ por USD - ajustar a mano si el servicio no responde

export async function obtenerTipoCambioVenta(): Promise<{ valor: number; fuente: 'bccr' | 'manual'; fecha: string }> {
  const email = process.env.BCCR_EMAIL;
  const token = process.env.BCCR_TOKEN;
  if (!email || !token) {
    return { valor: VALOR_MANUAL_RESPALDO, fuente: 'manual', fecha: new Date().toISOString() };
  }

  const hoy = new Date();
  const fechaStr = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
  const url = 'https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/wsindicadoreseconomicos.asmx/ObtenerIndicadoresEconomicos' +
    `?Indicador=317&FechaInicio=${fechaStr}&FechaFinal=${fechaStr}&Nombre=${encodeURIComponent(email)}&SubNiveles=N&CorreoElectronico=${encodeURIComponent(email)}&Token=${token}`;

  try {
    const res = await fetch(url);
    const xml = await res.text();
    const match = xml.match(/<NUM_VALOR>([\d.]+)<\/NUM_VALOR>/);
    if (match) return { valor: Number(match[1]), fuente: 'bccr', fecha: hoy.toISOString() };
    return { valor: VALOR_MANUAL_RESPALDO, fuente: 'manual', fecha: hoy.toISOString() };
  } catch {
    return { valor: VALOR_MANUAL_RESPALDO, fuente: 'manual', fecha: hoy.toISOString() };
  }
}
