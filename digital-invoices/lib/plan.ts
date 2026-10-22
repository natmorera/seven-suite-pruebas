export interface ConfigPlan { limiteSucursales: number; implementacion: boolean; permitirPruebas: boolean }

export function configPlan(): ConfigPlan {
  const limite = Number.parseInt(process.env.LIMITE_SUCURSALES ?? '3', 10);
  const pruebas = process.env.HABILITAR_PRUEBAS;
  return {
    limiteSucursales: Number.isFinite(limite) && limite > 0 ? limite : 1,
    implementacion: (process.env.MODO_IMPLEMENTACION ?? '1') === '1',
    permitirPruebas: pruebas === '1',
  };
}
