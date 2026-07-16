import { useRef, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable, useDraggable, type DragEndEvent } from "@dnd-kit/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_ORDER, STATUS_LABEL, STATUS_TOKEN, PRIORITY_LABEL, PRIORITY_CLASS, type Status, type Task, type Project } from "@/lib/tasks";
import { Calendar as CalendarIcon, User, Plus, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskModal } from "./task-modal";
import { useSidebarAutoCollapse } from "./app-shell";
import { TaskContextMenu } from "./task-context-menu";
import { useHideFromBoard } from "./task-views";

function TaskCard({ task, projects, onClick }: { task: Task; projects: Project[]; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  const hideFromBoard = useHideFromBoard();
  const done = task.status === "concluido";
  return (
    <TaskContextMenu task={task} projects={projects} onEdit={onClick}>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        data-task-card
        onClick={onClick}
        className={cn(
          "cursor-pointer rounded-xl border border-border bg-card p-3 shadow-sm transition hover:shadow-md",
          isDragging && "opacity-40",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-medium">{task.title}</div>
          {task.recurrence && <span className="shrink-0 text-xs text-muted-foreground" title="Tarefa recorrente">↻</span>}
        </div>
        {task.description && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</div>}
        {task.tags && task.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {task.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">{t}</span>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className={cn("rounded-full border px-2 py-0.5", PRIORITY_CLASS[task.priority])}>{PRIORITY_LABEL[task.priority]}</span>
          <div className="flex items-center gap-2">
            {task.due_date && (
              <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{new Date(task.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
            )}
            {task.assignee_id && <User className="h-3 w-3" />}
          </div>
        </div>
        {done && (
          <button
            onClick={(e) => { e.stopPropagation(); hideFromBoard.mutate(task.id); }}
            title="Arquivar tarefa (some do quadro, mas continua em Concluídos)"
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-100"
          >
            <Archive className="h-3.5 w-3.5" /> Arquivar
          </button>
        )}
      </div>
    </TaskContextMenu>
  );
}

function Column({ status, tasks, projects, onOpen, onCreate }: { status: Status; tasks: Task[]; projects: Project[]; onOpen: (t: Task) => void; onCreate: (s: Status) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const token = STATUS_TOKEN[status];
  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-2xl bg-white/60 md:w-80">
      <div className={cn("flex shrink-0 items-center justify-between rounded-t-2xl px-4 py-3", token.bg)}>
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", token.dot)} />
          <span className={cn("text-sm font-semibold", token.fg)}>{STATUS_LABEL[status]}</span>
          <span className={cn("rounded-full bg-white/60 px-2 text-[11px]", token.fg)}>{tasks.length}</span>
        </div>
        <button onClick={() => onCreate(status)} className={cn("rounded-md p-1 hover:bg-white/60", token.fg)}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={cn("flex min-h-[200px] flex-1 flex-col gap-2 overflow-y-auto rounded-b-2xl bg-white/70 p-3 transition", isOver && "bg-primary/5")}
      >
        {tasks.length === 0 && <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Solte tarefas aqui</div>}
        {tasks.map((t) => <TaskCard key={t.id} task={t} projects={projects} onClick={() => onOpen(t)} />)}
      </div>
    </div>
  );
}

export function KanbanBoard({ tasks, projects, defaultProjectId }: { tasks: Task[]; projects: Project[]; defaultProjectId?: string }) {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState<Status | null>(null);
  const [open, setOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const previous = qc.getQueriesData<Task[]>({ queryKey: ["tasks"] });
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old ? old.map((t) => (t.id === id ? { ...t, status } : t)) : old
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      ctx?.previous.forEach(([k, v]) => qc.setQueryData(k, v));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const overId = e.over?.id;
    const taskId = e.active.id as string;
    if (!overId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === overId) return;
    move.mutate({ id: taskId, status: overId as Status });
  };

  const active = tasks.find((t) => t.id === activeId);
  const triggerSidebarCollapse = useSidebarAutoCollapse();

  const scrollRef = useRef<HTMLDivElement>(null);
  const panState = useRef<{ startX: number; scrollLeft: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-task-card], button")) return;
    const el = scrollRef.current;
    if (!el) return;
    panState.current = { startX: e.clientX, scrollLeft: el.scrollLeft };
    setIsPanning(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panState.current) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = panState.current.scrollLeft - (e.clientX - panState.current.startX);
  };
  const endPan = () => {
    panState.current = null;
    setIsPanning(false);
  };

  return (
    <>
      <DndContext sensors={sensors} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div
          ref={scrollRef}
          className={cn(
            "flex h-[calc(100vh-19rem)] min-h-[420px] select-none gap-4 overflow-x-auto pb-4",
            isPanning ? "cursor-grabbing" : "cursor-grab",
          )}
          onScroll={(e) => triggerSidebarCollapse(e.currentTarget.scrollLeft)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPan}
          onPointerLeave={endPan}
        >
          {STATUS_ORDER.map((s) => (
            <Column
              key={s}
              status={s}
              tasks={tasks.filter((t) => t.status === s)}
              projects={projects}
              onOpen={(t) => { setEditing(t); setCreating(null); setOpen(true); }}
              onCreate={(st) => { setEditing(null); setCreating(st); setOpen(true); }}
            />
          ))}
        </div>
        <DragOverlay>
          {active && (
            <div className="rounded-xl border border-border bg-card p-3 shadow-lg w-72">
              <div className="text-sm font-medium">{active.title}</div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <TaskModal
        open={open}
        onOpenChange={setOpen}
        task={editing}
        defaultStatus={creating ?? undefined}
        defaultProjectId={defaultProjectId}
        projects={projects}
      />
    </>
  );
}