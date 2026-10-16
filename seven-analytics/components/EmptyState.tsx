import { Inbox } from "lucide-react";

export function EmptyState({ message = "Sin datos para este periodo" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <Inbox size={22} className="text-neutral-700" />
      <p className="text-muted text-neutral-700">{message}</p>
    </div>
  );
}
