"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { Check, Loader2, Moon, Sun, X, AlertTriangle } from "lucide-react";

// ── cn helper ───────────────────────────────────────────────────────────────────
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

// ── Button ──────────────────────────────────────────────────────────────────────
type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary-hover)] shadow-[var(--shadow-sm)]",
  secondary:
    "bg-[var(--secondary-soft)] text-[var(--secondary)] hover:brightness-95",
  outline:
    "bg-[var(--surface)] text-[var(--fg)] border border-[var(--border-strong)] hover:bg-[var(--surface-2)]",
  ghost: "bg-transparent text-[var(--fg-muted)] hover:bg-[var(--surface-2)]",
  danger:
    "bg-[var(--danger)] text-white hover:bg-[var(--danger-hover)] shadow-[var(--shadow-sm)]",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg gap-1.5",
  md: "h-11 px-4 text-[15px] rounded-xl gap-2",
  lg: "h-12 px-6 text-base rounded-xl gap-2",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-[background,color,box-shadow,filter,transform] duration-150 active:scale-[0.98] disabled:opacity-50 focus-visible:outline-2",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({
  children,
  className,
  as: As = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "form";
}) {
  return (
    <As
      className={cn(
        "rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  icon,
  right,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-52 flex-1 items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            {icon}
          </span>
        )}
        <div>
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
              {eyebrow}
            </p>
          )}
          <h2 className="text-lg font-semibold text-[var(--fg)] sm:text-xl">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-[var(--fg-muted)]">{description}</p>
          )}
        </div>
      </div>
      {right}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  icon,
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "secondary" | "accent" | "danger";
  icon?: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-[var(--surface-2)] text-[var(--fg-muted)]",
    primary: "bg-[var(--primary-soft)] text-[var(--primary)]",
    secondary: "bg-[var(--secondary-soft)] text-[var(--secondary)]",
    accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
      )}
    >
      {icon}
      {children}
    </span>
  );
}

// ── Text input / textarea / label ─────────────────────────────────────────────
export function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-[var(--fg)]"
      >
        {label}
        {required && <span className="text-[var(--danger)]"> *</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-[var(--fg-subtle)]">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "w-full h-11 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 text-[15px] text-[var(--fg)] placeholder:text-[var(--fg-subtle)] transition-colors focus:border-[var(--primary)] focus-visible:outline-none";

// ── Theme toggle ──────────────────────────────────────────────────────────────
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const saved = (localStorage.getItem("hp-theme") as "light" | "dark") || null;
    if (saved) setTheme(saved);
    else {
      setTheme(
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light",
      );
    }
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("hp-theme", next);
    } catch {}
  };

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex size-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
    >
      {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}
const ToastContext = createContext<(kind: ToastKind, message: string) => void>(
  () => {},
);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[1000] flex flex-col items-center gap-2 px-4"
        aria-live="polite"
        role="status"
      >
        {items.map((t) => (
          <div
            key={t.id}
            style={{ animation: "hp-toast-in 0.24s ease-out both" }}
            className={cn(
              "pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-[var(--shadow-lg)]",
              t.kind === "success" &&
                "bg-[var(--primary)] text-[var(--on-primary)]",
              t.kind === "error" && "bg-[var(--danger)] text-white",
              t.kind === "info" && "bg-[var(--surface)] text-[var(--fg)] border border-[var(--border)]",
            )}
          >
            {t.kind === "success" && <Check className="size-4 shrink-0" />}
            {t.kind === "error" && <AlertTriangle className="size-4 shrink-0" />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Confirm dialog ──────────────────────────────────────────────────────────────
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  danger = true,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden
      />
      <Card className="relative z-10 w-full max-w-md animate-in p-6">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              danger
                ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                : "bg-[var(--primary-soft)] text-[var(--primary)]",
            )}
          >
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <h3 id="confirm-title" className="text-lg font-semibold text-[var(--fg)]">
              {title}
            </h3>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ── Segmented control (tabs) ────────────────────────────────────────────────────
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-colors",
              active
                ? "bg-[var(--surface)] text-[var(--fg)] shadow-[var(--shadow-sm)]"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]",
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Stepper (number) ────────────────────────────────────────────────────────────
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 20,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-1">
      <button
        type="button"
        aria-label={`Decrease ${label ?? "value"}`}
        onClick={() => set(value - 1)}
        disabled={value <= min}
        className="flex size-9 items-center justify-center rounded-lg text-lg font-semibold text-[var(--fg-muted)] hover:bg-[var(--surface-2)] disabled:opacity-40"
      >
        −
      </button>
      <span className="tnum w-8 text-center text-base font-semibold text-[var(--fg)]">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label ?? "value"}`}
        onClick={() => set(value + 1)}
        disabled={value >= max}
        className="flex size-9 items-center justify-center rounded-lg text-lg font-semibold text-[var(--fg-muted)] hover:bg-[var(--surface-2)] disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

export { X };
