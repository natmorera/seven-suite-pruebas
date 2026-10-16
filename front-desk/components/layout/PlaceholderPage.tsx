import { Page, PageHeader, PageBody, EmptyState } from '@/components/suite/ui';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <Page>
      <PageHeader title={title} />
      <PageBody>
        <EmptyState message={`${title} todavía no está construida. Cuando se diseñe, usa los componentes de /design-system.`} />
      </PageBody>
    </Page>
  );
}
