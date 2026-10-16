import type { Metadata } from 'next';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Seven Suite',
  description: 'Elige el módulo de la suite con el que vas a trabajar.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>;
}
