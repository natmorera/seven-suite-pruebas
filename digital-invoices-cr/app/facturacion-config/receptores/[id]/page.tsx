import ReceptorDetalle from '@/components/pages/facturacion/ReceptorDetalle';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReceptorDetalle id={decodeURIComponent(id)} />;
}
