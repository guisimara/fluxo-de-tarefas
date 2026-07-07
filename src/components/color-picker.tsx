import { useRef, useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#F97316",
  "#F59E0B", "#84CC16", "#22C55E", "#14B8A6", "#06B6D4",
];

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function isValidHex(v: string) {
  return /^#([0-9a-fA-F]{6})$/.test(v);
}

function HexColorPicker({ color, onChange }: { color: string; onChange: (hex: string) => void }) {
  const initial = hexToHsv(isValidHex(color) ? color : "#3B82F6");
  const [h, setH] = useState(initial.h);
  const [s, setS] = useState(initial.s);
  const [v, setV] = useState(initial.v);
  const [hexInput, setHexInput] = useState(color.toUpperCase());
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hex = hsvToHex(h, s, v);
    setHexInput(hex);
    onChange(hex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h, s, v]);

  const dragSV = (clientX: number, clientY: number) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
    setS(x / rect.width);
    setV(1 - y / rect.height);
  };

  const dragHue = (clientX: number) => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    setH((x / rect.width) * 360);
  };

  return (
    <div className="w-64 space-y-3">
      <div
        ref={svRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dragSV(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) dragSV(e.clientX, e.clientY);
        }}
        className="relative h-36 w-full cursor-crosshair rounded-lg"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h}, 100%, 50%))`,
        }}
      >
        <div
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: hsvToHex(h, s, v) }}
        />
      </div>

      <div
        ref={hueRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dragHue(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) dragHue(e.clientX);
        }}
        className="relative h-3 w-full cursor-pointer rounded-full"
        style={{
          background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
      >
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${(h / 360) * 100}%`, background: `hsl(${h}, 100%, 50%)` }}
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="h-8 w-8 shrink-0 rounded-full border border-border" style={{ background: hsvToHex(h, s, v) }} />
        <input
          value={hexInput}
          onChange={(e) => {
            const val = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
            setHexInput(val);
            if (isValidHex(val)) {
              const hsv = hexToHsv(val);
              setH(hsv.h); setS(hsv.s); setV(hsv.v);
            }
          }}
          maxLength={7}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm font-mono outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [open, setOpen] = useState(false);
  const isCustom = !PRESET_COLORS.includes(value.toUpperCase()) && !PRESET_COLORS.includes(value);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="grid h-7 w-7 place-items-center rounded-full ring-offset-2 ring-offset-background transition"
          style={{ background: c, boxShadow: value.toUpperCase() === c ? `0 0 0 2px ${c}` : undefined }}
        >
          {value.toUpperCase() === c && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
        </button>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "grid h-7 w-7 place-items-center rounded-full border-2 border-dashed border-muted-foreground/40 text-muted-foreground transition hover:border-primary hover:text-primary",
              isCustom && "border-solid border-transparent",
            )}
            style={isCustom ? { background: value } : undefined}
          >
            {!isCustom && <Plus className="h-3.5 w-3.5" />}
            {isCustom && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3">
          <HexColorPicker color={value} onChange={onChange} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
