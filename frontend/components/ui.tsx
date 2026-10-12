import Link from "next/link";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ surfaces */

export function Card({
  className,
  children,
  as: As = "div",
}: {
  className?: string;
  children: React.ReactNode;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <As
      className={cx(
        "rounded-card border border-line bg-surface shadow-card",
        className
      )}
    >
      {children}
    </As>
  );
}

export function SectionTitle({
  children,
  hint,
  className,
  id,
}: {
  children: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cx("mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1", className)}>
      <h2 id={id} className="text-[15px] font-semibold tracking-tight text-fg">
        {children}
      </h2>
      {hint ? <span className="text-xs text-subtle">{hint}</span> : null}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cx("text-[11px] font-medium uppercase tracking-[0.09em] text-subtle", className)}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------- actions */

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "default" | "ghost" | "danger";
  size?: "sm" | "md";
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  "aria-label"?: string;
  target?: string;
  rel?: string;
};

const BTN_BASE =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium " +
  "transition-[background,border,color,box-shadow] duration-150 select-none " +
  "disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap";

const BTN_VARIANT: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-accent text-accent-fg hover:bg-accent-hover shadow-[0_1px_2px_rgba(16,24,40,.16)]",
  default:
    "border border-line bg-surface text-fg hover:bg-raised",
  ghost: "text-muted hover:bg-raised hover:text-fg",
  danger: "border border-line bg-surface text-danger hover:bg-raised",
};

const BTN_SIZE = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-9 px-3.5 text-sm",
};

export function Button({
  children,
  href,
  variant = "default",
  size = "md",
  className,
  type = "button",
  onClick,
  disabled,
  title,
  target,
  rel,
  ...rest
}: ButtonProps) {
  const cls = cx(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className);
  if (href && !disabled) {
    const external = /^https?:/.test(href);
    return (
      <Link
        href={href}
        className={cls}
        title={title}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : rel}
        {...rest}
      >
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls} title={title} {...rest}>
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------- badges */

type Tone = "neutral" | "accent" | "warn" | "ok" | "danger" | "outline";

const BADGE_TONE: Record<Tone, string> = {
  neutral: "bg-raised text-muted",
  accent: "bg-accent-soft text-accent",
  warn: "bg-amber-500/12 text-warn",
  ok: "bg-emerald-500/12 text-ok",
  danger: "bg-red-500/12 text-danger",
  outline: "border border-line text-muted",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  title,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cx(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4",
        BADGE_TONE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx("inline-block h-2 w-2 shrink-0 rounded-full", className)}
      style={{ background: color }}
    />
  );
}

/* ------------------------------------------------------------------ feedback */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("pg-skeleton", className)} />;
}

export function EmptyState({
  title,
  description,
  action,
  icon = "◎",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface px-6 py-12 text-center">
      <span aria-hidden className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-raised text-base text-subtle">
        {icon}
      </span>
      <p className="text-sm font-semibold text-fg">{title}</p>
      {description ? <p className="mt-1.5 max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* --------------------------------------------------------------------- stats */

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cx("rounded-card border border-line bg-surface px-4 py-3 shadow-card", className)}>
      <div className="text-xs text-subtle">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-fg">{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-subtle">{hint}</div> : null}
    </div>
  );
}

/* ---------------------------------------------------------------------- tabs */

export function Tabs({
  items,
  active,
  hrefFor,
  className,
}: {
  items: { key: string; label: string; count?: number }[];
  active: string;
  hrefFor: (key: string) => string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cx("-mb-px flex gap-1 overflow-x-auto border-b border-line pg-scroll", className)}
    >
      {items.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={hrefFor(t.key)}
            role="tab"
            aria-selected={on}
            className={cx(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
              on
                ? "border-accent font-semibold text-accent"
                : "border-transparent text-muted hover:border-line hover:text-fg"
            )}
          >
            {t.label}
            {t.count !== undefined ? (
              <span className="text-[11px] tabular-nums text-subtle">{t.count.toLocaleString()}</span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------------- forms */

export const inputCls =
  "h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg " +
  "placeholder:text-subtle transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

export const selectCls =
  "h-9 rounded-lg border border-line bg-surface px-2.5 text-sm text-fg transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

export function Breadcrumbs({
  items,
  className,
}: {
  items: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav aria-label="面包屑" className={cx("flex flex-wrap items-center gap-1 text-xs text-subtle", className)}>
      {items.map((it, i) => (
        <span key={`${it.label}-${i}`} className="flex items-center gap-1">
          {i > 0 ? <span aria-hidden className="text-line">/</span> : null}
          {it.href ? (
            <Link href={it.href} className="rounded px-0.5 hover:text-accent hover:underline">
              {it.label}
            </Link>
          ) : (
            <span className="text-muted">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
