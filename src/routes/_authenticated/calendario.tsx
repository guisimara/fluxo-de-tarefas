import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays } from "lucide-react";
import { STATUS_LABEL, STATUS_TOKEN, PRIORITY_LABEL, PRIORITY_CLASS, type Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendario")({
  component: CalendarPage,
});

function CalendarPage() {
  const tasks = useQuery({
    queryKey: ["tasks-due"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").not("due_date", "is", null).order("due_date", { ascending: true });
      return (data ?? []) as Task[];
    },
  });

  const byDate = new Map<string, Task[]>();
  (tasks.data ?? []).forEach((t) => {
    const k = t.due_date!;
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k)!.push(t);
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Calendário</h1>
        <p className="text-sm text-muted-foreground">Tarefas com prazo, agrupadas por data.</p>
      </div>
      {byDate.size === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhuma tarefa com prazo definido.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(byDate.entries()).map(([date, list]) => {
            const overdue = date < today;
            return (
              <div key={date}>
                <div className={cn("mb-2 text-sm font-medium", overdue ? "text-destructive" : "text-foreground")}>
                  {new Date(date + "T12:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                  {overdue && <span className="ml-2 text-xs">(atrasado)</span>}
                </div>
                <div className="space-y-2">
                  {list.map((t) => {
                    const token = STATUS_TOKEN[t.status];
                    return (
                      <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm">
                        <div>
                          <div className="font-medium">{t.title}</div>
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            <span className={cn("rounded-full px-2 py-0.5", token.bg, token.fg)}>{STATUS_LABEL[t.status]}</span>
                            <span className={cn("rounded-full border px-2 py-0.5", PRIORITY_CLASS[t.priority])}>{PRIORITY_LABEL[t.priority]}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}