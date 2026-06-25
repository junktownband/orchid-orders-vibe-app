import { AlertTriangle, ArrowLeft } from "lucide-react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";
import { useId } from "react";
import { createPortal } from "react-dom";

import type { DashboardResponse } from "@orchid/shared";

import { marginPercentFrom, money, percent, type AppTone, type OrderWarning } from "./app-core";

export function Background({ children }: { children: ReactNode }) {
  return (
    <main className="h-dvh min-h-dvh overflow-y-auto overflow-x-hidden bg-ink text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,#020710_0%,#061225_52%,#01050d_100%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0)_30%,rgba(210,190,152,0.025)_100%)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-white/12" />
      {children}
    </main>
  );
}

export function GlassPanel({
  children,
  className = "",
  as: Component = "section"
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
}) {
  return (
    <Component
      className={`relative rounded-xl border border-white/[0.12] bg-panel/72 shadow-glass backdrop-blur-[28px] ${className}`}
    >
      {children}
    </Component>
  );
}

export function TextField({
  label,
  autoComplete,
  className = "",
  error,
  name,
  ...props
}: {
  label: string;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId();
  const fieldId = props.id ?? generatedId;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [props["aria-describedby"], errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="grid min-w-0 gap-2 text-sm text-white/62">
      <label htmlFor={fieldId}>{label}</label>
      <input
        {...props}
        id={fieldId}
        autoComplete={autoComplete ?? "off"}
        aria-describedby={describedBy}
        aria-invalid={error ? true : props["aria-invalid"]}
        className={`h-11 w-full min-w-0 rounded-lg border ${error ? "border-coral/70 focus-visible:border-coral/70 focus-visible:ring-coral/25" : "border-white/[0.12] focus-visible:border-mint/60 focus-visible:ring-mint/25"} bg-white/[0.07] px-3 text-white outline-none shadow-inner-glass transition-[background-color,border-color,box-shadow] placeholder:text-white/30 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        name={name ?? label}
      />
      {error ? (
        <span className="text-xs text-coral" id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function TextAreaField({
  label,
  autoComplete,
  className = "",
  error,
  name,
  ...props
}: {
  label: string;
  error?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generatedId = useId();
  const fieldId = props.id ?? generatedId;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [props["aria-describedby"], errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="grid min-w-0 gap-2 text-sm text-white/62">
      <label htmlFor={fieldId}>{label}</label>
      <textarea
        {...props}
        id={fieldId}
        autoComplete={autoComplete ?? "off"}
        aria-describedby={describedBy}
        aria-invalid={error ? true : props["aria-invalid"]}
        className={`min-h-28 w-full min-w-0 resize-y rounded-lg border ${error ? "border-coral/70 focus-visible:border-coral/70 focus-visible:ring-coral/25" : "border-white/[0.12] focus-visible:border-mint/60 focus-visible:ring-mint/25"} bg-white/[0.07] px-3 py-3 text-white outline-none shadow-inner-glass transition-[background-color,border-color,box-shadow] placeholder:text-white/30 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        name={name ?? label}
      />
      {error ? (
        <span className="text-xs text-coral" id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  children,
  className = "",
  error,
  name,
  ...props
}: {
  label: string;
  children: ReactNode;
  error?: string;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  const generatedId = useId();
  const fieldId = props.id ?? generatedId;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [props["aria-describedby"], errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="grid min-w-0 gap-2 text-sm text-white/62">
      <label htmlFor={fieldId}>{label}</label>
      <select
        {...props}
        id={fieldId}
        aria-describedby={describedBy}
        aria-invalid={error ? true : props["aria-invalid"]}
        className={`h-11 w-full min-w-0 rounded-lg border ${error ? "border-coral/70 focus-visible:border-coral/70 focus-visible:ring-coral/25" : "border-white/[0.12] focus-visible:border-mint/60 focus-visible:ring-mint/25"} bg-white/[0.07] px-3 text-white outline-none shadow-inner-glass transition-[background-color,border-color,box-shadow] focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        name={name ?? label}
      >
        {children}
      </select>
      {error ? (
        <span className="text-xs text-coral" id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function PrimaryButton({
  children,
  className = "",
  type = "button",
  ...props
}: {
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`button-glass-primary inline-flex h-11 touch-manipulation items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-[background,border-color,box-shadow,color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/40 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      type={type}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className = "",
  type = "button",
  ...props
}: {
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`button-glass-muted inline-flex h-11 touch-manipulation items-center justify-center gap-2 rounded-lg px-4 text-sm transition-[background,border-color,box-shadow,color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-35 ${className}`}
      type={type}
    >
      {children}
    </button>
  );
}

export function ModalLayer({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") {
    return <>{children}</>;
  }

  return createPortal(children, document.body);
}

export function ConfirmDialog({
  cancelLabel = "Отмена",
  children,
  confirmLabel,
  destructive = false,
  isBusy = false,
  onCancel,
  onConfirm,
  title
}: {
  cancelLabel?: string;
  children: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  isBusy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  const titleId = useId();

  return (
    <ModalLayer>
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain bg-black/62 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-md sm:items-center sm:p-6">
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="flex max-h-[calc(100dvh_-_1.5rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] w-full max-w-lg flex-col rounded-xl border border-white/[0.12] bg-panel/80 p-5 text-white shadow-glass backdrop-blur-[28px] sm:max-h-[calc(100dvh_-_3rem)]"
        role="dialog"
      >
        <h2 className="shrink-0 text-xl font-semibold" id={titleId}>
          {title}
        </h2>
        <div className="mt-3 overflow-y-auto overscroll-contain pr-1 text-sm leading-6 text-white/62">
          {children}
        </div>
        <div className="mt-5 grid shrink-0 gap-2 sm:grid-cols-[1fr_auto] sm:justify-end">
          <GhostButton disabled={isBusy} onClick={onCancel}>
            {cancelLabel}
          </GhostButton>
          <PrimaryButton
            className={
              destructive ? "bg-coral text-white hover:bg-coral/90 focus-visible:ring-coral/35" : ""
            }
            disabled={isBusy}
            onClick={onConfirm}
          >
            {isBusy ? "Выполняем..." : confirmLabel}
          </PrimaryButton>
        </div>
      </section>
    </div>
    </ModalLayer>
  );
}

export function MetricCard({
  hint,
  label,
  value,
  tone = "text-white"
}: {
  hint?: string;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <GlassPanel as="div" className="p-4">
      <p className="text-xs uppercase text-white/42">{label}</p>
      <p className={`mt-2 break-words text-2xl font-semibold tabular-nums tracking-normal ${tone}`}>
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs leading-5 text-white/45">{hint}</p> : null}
    </GlassPanel>
  );
}

export function InlineStat({
  label,
  value,
  tone = "text-white"
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-md border border-white/[0.08] bg-white/[0.045] p-3 shadow-inner-glass">
      <p className="text-xs uppercase text-white/40">{label}</p>
      <p className={`mt-1 break-words text-lg font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

export function StatusPill({
  label,
  size = "md",
  tone = "neutral"
}: {
  label: string;
  size?: "sm" | "md";
  tone?: AppTone;
}) {
  const toneClass: Record<AppTone, string> = {
    amber: "status-tone-amber",
    coral: "status-tone-coral",
    honey: "status-tone-honey",
    mint: "status-tone-mint",
    mist: "status-tone-mist",
    neutral: "status-tone-neutral",
    rose: "status-tone-rose",
    sage: "status-tone-sage",
    sand: "status-tone-sand"
  };
  const sizeClass = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1 text-sm";

  return (
    <span className={`inline-flex rounded-full ring-1 ${sizeClass} ${toneClass[tone]}`}>
      {label}
    </span>
  );
}

export function MarginPreview({
  title,
  subtitle,
  priceCents,
  costCents
}: {
  title: string;
  subtitle?: string;
  priceCents: number;
  costCents: number;
}) {
  const profitCents = priceCents - costCents;
  const margin = marginPercentFrom(priceCents, costCents);
  const profitTone = profitCents < 0 ? "text-coral" : "text-mint";

  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.045] p-4 shadow-inner-glass">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-white/48">{title}</p>
          {subtitle ? <p className="mt-1 text-xs text-white/38">{subtitle}</p> : null}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm ring-1 ${
            profitCents < 0
              ? "bg-coral/14 text-coral ring-coral/25"
              : "bg-mint/12 text-mint ring-mint/25"
          }`}
        >
          {percent(margin)}%
        </span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <InlineStat label="Цена" value={money(priceCents)} />
        <InlineStat label="Себестоимость" value={money(costCents)} />
        <InlineStat label="Маржа" tone={profitTone} value={money(profitCents)} />
      </div>
    </div>
  );
}

export function WarningPill({ warning }: { warning: OrderWarning }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ring-1 ${
        warning.tone === "coral"
          ? "bg-coral/14 text-coral ring-coral/25"
          : "bg-amber/14 text-amber ring-amber/25"
      }`}
    >
      <AlertTriangle aria-hidden="true" size={13} />
      {warning.text}
    </span>
  );
}

export function ResalePanel({ dashboard }: { dashboard: DashboardResponse | null }) {
  const resale = dashboard?.resale;

  return (
    <GlassPanel className="overflow-hidden p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-white/48">Перепродажа</p>
          <h3 className="mt-1 text-2xl font-semibold">Материалы, товары, запчасти</h3>
        </div>
        <span className="rounded-full bg-white/[0.09] px-3 py-1 text-sm text-white/60 ring-1 ring-white/10">
          {resale ? `${percent(resale.marginPercent)}%` : "—"}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Выручка"
          tone="text-amber"
          value={resale ? money(resale.revenueCents) : "—"}
        />
        <MetricCard label="Себестоимость" value={resale ? money(resale.costCents) : "—"} />
        <MetricCard
          label="Прибыль"
          tone="text-mint"
          value={resale ? money(resale.grossProfitCents) : "—"}
        />
      </div>
    </GlassPanel>
  );
}

export function PageToolbar({
  title,
  count,
  action,
  back
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  back?: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {back ? (
          <GhostButton aria-label="Назад" className="h-10 w-10 px-0" onClick={back}>
            <ArrowLeft size={18} />
          </GhostButton>
        ) : null}
        <div>
          <h2 className="text-2xl font-semibold tracking-normal">{title}</h2>
          {count !== undefined ? (
            <p className="mt-1 text-sm text-white/45">Записей: {count}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}
