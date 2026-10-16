import { redirect } from 'next/navigation';

// Reportes de Hospedaje en una sola pantalla con selector (?r=); la ruta anterior redirige.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const r = (await searchParams).r;
  redirect(`/hospedaje/reportes?r=${r === 'etiquetas' ? 'etiquetas' : 'saldos'}`);
}
