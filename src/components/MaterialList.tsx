import { useId } from "react";
import type { ComponentType, ReactNode } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

/* ── Material-style building blocks ──────────────────────────────────
 * Rows sit in "segmented" groups: each row is its own surface with a
 * 2px gap, and only the group's outer corners are fully rounded.
 */

export function Group({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 overflow-hidden rounded-[28px]",
        "[&>*]:rounded-[4px] [&>*:first-child]:rounded-t-[28px] [&>*:last-child]:rounded-b-[28px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Category({ children }: { children: ReactNode }) {
  return <h3 className="px-5 pb-2 pt-6 text-sm font-semibold text-primary">{children}</h3>;
}

export function IconBubble({
  icon: Icon,
  tone = "primary",
}: {
  icon: Icon;
  tone?: "primary" | "danger";
}) {
  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
        tone === "danger" ? "bg-destructive/12 text-destructive" : "bg-primary/15 text-primary",
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
    </span>
  );
}

export function Row({
  icon,
  title,
  summary,
  trailing,
  onClick,
  tone,
  leading,
}: {
  icon?: Icon;
  title: ReactNode;
  summary?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  tone?: "danger";
  leading?: ReactNode;
}) {
  const inner = (
    <>
      {leading ??
        (icon && <IconBubble icon={icon} tone={tone === "danger" ? "danger" : "primary"} />)}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-[16px] leading-snug",
            tone === "danger" ? "text-destructive" : "text-foreground",
          )}
        >
          {title}
        </span>
        {summary && (
          <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{summary}</span>
        )}
      </span>
      {trailing}
    </>
  );
  const base = "flex w-full min-h-[72px] items-center gap-4 bg-card px-5 py-3 text-left";
  if (!onClick) return <div className={base}>{inner}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        base,
        "transition-colors hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none active:bg-muted",
      )}
    >
      {inner}
    </button>
  );
}

/** Material 3 switch: thumb grows and shows a check when on. */
export function M3Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        "relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full border-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked ? "border-primary bg-primary" : "border-muted-foreground/60 bg-muted",
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full transition-all duration-200",
          checked
            ? "ml-[22px] h-6 w-6 bg-primary-foreground text-primary"
            : "ml-1.5 h-4 w-4 bg-muted-foreground/70",
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}

/** Material 3 radio indicator for single-choice rows. */
export function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
        checked ? "border-primary" : "border-muted-foreground/70",
      )}
    >
      {checked && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
    </span>
  );
}

export function FilledButton({
  children,
  className,
  variant = "filled",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "filled" | "tonal" | "text" }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-[background-color,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
        variant === "filled" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "tonal" && "bg-primary/15 text-primary hover:bg-primary/25",
        variant === "text" && "px-3 text-primary hover:bg-primary/10",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TextField({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block px-1 text-sm font-medium text-foreground">
        {label}
      </label>
      <Input
        id={id}
        {...props}
        className={cn(
          "h-12 rounded-2xl border-border bg-background/60 px-4 text-base focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 md:text-[15px]",
          props.className,
        )}
      />
      {hint && <p className="px-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Expanding form inside a group (stands in for Android's dialogs). */
export function InlineForm({
  onSubmit,
  onCancel,
  submitLabel,
  children,
}: {
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  children: ReactNode;
}) {
  return (
    <form
      className="animate-native-slide space-y-4 bg-card px-5 py-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
      <div className="flex justify-end gap-2">
        <FilledButton type="button" variant="text" onClick={onCancel}>
          Cancel
        </FilledButton>
        <FilledButton type="submit">{submitLabel}</FilledButton>
      </div>
    </form>
  );
}
