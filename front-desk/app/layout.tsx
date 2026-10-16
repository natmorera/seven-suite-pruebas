import type { Metadata } from 'next';
import Shell from '@/components/layout/Shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Front Desk · Seven Suite',
  description: 'Front Desk: reservas, check-in, check-out y folios de huéspedes',
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
