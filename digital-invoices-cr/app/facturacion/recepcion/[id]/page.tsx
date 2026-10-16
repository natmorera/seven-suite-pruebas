import DetalleCompra from '@/components/pages/facturacion/DetalleCompra';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DetalleCompra id={decodeURIComponent(id)} />;
}
