import type { Metadata } from 'next';
import Shell from '@/components/layout/Shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Management · Seven Suite',
  description: 'Management: empresa, módulos, seguridad, infraestructura e integraciones compartidas por toda la suite',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="h-full">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
