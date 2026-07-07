import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/lib/auth-form";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Taskly" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/app" });
  };

  return (
    <AuthShell
      title="Entrar na sua conta"
      subtitle="Acesse seu gestor de tarefas."
      footer={<>Ainda não tem conta? <Link to="/cadastro" className="text-[#93C5FD] hover:text-white">Criar conta</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-sm text-white/70">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/30 outline-none focus:border-[#3B82F6]" />
        </div>
        <div>
          <label className="text-sm text-white/70">Senha</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/30 outline-none focus:border-[#3B82F6]" />
        </div>
        <div className="text-right text-xs">
          <Link to="/recuperar-senha" className="text-white/60 hover:text-white">Esqueci minha senha</Link>
        </div>
        <button disabled={loading} className="glow-btn w-full rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-60">
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </AuthShell>
  );
}