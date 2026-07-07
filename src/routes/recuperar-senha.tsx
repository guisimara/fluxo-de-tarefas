import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/lib/auth-form";
import { toast } from "sonner";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({ meta: [{ title: "Recuperar senha — Taskly" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
  };

  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Enviaremos um link de redefinição para o seu email."
      footer={<Link to="/login" className="text-[#93C5FD] hover:text-white">Voltar para login</Link>}
    >
      {sent ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          Se o email existir, você receberá as instruções em instantes.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm text-white/70">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#3B82F6]" />
          </div>
          <button disabled={loading} className="glow-btn w-full rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-60">
            {loading ? "Enviando..." : "Enviar link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}