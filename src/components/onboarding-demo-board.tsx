import { useState } from "react";
import { Plus, GitBranch, X, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { STATUS_ORDER, STATUS_LABEL, STATUS_TOKEN, PRIORITY_LABEL, PRIORITY_CLASS, type Status, type Priority } from "@/lib/tasks";
import { cn } from "@/lib/utils";

interface DemoTask {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  dueDate: string;
  tags: string[];
}

function createId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function DemoTaskDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (t: DemoTask) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("aberto");
  const [priority, setPriority] = useState<Priority>("media");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const reset = () => {
    setTitle("");
    setDescription("");
    setStatus("aberto");
    setPriority("media");
    setDueDate("");
    setTags([]);
    setTagInput("");
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const submit = () => {
    if (!title.trim()) return;
    onCreate({ id: createId(), title: title.trim(), description, status, priority, dueDate, tags });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que precisa ser feito?" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Prazo</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!title.trim()}>Criar tarefa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Board interativo e local (sem backend) usado na landing page para o visitante experimentar o fluxo de criação de tarefas. */
export function OnboardingDemoBoard() {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<DemoTask[]>([]);

  return (
    <div className="glass-card mx-auto mt-4 w-full max-w-4xl rounded-3xl p-4 text-left md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#3B82F6]/15 text-[#93C5FD]">
            <GitBranch className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold text-white">Projeto modelo</div>
            <div className="text-xs text-white/50">Experimente criar sua primeira tarefa</div>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} className="glow-btn gap-2 rounded-full bg-[#3B82F6] hover:bg-[#2563EB]">
          <Plus className="h-4 w-4" /> Nova tarefa
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-white/30" />
          <p className="text-sm text-white/60">
            Clique em "Nova tarefa" e veja como fica simples criar e organizar o seu trabalho em árvore.
          </p>
        </div>
      ) : (
        <div className="relative space-y-1 rounded-2xl border border-white/10 bg-white/[0.02] p-3 pl-8">
          <span className="absolute left-6 top-4 bottom-4 w-px bg-white/10" />
          {tasks.map((t) => {
            const token = STATUS_TOKEN[t.status];
            return (
              <div key={t.id} className="group relative flex flex-wrap items-center gap-2 rounded-lg py-2 pl-3 pr-2 hover:bg-white/[0.03]">
                <span className="absolute -left-2 top-1/2 h-px w-3 -translate-y-1/2 bg-white/10" />
                <span className={cn("h-2 w-2 shrink-0 rounded-full", token.dot)} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/90">{t.title}</span>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px]", token.bg, token.fg)}>{STATUS_LABEL[t.status]}</span>
                <span className={cn("hidden shrink-0 rounded-full border px-2 py-0.5 text-[10px] sm:inline", PRIORITY_CLASS[t.priority])}>
                  {PRIORITY_LABEL[t.priority]}
                </span>
                {t.dueDate && (
                  <span className="hidden shrink-0 text-[11px] text-white/40 sm:inline">
                    {new Date(t.dueDate + "T00:00:00").toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <DemoTaskDialog open={open} onOpenChange={setOpen} onCreate={(t) => setTasks((prev) => [...prev, t])} />
    </div>
  );
}
