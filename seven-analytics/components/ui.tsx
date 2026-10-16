export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-section-title text-neutral-900">{children}</h2>;
}

// Envuelve los gráficos en un contenedor con scroll horizontal propio y un
// ancho mínimo, para que en mobile las barras/etiquetas nunca se aplasten ni
// se desordenen; en vez de eso, el usuario puede deslizar horizontalmente.
export function ChartScroll({
  children,
  minWidth = 480,
}: {
  children: React.ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}
