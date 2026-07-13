import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MessageSquare, Link2, Plus, X, Send } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { Task, Profile } from "@/lib/tasks";

/** Renderiza o texto de um comentário destacando menções "@Nome". */
function renderCommentText(text: string, members: Profile[]) {
  const names = members.map((m) => m.name).filter(Boolean) as string[];
  if (names.length === 0) return text;
  const pattern = new RegExp(`(@(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))`, "g");
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    part.startsWith("@") && names.includes(part.slice(1)) ? (
      <span key={i} className="rounded bg-primary/10 px-1 font-medium text-primary">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function TaskCommentsPanel({
  task,
  members,
  open,
  onOpenChange,
}: {
  task: Task | null;
  members: Profile[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [newLink, setNewLink] = useState("");

  const comments = useQuery({
    queryKey: ["task-comments", task?.id],
    enabled: !!task?.id && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("task_comments")
        .select("id, comment, created_at, user_id, profiles:profiles(name)")
        .eq("task_id", task!.id)
        .order("created_at", { ascending: true });
      return (data ?? []) as { id: string; comment: string; created_at: string; user_id: string; profiles: { name: string | null } | null }[];
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
    onError: (e: Error) => toast.error(e.message),
  });

  const addLink = useMutation({
    mutationFn: async () => {
      if (!task || !newLink.trim()) return;
      const links = Array.from(new Set([...(task.links ?? []), newLink.trim()]));
      const { error } = await supabase.from("tasks").update({ links }).eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setNewLink("");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeLink = useMutation({
    mutationFn: async (link: string) => {
      if (!task) return;
      const links = (task.links ?? []).filter((l) => l !== link);
      const { error } = await supabase.from("tasks").update({ links }).eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const filteredMembers = useMemo(
    () => members.filter((m) => (m.name ?? "").toLowerCase().includes(mentionQuery.toLowerCase())),
    [members, mentionQuery],
  );

  const handleCommentChange = (value: string) => {
    setComment(value);
    const match = value.match(/@([^\s@]*)$/);
    if (match) {
      setShowMentions(true);
      setMentionQuery(match[1]);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (name: string) => {
    setComment((c) => c.replace(/@([^\s@]*)$/, `@${name} `));
    setShowMentions(false);
  };

  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" /> Comentários
          </SheetTitle>
          <p className="truncate text-xs text-muted-foreground">{task.title}</p>
        </SheetHeader>

        <div className="border-b border-border px-5 py-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Link2 className="h-3.5 w-3.5" /> Links
          </div>
          <div className="space-y-1.5">
            {(task.links ?? []).map((link) => (
              <div key={link} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
                <a href={link} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs text-primary underline">
                  {link}
                </a>
                <button onClick={() => removeLink.mutate(link)} className="shrink-0 text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newLink.trim()) { e.preventDefault(); addLink.mutate(); } }}
              placeholder="https://..."
              className="h-8 text-xs"
            />
            <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => addLink.mutate()} disabled={!newLink.trim()}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {(comments.data ?? []).length === 0 && (
            <div className="text-center text-xs text-muted-foreground">Nenhum comentário ainda.</div>
          )}
          {(comments.data ?? []).map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-card p-2.5">
              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{c.profiles?.name ?? "—"}</span>
                <span>{new Date(c.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="text-sm">{renderCommentText(c.comment, members)}</div>
            </div>
          ))}
        </div>

        <div className="relative border-t border-border px-5 py-4">
          {showMentions && filteredMembers.length > 0 && (
            <div className="absolute bottom-full left-5 right-5 mb-1 max-h-40 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
              {filteredMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => insertMention(m.name ?? "")}
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                >
                  @{m.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              value={comment}
              onChange={(e) => handleCommentChange(e.target.value)}
              placeholder="Escreva um comentário... use @ para marcar alguém"
              rows={2}
              className="text-sm"
            />
            <Button size="icon" className="h-auto shrink-0" onClick={() => addComment.mutate()} disabled={!comment.trim() || addComment.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
