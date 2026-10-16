import DocumentoDetalle from '@/components/pages/facturacion/DocumentoDetalle';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DocumentoDetalle id={id} />;
}
