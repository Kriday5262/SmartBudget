import { Check, Monitor, Moon, Sun } from "lucide-react";
import { THEME_PRESETS, type Mode, type ThemePreset } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Light / Dark / System segmented control (Settings › Appearance, setup wizard). */
export function ThemeModePicker({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <div className="bg-card px-5 py-5">
      <div
        role="radiogroup"
        aria-label="Colour mode"
        className="grid grid-cols-3 overflow-hidden rounded-full border border-muted-foreground/40"
      >
        {(
          [
            { k: "light", label: "Light", icon: Sun },
            { k: "dark", label: "Dark", icon: Moon },
            { k: "system", label: "System", icon: Monitor },
          ] as const
        ).map((o, i) => {
          const on = mode === o.k;
          return (
            <button
              key={o.k}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setMode(o.k)}
              className={cn(
                "flex h-11 items-center justify-center gap-2 text-sm font-semibold transition-colors",
                i > 0 && "border-l border-muted-foreground/40",
                on ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {on ? (
                <Check className="h-4 w-4" strokeWidth={2.5} />
              ) : (
                <o.icon className="h-4 w-4" />
              )}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The split-circle theme colour grid (Settings › Appearance, setup wizard). */
export function ThemeColourGrid({
  preset,
  setPreset,
}: {
  preset: ThemePreset;
  setPreset: (p: ThemePreset) => void;
}) {
  return (
    <div className="bg-card px-5 py-6">
      <div className="grid grid-cols-5 gap-y-5 sm:gap-y-6">
        {THEME_PRESETS.map((p) => {
          const on = preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              aria-label={p.label}
              title={p.label}
              onClick={() => setPreset(p.id)}
              className="group flex flex-col items-center gap-2 focus-visible:outline-none"
            >
              <span
                className={cn(
                  "relative flex h-14 w-14 items-center justify-center rounded-full transition-transform group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-ring",
                  on && "ring-2 ring-foreground ring-offset-4 ring-offset-card",
                )}
                style={{
                  background: `conic-gradient(${p.primaryColor} 0 50%, ${p.accentColor} 50% 100%)`,
                }}
              >
                {on && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-card text-foreground shadow">
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className="line-clamp-2 max-w-[72px] text-center text-[11px] leading-tight text-muted-foreground">
                {p.label.replace("SmartBudget ", "")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
