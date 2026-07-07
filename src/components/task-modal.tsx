import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { STATUS_ORDER, STATUS_LABEL, type Status, type Task, type Project, type Profile } from "@/lib/tasks";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { X } from "lucide-react";

export function TaskModal({
  open,
  onOpenChange,
  task,
  defaultProjectId,
  defaultStatus,
  projects,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task?: Task | null;
  defaultProjectId?: string;
  defaultStatus?: Status;
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
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setProjectId(task?.project_id ?? defaultProjectId ?? projects[0]?.id ?? "");
    setStatus(task?.status ?? defaultStatus ?? "aberto");
    setPriority(task?.priority ?? "media");
    setDueDate(task?.due_date ?? "");
    setAssigneeId(task?.assignee_id ?? "");
    setTags(task?.tags ?? []);
    setTagInput("");
    setComment("");
  }, [open, task, defaultProjectId, defaultStatus, projects]);

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

  const comments = useQuery({
    queryKey: ["task-comments", task?.id],
    enabled: !!task?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("task_comments")
        .select("id, comment, created_at, user_id, profiles:profiles(name)")
        .eq("task_id", task!.id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

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
        assignee_id: assigneeId || null,
        tags,
      };
      if (task) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", task.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tasks").insert({ ...payload, created_by: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(task ? "Tarefa atualizada" : "Tarefa criada");
      qc.invalidateQueries({ queryKey: ["tasks"] });
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

  const addComment = useMutation({
    mutationFn: async () => {
      if (!task || !user || !comment.trim()) return;
      const { error } = await supabase.from("task_comments").insert({
        task_id: task.id,
        user_id: user.id,
        comment: comment.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["task-comments", task?.id] });
    },
  });

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que precisa ser feito?" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>Projeto</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as "baixa" | "media" | "alta")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prazo</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Responsável</Label>
              <Select value={assigneeId || "none"} onValueChange={(v) => setAssigneeId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem responsável</SelectItem>
                  {(members.data ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name || m.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1">
                  {t}
                  <button onClick={() => setTags(tags.filter((x) => x !== t))}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Adicionar tag..."
                className="min-w-[100px] flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          {task && (
            <div>
              <Label>Comentários</Label>
              <div className="space-y-2 rounded-md border border-border p-3 max-h-40 overflow-y-auto">
                {(comments.data ?? []).length === 0 && <div className="text-xs text-muted-foreground">Sem comentários.</div>}
                {(comments.data ?? []).map((c: any) => (
                  <div key={c.id} className="text-sm">
                    <div className="text-xs text-muted-foreground">{c.profiles?.name ?? "—"} · {new Date(c.created_at).toLocaleString("pt-BR")}</div>
                    <div>{c.comment}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Adicionar comentário..." />
                <Button variant="secondary" onClick={() => addComment.mutate()}>Enviar</Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 flex-row justify-between sm:justify-between">
          <div>
            {task && (
              <Button variant="destructive" onClick={() => remove.mutate()}>Excluir</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={!title.trim() || !projectId}>
              {task ? "Salvar" : "Criar tarefa"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}