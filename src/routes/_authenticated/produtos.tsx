import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelect } from "@/components/ui/multi-select";
import { Plus, Package, Trash2, Link2, Instagram, ShoppingCart, Tag } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  PRODUCT_STATUS_LABEL,
  SALES_PLATFORM_LABEL,
  type Product,
  type ProductStatus,
  type SalesPlatform,
  type TeamMember,
} from "@/lib/tasks";
import { ColorPicker } from "@/components/color-picker";
import { ProductPanel } from "@/components/product-panel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/produtos")({
  component: ProductsPage,
});

const EMPTY_FORM = {
  name: "",
  description: "",
  projectLink: "",
  salesPlatforms: [] as SalesPlatform[],
  checkoutLink: "",
  instagram: "",
  suggestedPrice: "",
  color: "#3B82F6",
  status: "em_construcao" as ProductStatus,
  memberIds: [] as string[],
};

function ProductsPage() {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [viewing, setViewing] = useState<Product | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const products = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  const team = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });

  const togglePlatform = (platform: SalesPlatform) => {
    setForm((f) => ({
      ...f,
      salesPlatforms: f.salesPlatforms.includes(platform)
        ? f.salesPlatforms.filter((p) => p !== platform)
        : [...f.salesPlatforms, platform],
    }));
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error();
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({ name: form.name, description: form.description || null, color: form.color, owner_id: user.id })
        .select()
        .single();
      if (projectError) throw projectError;

      const { error: productError } = await supabase.from("products").insert({
        name: form.name,
        description: form.description || null,
        color: form.color,
        project_id: project.id,
        owner_id: user.id,
        status: form.status,
        project_link: form.projectLink || null,
        sales_platforms: form.salesPlatforms,
        checkout_link: form.checkoutLink || null,
        instagram: form.instagram || null,
        suggested_price: form.suggestedPrice ? Number(form.suggestedPrice) : null,
      });
      if (productError) throw productError;

      const selectedMembers = (team.data ?? []).filter((m) => form.memberIds.includes(m.id));
      if (selectedMembers.length > 0) {
        const { error: membersError } = await supabase.from("project_members").insert(
          selectedMembers.map((m) => ({
            project_id: project.id,
            invited_email: m.invited_email,
            user_id: m.user_id,
            role: "editor" as const,
            status: m.user_id ? ("accepted" as const) : ("pending" as const),
          })),
        );
        if (membersError) throw membersError;
      }
    },
    onSuccess: () => {
      toast.success("Produto criado");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto excluído");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 md:px-5">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
          <p className="text-sm text-muted-foreground">Registre produtos; cada um gera um projeto pronto para tarefas.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo produto
        </Button>
      </div>

      {(products.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-medium">Nenhum produto ainda</h3>
          <p className="mt-1 text-sm text-muted-foreground">Cadastre seu primeiro produto para começar.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(products.data ?? []).map((p) => (
            <div key={p.id} className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-start justify-between">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => { setViewing(p); setPanelOpen(true); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { setViewing(p); setPanelOpen(true); } }}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="grid h-9 w-9 place-items-center rounded-lg"
                      style={{ background: `${p.color}1A`, color: p.color }}
                    >
                      <Package className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold">{p.name}</h3>
                  </div>
                  {p.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}

                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 font-medium",
                        p.status === "ativo"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700",
                      )}
                    >
                      {PRODUCT_STATUS_LABEL[p.status]}
                    </span>
                    {p.sales_platforms?.map((sp) => (
                      <span key={sp} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-muted-foreground">
                        <ShoppingCart className="h-3 w-3" /> {SALES_PLATFORM_LABEL[sp]}
                      </span>
                    ))}
                    {p.suggested_price != null && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-muted-foreground">
                        <Tag className="h-3 w-3" /> R$ {Number(p.suggested_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {p.project_link && (
                      <a href={p.project_link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 hover:text-foreground">
                        <Link2 className="h-3 w-3" /> Projeto
                      </a>
                    )}
                    {p.checkout_link && (
                      <a href={p.checkout_link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 hover:text-foreground">
                        <ShoppingCart className="h-3 w-3" /> Checkout
                      </a>
                    )}
                    {p.instagram && (
                      <a href={p.instagram} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 hover:text-foreground">
                        <Instagram className="h-3 w-3" /> Instagram
                      </a>
                    )}
                  </div>

                  <div className="mt-4 text-xs text-muted-foreground">Criado em {new Date(p.created_at).toLocaleDateString("pt-BR")}</div>
                </div>
                {p.owner_id === user?.id && (
                  <button onClick={() => { if (confirm("Excluir este produto?")) del.mutate(p.id); }} className="opacity-0 transition group-hover:opacity-100">
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo produto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5">
              <div>
                <Label className="text-sm">Status do produto</Label>
                <p className="text-xs text-muted-foreground">{PRODUCT_STATUS_LABEL[form.status]}</p>
              </div>
              <Switch
                checked={form.status === "ativo"}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, status: checked ? "ativo" : "em_construcao" }))}
              />
            </div>

            <div>
              <Label>Nome do produto</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: App Mobile" />
            </div>
            <div>
              <Label>Descrição do produto</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div>
              <Label>Link do projeto</Label>
              <Input value={form.projectLink} onChange={(e) => setForm((f) => ({ ...f, projectLink: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label className="mb-2 block">Plataformas de venda</Label>
              <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-background px-3 py-2.5">
                {(Object.keys(SALES_PLATFORM_LABEL) as SalesPlatform[]).map((k) => (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.salesPlatforms.includes(k)} onCheckedChange={() => togglePlatform(k)} />
                    {SALES_PLATFORM_LABEL[k]}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Link do checkout</Label>
              <Input value={form.checkoutLink} onChange={(e) => setForm((f) => ({ ...f, checkoutLink: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label>Instagram do projeto</Label>
              <Input value={form.instagram} onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))} placeholder="https://instagram.com/..." />
            </div>
            <div>
              <Label>Preço sugerido</Label>
              <Input type="number" step="0.01" value={form.suggestedPrice} onChange={(e) => setForm((f) => ({ ...f, suggestedPrice: e.target.value }))} placeholder="0,00" />
            </div>
            <div>
              <Label className="mb-2 block">Cor</Label>
              <ColorPicker value={form.color} onChange={(color) => setForm((f) => ({ ...f, color }))} />
            </div>
            <div>
              <Label className="mb-2 block">Adicionar membro (quem pode visualizar)</Label>
              <MultiSelect
                options={(team.data ?? []).map((m) => ({ value: m.id, label: m.name || m.invited_email }))}
                selected={form.memberIds}
                onChange={(memberIds) => setForm((f) => ({ ...f, memberIds }))}
                placeholder="Nenhum membro adicionado"
                emptyText="Cadastre colaboradores na página Equipe primeiro."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => create.mutate()} disabled={!form.name.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProductPanel product={viewing} open={panelOpen} onOpenChange={setPanelOpen} />
    </div>
  );
}
