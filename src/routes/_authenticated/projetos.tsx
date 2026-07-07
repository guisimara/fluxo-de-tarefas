import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, FolderKanban, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { Project } from "@/lib/tasks";

export const Route = createFileRoute("/_authenticated/projetos")({
  component: ProjectsPage,
});

function ProjectsPage() {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Project[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error();
      const { error } = await supabase.from("projects").insert({ name, description: description || null, owner_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Projeto criado");
      qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false); setName(""); setDescription("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Projeto excluído");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <p className="text-sm text-muted-foreground">Organize suas tarefas em projetos.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo projeto
        </Button>
      </div>

      {(projects.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <FolderKanban className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-medium">Nenhum projeto ainda</h3>
          <p className="mt-1 text-sm text-muted-foreground">Crie seu primeiro projeto para começar.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(projects.data ?? []).map((p) => (
            <div key={p.id} className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-start justify-between">
                <Link to="/app/projetos/$id" params={{ id: p.id }} className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                      <FolderKanban className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold">{p.name}</h3>
                  </div>
                  {p.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                  <div className="mt-4 text-xs text-muted-foreground">Criado em {new Date(p.created_at).toLocaleDateString("pt-BR")}</div>
                </Link>
                {p.owner_id === user?.id && (
                  <button onClick={() => { if (confirm("Excluir este projeto?")) del.mutate(p.id); }} className="opacity-0 transition group-hover:opacity-100">
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo projeto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Site institucional" /></div>
            <div><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => create.mutate()} disabled={!name.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}