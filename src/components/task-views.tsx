import type { MouseEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL, STATUS_TOKEN, PRIORITY_LABEL, PRIORITY_CLASS, sortTasksPriorityThenDate, type Task, type Project } from "@/lib/tasks";
import { Calendar as CalendarIcon, User, Inbox, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function useToggleTaskDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: Task) => {
      const status = task.status === "concluido" ? "aberto" : "concluido";
      const { error } = await supabase.from("tasks").update({ status }).eq("id", task.id);
      if (error) throw error;
    },
    onMutate: async (task) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const previous = qc.getQueriesData<Task[]>({ queryKey: ["tasks"] });
      const status = task.status === "concluido" ? "aberto" : "concluido";
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old ? old.map((t) => (t.id === task.id ? { ...t, status } : t)) : old
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      ctx?.previous.forEach(([k, v]) => qc.setQueryData(k, v));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function StatusDot({ task, onToggle }: { task: Task; onToggle: (e: MouseEvent<HTMLButtonElement>) => void }) {
  const token = STATUS_TOKEN[task.status];
  const done = task.status === "concluido";
  return (
    <button
      onClick={onToggle}
      title={done ? "Reabrir tarefa" : "Concluir tarefa"}
      className={cn(
        "grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 bg-transparent transition hover:scale-110",
        done ? "border-status-done-fg bg-status-done-fg" : token.dotBorder,
      )}
    >
      {done && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
    </button>
  );
}

function ProjectDot({ project }: { project?: Project }) {
  if (!project) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="h-2 w-2 rounded-full" style={{ background: project.color }} />
      {project.name}
    </span>
  );
}

function TaskRow({ task, project, onClick }: { task: Task; project?: Project; onClick: () => void }) {
  const token = STATUS_TOKEN[task.status];
  const toggleDone = useToggleTaskDone();
  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition hover:shadow-md sm:flex-nowrap"
    >
      <StatusDot task={task} onToggle={(e) => { e.stopPropagation(); toggleDone.mutate(task); }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{task.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <ProjectDot project={project} />
          <span className={cn("rounded-full px-2 py-0.5 text-[11px]", token.bg, token.fg)}>{STATUS_LABEL[task.status]}</span>
        </div>
      </div>
      <span className={cn("rounded-full border px-2 py-0.5 text-[11px] shrink-0", PRIORITY_CLASS[task.priority])}>
        {PRIORITY_LABEL[task.priority]}
      </span>
      <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
        {task.due_date && (
          <span className="flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            {new Date(task.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </span>
        )}
        {task.assignee_id && <User className="h-3 w-3" />}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
      <h3 className="text-lg font-medium">Nenhuma tarefa</h3>
      <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou crie uma nova tarefa.</p>
    </div>
  );
}

export function TaskListView({ tasks, projects, onOpen }: { tasks: Task[]; projects: Project[]; onOpen: (t: Task) => void }) {
  const sorted = sortTasksPriorityThenDate(tasks);
  const projectById = new Map(projects.map((p) => [p.id, p]));

  if (sorted.length === 0) return <EmptyState />;

  return (
    <div className="space-y-2">
      {sorted.map((t) => (
        <TaskRow key={t.id} task={t} project={projectById.get(t.project_id)} onClick={() => onOpen(t)} />
      ))}
    </div>
  );
}

export function TaskTimelineView({ tasks, projects, onOpen }: { tasks: Task[]; projects: Project[]; onOpen: (t: Task) => void }) {
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const withDate = tasks.filter((t) => t.due_date).sort((a, b) => a.due_date!.localeCompare(b.due_date!));
  const noDate = tasks.filter((t) => !t.due_date);

  const groups: { label: string; items: Task[] }[] = [];
  for (const t of withDate) {
    const label = new Date(t.due_date!).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
    const group = groups.find((g) => g.label === label);
    if (group) group.items.push(t);
    else groups.push({ label, items: [t] });
  }
  if (noDate.length > 0) groups.push({ label: "Sem prazo", items: noDate });

  if (tasks.length === 0) return <EmptyState />;

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.label} className="relative pl-6">
          <div className="absolute left-1.5 top-1 h-full w-px bg-border" />
          <div className="absolute left-0 top-1 h-3 w-3 rounded-full bg-primary" />
          <div className="mb-2 text-sm font-semibold capitalize">{g.label}</div>
          <div className="space-y-2">
            {g.items.map((t) => (
              <TaskRow key={t.id} task={t} project={projectById.get(t.project_id)} onClick={() => onOpen(t)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
