import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { STATUS_TOKEN, type Task, type Project } from "@/lib/tasks";
import { TaskModal } from "@/components/task-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendario")({
  component: CalendarPage,
});

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function CalendarPage() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);

  const tasks = useQuery({
    queryKey: ["tasks-due"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").not("due_date", "is", null).order("due_date", { ascending: true });
      return (data ?? []) as Task[];
    },
  });

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Project[];
    },
  });

  const byDate = new Map<string, Task[]>();
  (tasks.data ?? []).forEach((t) => {
    const k = t.due_date!;
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k)!.push(t);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }

  const todayKey = toKey(new Date());
  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendário</h1>
          <p className="text-sm text-muted-foreground">Tarefas com prazo, em visão mensal.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor((c) => { const d = new Date(c); d.setMonth(d.getMonth() - 1); return d; })}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="w-40 text-center text-sm font-medium capitalize">{monthLabel}</span>
          <Button variant="outline" size="icon" onClick={() => setCursor((c) => { const d = new Date(c); d.setMonth(d.getMonth() + 1); return d; })}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); }}>Hoje</Button>
        </div>
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-2xl border border-border bg-card">
        {WEEKDAYS.map((w) => (
          <div key={w} className="border-b border-border bg-muted/40 px-2 py-2 text-center text-xs font-medium text-muted-foreground">
            {w}
          </div>
        ))}
        {days.map((d) => {
          const key = toKey(d);
          const inMonth = d.getMonth() === month;
          const isToday = key === todayKey;
          const dayTasks = byDate.get(key) ?? [];
          return (
            <div
              key={key}
              className={cn(
                "min-h-[110px] border-b border-r border-border p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0",
                !inMonth && "bg-muted/20",
              )}
            >
              <div className={cn(
                "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs",
                isToday ? "bg-primary text-primary-foreground font-semibold" : inMonth ? "text-foreground" : "text-muted-foreground",
              )}>
                {d.getDate()}
              </div>
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map((t) => {
                  const token = STATUS_TOKEN[t.status];
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedTask(t); setTaskOpen(true); }}
                      className={cn("flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px]", token.bg, token.fg)}
                      title={t.title}
                    >
                      <span className="truncate">{t.title}</span>
                    </button>
                  );
                })}
                {dayTasks.length > 3 && (
                  <div className="px-1.5 text-[10px] text-muted-foreground">+{dayTasks.length - 3} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <TaskModal
        open={taskOpen}
        onOpenChange={(v) => { setTaskOpen(v); if (!v) setSelectedTask(null); }}
        task={selectedTask}
        projects={projects.data ?? []}
      />
    </div>
  );
}
