import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function InviteModal({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (v: boolean) => void; projectId: string }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("editor");

  const invite = useMutation({
    mutationFn: async () => {
      // try to link if profile exists
      const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
      const { error } = await supabase.from("project_members").insert({
        project_id: projectId,
        invited_email: email,
        user_id: profile?.id ?? null,
        role,
        status: profile ? "accepted" : "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Convite enviado!");
      qc.invalidateQueries({ queryKey: ["members", projectId] });
      qc.invalidateQueries({ queryKey: ["all-members"] });
      onOpenChange(false);
      setEmail("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar pessoa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@empresa.com" />
          </div>
          <div>
            <Label>Permissão</Label>
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin — pode gerenciar tudo</SelectItem>
                <SelectItem value="editor">Editor — pode criar/editar tarefas</SelectItem>
                <SelectItem value="viewer">Visualizador — apenas leitura</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => invite.mutate()} disabled={!email.trim()}>Enviar convite</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}