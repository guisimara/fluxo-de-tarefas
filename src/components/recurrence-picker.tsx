import { useEffect, useState } from "react";
import { Repeat, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  WEEKDAY_SHORT,
  describeRecurrence,
  type Recurrence,
  type RecurrenceFreq,
  type MonthlyRecurrenceMode,
} from "@/lib/tasks";

const DEFAULT_RECURRENCE: Recurrence = { freq: "weekly", interval: 1, byWeekday: [], monthlyMode: "day_of_month", until: null };

export function RecurrencePicker({
  value,
  onChange,
  dueDate,
}: {
  value: Recurrence | null;
  onChange: (r: Recurrence | null) => void;
  dueDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Recurrence>(value ?? DEFAULT_RECURRENCE);

  useEffect(() => {
    if (open) setDraft(value ?? { ...DEFAULT_RECURRENCE, byWeekday: dueDate ? [new Date(dueDate + "T00:00:00").getDay()] : [] });
  }, [open, value, dueDate]);

  const toggleWeekday = (d: number) => {
    setDraft((prev) => {
      const set = new Set(prev.byWeekday ?? []);
      if (set.has(d)) set.delete(d); else set.add(d);
      return { ...prev, byWeekday: Array.from(set).sort((a, b) => a - b) };
    });
  };

  const apply = () => {
    onChange(draft);
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start gap-2 font-normal">
          <Repeat className="h-4 w-4 text-muted-foreground" />
          {value ? describeRecurrence(value) : "Não repete"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-4" align="start">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Repetir tarefa</Label>
          {value && (
            <button onClick={clear} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
              <X className="h-3 w-3" /> Remover
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">A cada</span>
          <Input
            type="number"
            min={1}
            value={draft.interval}
            onChange={(e) => setDraft((p) => ({ ...p, interval: Math.max(1, Number(e.target.value) || 1) }))}
            className="w-16"
          />
          <Select value={draft.freq} onValueChange={(v) => setDraft((p) => ({ ...p, freq: v as RecurrenceFreq }))}>
            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">dia(s)</SelectItem>
              <SelectItem value="weekly">semana(s)</SelectItem>
              <SelectItem value="monthly">mês(es)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {draft.freq === "weekly" && (
          <div>
            <Label className="mb-2 block text-xs text-muted-foreground">Repetir em</Label>
            <div className="flex gap-1">
              {WEEKDAY_SHORT.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleWeekday(i)}
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-full border text-xs font-medium transition",
                    (draft.byWeekday ?? []).includes(i)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {draft.freq === "monthly" && (
          <div>
            <Label className="mb-2 block text-xs text-muted-foreground">Repetir</Label>
            <Select value={draft.monthlyMode ?? "day_of_month"} onValueChange={(v) => setDraft((p) => ({ ...p, monthlyMode: v as MonthlyRecurrenceMode }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="day_of_month">No mesmo dia do mês</SelectItem>
                <SelectItem value="weekday_of_month">No mesmo dia da semana</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">Termina em (opcional)</Label>
          <Input
            type="date"
            value={draft.until ?? ""}
            onChange={(e) => setDraft((p) => ({ ...p, until: e.target.value || null }))}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="button" size="sm" onClick={apply}>Aplicar</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
