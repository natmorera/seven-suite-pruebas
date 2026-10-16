import { ConfiguracionShell } from '@/components/configuracion/ConfiguracionShell';

export default function ConfiguracionLayout({ children }: LayoutProps<'/configuracion'>) {
  return <ConfiguracionShell>{children}</ConfiguracionShell>;
}
