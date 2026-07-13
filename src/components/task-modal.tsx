import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { STATUS_ORDER, STATUS_LABEL, STATUS_TOKEN, PRIORITY_LABEL, PRIORITY_DOT, TASK_TAGS, TAG_COLOR_CLASS, type Status, type Task, type Project, type Profile, type Recurrence } from "@/lib/tasks";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { MessageSquare } from "lucide-react";
import { RecurrencePicker } from "@/components/recurrence-picker";
import { TaskCommentsPanel } from "@/components/task-comments-panel";
import { cn } from "@/lib/utils";

export function TaskModal({
  open,
  onOpenChange,
  task,
  defaultProjectId,
  defaultStatus,
  parentTask,
  onAddSubtask,
  projects,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task?: Task | null;
  defaultProjectId?: string;
  defaultStatus?: Status;
  parentTask?: Task | null;
  onAddSubtask?: (task: Task) => void;
  projects: Project[];
}) {
  const { user } = useCurrentUser();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [status, setStatus] = useState<Status>("aberto");
  const [priority, setPriority] = useState<"baixa" | "media" | "alta">("media");
  const [dueDate, setDueDate] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setProjectId(task?.project_id ?? parentTask?.project_id ?? defaultProjectId ?? projects[0]?.id ?? "");
    setStatus(task?.status ?? defaultStatus ?? "aberto");
    setPriority(task?.priority ?? "media");
    setDueDate(task?.due_date ?? "");
    setRecurrence(task?.recurrence ?? null);
    setAssigneeId(task?.assignee_id ?? "");
    setMemberIds([]);
    setTags(task?.tags ?? []);
  }, [open, task, defaultProjectId, defaultStatus, parentTask, projects]);

  const members = useQuery({
    queryKey: ["project-members-profiles", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data: proj } = await supabase.from("projects").select("owner_id").eq("id", projectId).maybeSingle();
      const { data: ms } = await supabase.from("project_members").select("user_id").eq("project_id", projectId).eq("status", "accepted");
      const ids = Array.from(new Set([proj?.owner_id, ...(ms ?? []).map((m) => m.user_id)].filter(Boolean))) as string[];
      if (ids.length === 0) return [] as Profile[];
      const { data: profiles } = await supabase.from("profiles").select("id, name, email, avatar_url").in("id", ids);
      return (profiles ?? []) as Profile[];
    },
  });

  const taskMembers = useQuery({
    queryKey: ["task-members", task?.id],
    enabled: !!task?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase.from("task_members").select("user_id").eq("task_id", task!.id);
      if (error) throw error;
      return (data ?? []).map((m) => m.user_id);
    },
  });

  useEffect(() => {
    if (!open || !taskMembers.data) return;
    setMemberIds(Array.from(new Set([...taskMembers.data, ...(task?.assignee_id ? [task.assignee_id] : [])])));
  }, [open, taskMembers.data, task?.assignee_id]);

  useEffect(() => {
    if (assigneeId && !memberIds.includes(assigneeId)) setAssigneeId("");
  }, [memberIds, assigneeId]);

  const parentId = task?.parent_id ?? parentTask?.id ?? null;

  const parent = useQuery({
    queryKey: ["task-parent", parentId],
    enabled: !!parentId,
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("id, title").eq("id", parentId!).maybeSingle();
      return data as { id: string; title: string } | null;
    },
  });

  const lockProject = !!parentTask || !!task?.parent_id;

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("no user");
      const payload = {
        title,
        description: description || null,
        project_id: projectId,
        status,
        priority,
        due_date: dueDate || null,
        recurrence: recurrence as never,
        assignee_id: assigneeId || null,
        tags,
      };
      let taskId = task?.id;
      if (task) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", task.id);
        if (error) throw error;
      } else {
        const parentId = parentTask?.id ?? null;
        let q = supabase.from("tasks").select("position").eq("project_id", projectId).order("position", { ascending: false }).limit(1);
        q = parentId ? q.eq("parent_id", parentId) : q.is("parent_id", null);
        const { data: last } = await q;
        const position = (last?.[0]?.position ?? -1) + 1;

        const { data: created, error } = await supabase
          .from("tasks")
          .insert({ ...payload, created_by: user.id, parent_id: parentId, position })
          .select()
          .single();
        if (error) throw error;
        taskId = created.id;
      }

      const { error: deleteError } = await supabase.from("task_members").delete().eq("task_id", taskId!);
      if (deleteError) throw deleteError;
      if (memberIds.length > 0) {
        const { error: insertError } = await supabase.from("task_members").insert(
          memberIds.map((user_id) => ({ task_id: taskId!, user_id })),
        );
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      toast.success(task ? "Tarefa atualizada" : "Tarefa criada");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task-members"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!task) return;
      const { error } = await supabase.from("tasks").delete().eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarefa excluída");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      onOpenChange(false);
    },
  });

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSave = () => {
    if (save.isPending || !title.trim() || !projectId) return;
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[58.8rem] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : parentTask ? "Nova subtarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {(parentTask || parent.data) && (
            <div className="rounded-lg border border-border bg-accent/40 px-3 py-2 text-xs text-muted-foreground">
              Subtarefa de <span className="font-medium text-foreground">{parentTask?.title ?? parent.data?.title}</span>
            </div>
          )}
          <div>
            <Label>Nome da tarefa</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que precisa ser feito?" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label>Projeto</Label>
                <Select value={projectId} onValueChange={setProjectId} disabled={lockProject}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
                          {p.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Repetição</Label>
                <RecurrencePicker value={recurrence} onChange={setRecurrence} dueDate={dueDate || undefined} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        <span className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_TOKEN[s].dot)} />
                          {STATUS_LABEL[s]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as "baixa" | "media" | "alta")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["baixa", "media", "alta"] as const).map((p) => (
                      <SelectItem key={p} value={p}>
                        <span className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT[p])} />
                          {PRIORITY_LABEL[p]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prazo</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label className="mb-2 block">Adicionar membro</Label>
                <MultiSelect
                  options={(members.data ?? []).map((m) => ({ value: m.id, label: m.name || m.email || m.id }))}
                  selected={memberIds}
                  onChange={setMemberIds}
                  placeholder="Nenhum membro adicionado"
                  emptyText="Convide membros nesse projeto primeiro."
                />
              </div>
              <div>
                <Label>Delegar (responsável principal)</Label>
                <Select value={assigneeId || "none"} onValueChange={(v) => setAssigneeId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável</SelectItem>
                    {(members.data ?? [])
                      .filter((m) => memberIds.includes(m.id))
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name || m.email}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {memberIds.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">Adicione membros acima para poder delegar a tarefa.</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Tags</Label>
            <div className="flex flex-wrap items-center gap-2">
              {TASK_TAGS.map((t) => {
                const active = tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition",
                      active
                        ? TAG_COLOR_CLASS[t]
                        : "border-border bg-transparent text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {task && (
            <div>
              <Button type="button" variant="outline" className="w-full gap-2" onClick={() => setCommentsOpen(true)}>
                <MessageSquare className="h-4 w-4" /> Ver comentários e links
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 flex-row justify-between sm:justify-between">
          <div className="flex gap-2">
            {task && (
              <Button variant="destructive" onClick={() => remove.mutate()}>Excluir</Button>
            )}
            {task && onAddSubtask && (
              <Button variant="outline" onClick={() => onAddSubtask(task)}>Adicionar subtarefa</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!title.trim() || !projectId || save.isPending}>
              {task ? "Salvar" : "Criar tarefa"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
      <TaskCommentsPanel
        task={task ?? null}
        members={members.data ?? []}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
      />
    </Dialog>
  );
}