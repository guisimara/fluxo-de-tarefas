import type { MouseEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL, STATUS_TOKEN, PRIORITY_LABEL, PRIORITY_CLASS, sortTasksDefault, computeNextDueDate, type Task, type Project } from "@/lib/tasks";
import { Calendar as CalendarIcon, User, Inbox, Check, Archive, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TaskContextMenu } from "./task-context-menu";

export function useToggleTaskDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: Task) => {
      const status = task.status === "concluido" ? "aberto" : "concluido";
      const { error } = await supabase.from("tasks").update({ status }).eq("id", task.id);
      if (error) throw error;

      if (status === "concluido" && task.recurrence && task.due_date) {
        const nextDue = computeNextDueDate(task.due_date, task.recurrence);
        if (nextDue) {
          await supabase.from("tasks").insert({
            title: task.title,
            description: task.description,
            project_id: task.project_id,
            parent_id: task.parent_id,
            status: "aberto",
            priority: task.priority,
            due_date: nextDue,
            assignee_id: task.assignee_id,
            tags: task.tags,
            position: task.position,
            recurrence: task.recurrence as never,
            created_by: task.created_by,
          });
        }
      }
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

/** Remove a tarefa concluída das visões principais (Kanban/Lista/Timeline/Árvore), mantendo-a visível em Concluídos. */
export function useHideFromBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").update({ hidden_from_board: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarefa removida das tarefas ativas (continua em Concluídos)");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
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

function TaskRow({ task, project, projects, onClick }: { task: Task; project?: Project; projects: Project[]; onClick: () => void }) {
  const token = STATUS_TOKEN[task.status];
  const toggleDone = useToggleTaskDone();
  const hideFromBoard = useHideFromBoard();
  const done = task.status === "concluido";
  return (
    <TaskContextMenu task={task} projects={projects} onEdit={onClick}>
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
          {task.recurrence && <span title="Tarefa recorrente">↻</span>}
          {task.due_date && (
            <span className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              {new Date(task.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </span>
          )}
          {task.assignee_id && <User className="h-3 w-3" />}
        </div>
        {done && (
          <button
            onClick={(e) => { e.stopPropagation(); hideFromBoard.mutate(task.id); }}
            title="Arquivar tarefa (some das tarefas, mas continua em Concluídos)"
            className="flex shrink-0 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-100"
          >
            <Archive className="h-3.5 w-3.5" /> Arquivar
          </button>
        )}
      </div>
    </TaskContextMenu>
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
  const sorted = sortTasksDefault(tasks);
  const projectById = new Map(projects.map((p) => [p.id, p]));

  if (sorted.length === 0) return <EmptyState />;

  return (
    <div className="space-y-2">
      {sorted.map((t) => (
        <TaskRow key={t.id} task={t} project={projectById.get(t.project_id)} projects={projects} onClick={() => onOpen(t)} />
      ))}
    </div>
  );
}

function useArchiveTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase.from("tasks").update({ archived: true, archived_at: new Date().toISOString() }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarefa(s) arquivada(s)");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Aba de "Concluídos": lista as tarefas concluídas agrupadas por projeto, com arquivamento individual ou em lote. */
export function ConcluidosView({ tasks, projects, onOpen }: { tasks: Task[]; projects: Project[]; onOpen: (t: Task) => void }) {
  const archive = useArchiveTasks();
  const projectById = new Map(projects.map((p) => [p.id, p]));

  const groups = new Map<string, Task[]>();
  for (const t of tasks) {
    const list = groups.get(t.project_id) ?? [];
    list.push(t);
    groups.set(t.project_id, list);
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <Archive className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="text-lg font-medium">Nenhuma tarefa concluída</h3>
        <p className="mt-1 text-sm text-muted-foreground">Tarefas concluídas aparecem aqui, agrupadas por projeto.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([projectId, items]) => {
        const project = projectById.get(projectId);
        return (
          <div key={projectId} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                  style={{ background: `${project?.color ?? "#94a3b8"}1A`, color: project?.color ?? "#64748b" }}
                >
                  <FolderKanban className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold">{project?.name ?? "Sem projeto"}</span>
                <span className="text-xs text-muted-foreground">{items.length} concluída{items.length > 1 ? "s" : ""}</span>
              </div>
              <button
                onClick={() => { if (confirm(`Arquivar todas as ${items.length} tarefas concluídas de "${project?.name}"?`)) archive.mutate(items.map((t) => t.id)); }}
                className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <Archive className="h-3.5 w-3.5" /> Arquivar todas
              </button>
            </div>
            <div className="space-y-2">
              {items.map((t) => (
                <div
                  key={t.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background p-3 transition hover:shadow-sm"
                  onClick={() => onOpen(t)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{t.title}</div>
                    {t.due_date && (
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        Concluída · prazo {new Date(t.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm("Arquivar esta tarefa?")) archive.mutate([t.id]); }}
                    className="flex shrink-0 items-center gap-1.5 rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                    title="Arquivar tarefa"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
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
              <TaskRow key={t.id} task={t} project={projectById.get(t.project_id)} projects={projects} onClick={() => onOpen(t)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
