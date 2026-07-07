import { STATUS_ORDER, STATUS_LABEL, STATUS_TOKEN, type Status, type Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";

const LEGEND: Record<Status, string> = {
  aberto: "Tarefas prontas para começar",
  pendente: "Aguardando algo ou alguém",
  para_produzir: "Prontas para execução",
  em_andamento: "Sendo trabalhadas agora",
  concluido: "Finalizadas com sucesso",
};

const CARDS: Status[] = ["aberto", "pendente", "para_produzir", "concluido"];

export function StatusSummary({ tasks }: { tasks: Task[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {CARDS.map((s) => {
        const count = tasks.filter((t) => t.status === s).length;
        const token = STATUS_TOKEN[s];
        return (
          <div key={s} className={cn("rounded-2xl border border-border p-4 shadow-sm", token.bg)}>
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", token.dot)} />
              <span className={cn("text-xs font-semibold uppercase tracking-wide", token.fg)}>{STATUS_LABEL[s]}</span>
            </div>
            <div className={cn("mt-2 text-3xl font-semibold", token.fg)}>{count}</div>
            <div className={cn("text-[11px] opacity-70", token.fg)}>{LEGEND[s]}</div>
          </div>
        );
      })}
    </div>
  );
}