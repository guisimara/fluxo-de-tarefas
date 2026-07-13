import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRODUCT_STATUS_LABEL,
  SALES_PLATFORM_LABEL,
  type Product,
  type ProductStatus,
  type SalesPlatform,
} from "@/lib/tasks";

export function ProductPanel({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    description: "",
    projectLink: "",
    salesPlatforms: [] as SalesPlatform[],
    checkoutLink: "",
    instagram: "",
    suggestedPrice: "",
    status: "em_construcao" as ProductStatus,
  });

  useEffect(() => {
    if (!open || !product) return;
    setForm({
      name: product.name,
      description: product.description ?? "",
      projectLink: product.project_link ?? "",
      salesPlatforms: product.sales_platforms ?? [],
      checkoutLink: product.checkout_link ?? "",
      instagram: product.instagram ?? "",
      suggestedPrice: product.suggested_price != null ? String(product.suggested_price) : "",
      status: product.status,
    });
  }, [open, product]);

  const togglePlatform = (platform: SalesPlatform) => {
    setForm((f) => ({
      ...f,
      salesPlatforms: f.salesPlatforms.includes(platform)
        ? f.salesPlatforms.filter((p) => p !== platform)
        : [...f.salesPlatforms, platform],
    }));
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!product) return;
      const { error } = await supabase
        .from("products")
        .update({
          name: form.name,
          description: form.description || null,
          status: form.status,
          project_link: form.projectLink || null,
          sales_platforms: form.salesPlatforms,
          checkout_link: form.checkoutLink || null,
          instagram: form.instagram || null,
          suggested_price: form.suggestedPrice ? Number(form.suggestedPrice) : null,
        })
        .eq("id", product.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto atualizado");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!product) return null;

  const hasProjectLink = form.projectLink.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="text-base">{product.name}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
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
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label>Descrição do produto</Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
          </div>

          <div>
            <Label>Link do projeto</Label>
            <div className="flex gap-2">
              <Input
                value={form.projectLink}
                onChange={(e) => setForm((f) => ({ ...f, projectLink: e.target.value }))}
                placeholder="https://..."
              />
              <Button
                type="button"
                variant={hasProjectLink ? "default" : "outline"}
                disabled={!hasProjectLink}
                className={cn("shrink-0", !hasProjectLink && "opacity-40")}
                onClick={() => hasProjectLink && window.open(form.projectLink, "_blank", "noreferrer")}
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Acessar
              </Button>
            </div>
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
            <Input
              type="number"
              step="0.01"
              value={form.suggestedPrice}
              onChange={(e) => setForm((f) => ({ ...f, suggestedPrice: e.target.value }))}
              placeholder="0,00"
            />
          </div>
        </div>

        <div className="border-t border-border px-5 py-4">
          <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim()}>
            Salvar alterações
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
