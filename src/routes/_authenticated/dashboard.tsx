import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TaskModal } from "@/components/task-modal";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, Wrench, AlertTriangle, Flame, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { sortTasksPriorityThenDate, PRIORITY_CLASS, PRIORITY_LABEL, type Task, type Project } from "@/lib/tasks";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardHomePage,
});

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const SUMMARY_CARDS = [
  {
    id: "concluidas" as const,
    label: "Concluídas",
    legend: "Entregas finalizadas",
    icon: CheckCircle2,
    classes: "bg-emerald-50/60 border-emerald-100 text-emerald-700/80",
    iconClasses: "text-emerald-500/70",
  },
  {
    id: "pendentes" as const,
    label: "Pendentes",
    legend: "Aguardando algo ou alguém",
    icon: Clock,
    classes: "bg-amber-50/60 border-amber-100 text-amber-700/80",
    iconClasses: "text-amber-500/70",
  },
  {
    id: "para_produzir" as const,
    label: "Para Produzir",
    legend: "Prontas para execução",
    icon: Wrench,
    classes: "bg-violet-50/60 border-violet-100 text-violet-700/80",
    iconClasses: "text-violet-500/70",
  },
  {
    id: "atrasadas" as const,
    label: "Atrasadas",
    legend: "Precisam de atenção agora",
    icon: AlertTriangle,
    classes: "bg-rose-50/70 border-rose-200 text-rose-700/90",
    iconClasses: "text-rose-500/80",
  },
];

function DashboardHomePage() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);

  const tasks = useQuery({
    queryKey: ["tasks-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
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

  const all = tasks.data ?? [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayKey = toKey(today);
  const isOverdue = (t: Task) => t.status !== "concluido" && !!t.due_date && new Date(t.due_date + "T00:00:00") < today;

  const counts = {
    concluidas: all.filter((t) => t.status === "concluido").length,
    pendentes: all.filter((t) => t.status === "pendente").length,
    para_produzir: all.filter((t) => t.status === "para_produzir").length,
    atrasadas: all.filter(isOverdue).length,
  };

  const priorityAndToday = sortTasksPriorityThenDate(
    all.filter((t) => t.status !== "concluido" && (t.priority === "alta" || t.due_date === todayKey)),
  ).slice(0, 8);

  const byDate = new Map<string, Task[]>();
  all.filter((t) => t.due_date).forEach((t) => {
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
  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const openTask = (t: Task) => { setSelectedTask(t); setTaskOpen(true); };

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 md:px-5">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Análise de performance das suas tarefas.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {SUMMARY_CARDS.map((c) => (
          <div key={c.id} className={cn("rounded-2xl border p-4 shadow-sm", c.classes)}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide opacity-80">{c.label}</span>
              <c.icon className={cn("h-4 w-4", c.iconClasses)} />
            </div>
            <div className="mt-2 text-3xl font-semibold">{counts[c.id]}</div>
            <div className="text-[11px] opacity-70">{c.legend}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Flame className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Prioritárias e do dia</h2>
          </div>
          {priorityAndToday.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma tarefa prioritária ou para hoje.</div>
          ) : (
            <div className="space-y-2">
              {priorityAndToday.map((t) => {
                const project = (projects.data ?? []).find((p) => p.id === t.project_id);
                const overdue = isOverdue(t);
                return (
                  <button
                    key={t.id}
                    onClick={() => openTask(t)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-border p-3 text-left text-sm transition hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {project && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: project.color }} />}
                        <span className="truncate font-medium">{t.title}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        {project?.name}
                        {t.due_date && (
                          <span className={cn(overdue && "font-medium text-rose-600")}>
                            · {new Date(t.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                            {t.due_date === todayKey && " (hoje)"}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium", PRIORITY_CLASS[t.priority])}>
                      {PRIORITY_LABEL[t.priority]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Calendário</h2>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCursor((c) => { const d = new Date(c); d.setMonth(d.getMonth() - 1); return d; })}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="w-28 text-center text-xs font-medium capitalize">{monthLabel}</span>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCursor((c) => { const d = new Date(c); d.setMonth(d.getMonth() + 1); return d; })}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-border">
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="border-b border-border bg-muted/40 py-1.5 text-center text-[10px] font-medium text-muted-foreground">
                {w}
              </div>
            ))}
            {days.map((d) => {
              const key = toKey(d);
              const inMonth = d.getMonth() === month;
              const isToday = key === todayKey;
              const dayTasks = byDate.get(key) ?? [];
              return (
                <button
                  key={key}
                  onClick={() => dayTasks[0] && openTask(dayTasks[0])}
                  className={cn(
                    "flex min-h-[42px] flex-col items-center gap-0.5 border-b border-r border-border p-1 last:border-r-0 [&:nth-child(7n)]:border-r-0",
                    !inMonth && "bg-muted/20",
                    dayTasks.length > 0 && "cursor-pointer hover:bg-muted/40",
                  )}
                >
                  <span className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                    isToday ? "bg-primary font-semibold text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground",
                  )}>
                    {d.getDate()}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
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
