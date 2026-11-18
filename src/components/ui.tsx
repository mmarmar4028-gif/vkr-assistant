"use client";

import {
  useEffect,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { copyText } from "@/lib/format";
import type { Status } from "@/lib/types";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/* ---------------- Кнопки ---------------- */

type Variant = "primary" | "secondary" | "ghost" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300",
  secondary: "border border-line bg-white text-ink hover:bg-slate-50 disabled:text-slate-400",
  ghost: "text-brand-700 hover:bg-brand-50 disabled:text-slate-400",
  danger: "text-red-700 hover:bg-red-50 disabled:text-slate-400",
};

export function Button({
  variant = "secondary",
  small,
  className,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; small?: boolean }) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed",
        small ? "px-2.5 py-1 text-sm" : "px-4 py-2 text-[15px]",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  );
}

export function CopyButton({ text, label = "Копировать", small = true }: { text: string; label?: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <Button small={small} variant="ghost" onClick={async () => setCopied(await copyText(text))} disabled={!text}>
      {copied ? "Скопировано ✓" : label}
    </Button>
  );
}

/* ---------------- Поля ---------------- */

export function Field({
  label,
  hint,
  required,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-600" aria-hidden>*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[13px] leading-snug text-slate-500">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx("field", className)} {...rest} />;
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx("field", className)} {...rest} />;
}

export function Textarea({ className, rows = 3, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cx("field resize-y", className)} {...rest} />;
}

/** Черновик значения поля: подхватывает новое сохранённое значение, когда оно меняется снаружи. */
function useDraft(value: string) {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setDraft(value);
  }
  return [draft, setDraft] as const;
}

/**
 * Поле, которое сохраняет значение, когда пользователь закончил ввод
 * (ушёл из поля), а не на каждую букву.
 */
export function CommitInput({
  value,
  onCommit,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onCommit(value: string): void;
}) {
  const [draft, setDraft] = useDraft(value);
  const immediate = rest.type === "date";
  return (
    <Input
      {...rest}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        if (immediate) onCommit(e.target.value);
      }}
      onBlur={() => !immediate && draft !== value && onCommit(draft)}
    />
  );
}

export function CommitTextarea({
  value,
  onCommit,
  ...rest
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string;
  onCommit(value: string): void;
}) {
  const [draft, setDraft] = useDraft(value);
  return (
    <Textarea
      {...rest}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onCommit(draft)}
    />
  );
}

/** Числовое поле для количества страниц. */
export function NumberInput({
  value,
  onCommit,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: number | null | undefined;
  onCommit(value: number | null): void;
}) {
  return (
    <CommitInput
      {...rest}
      type="number"
      inputMode="decimal"
      min={0}
      step="any"
      value={value == null ? "" : String(value)}
      onCommit={(raw) => {
        const n = Number(raw.replace(",", "."));
        onCommit(raw.trim() === "" || Number.isNaN(n) ? null : n);
      }}
    />
  );
}

/* ---------------- Оформление ---------------- */

/** Номер пункта Программы ГИА, по которому можно сверить требование. */
export function Clause({ children }: { children: ReactNode }) {
  return (
    <span
      title="Пункт Программы ГИА 2026-2027 — сверьте с оригиналом"
      className="inline-block whitespace-nowrap rounded-md border border-brand-200 bg-brand-50 px-1.5 py-0.5 align-middle text-xs font-medium text-brand-700"
    >
      {children}
    </span>
  );
}

export function PageHeader({ title, lead, clause }: { title: string; lead?: ReactNode; clause?: string }) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {clause && <Clause>{clause}</Clause>}
      </div>
      {lead && <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-slate-600">{lead}</p>}
    </header>
  );
}

export function Card({
  title,
  clause,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  clause?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("rounded-2xl border border-line bg-white p-4 shadow-xs sm:p-5", className)}>
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-ink">
            {title}
            {clause && <Clause>{clause}</Clause>}
          </h2>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

type NoticeKind = "info" | "warn" | "ok" | "error";
const NOTICE: Record<NoticeKind, string> = {
  info: "border-brand-200 bg-brand-50 text-brand-900",
  warn: "border-amber-300 bg-amber-50 text-amber-950",
  ok: "border-emerald-300 bg-emerald-50 text-emerald-950",
  error: "border-red-300 bg-red-50 text-red-900",
};

export function Notice({
  kind = "info",
  clause,
  children,
  className,
}: {
  kind?: NoticeKind;
  clause?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={kind === "error" ? "alert" : undefined}
      className={cx("rounded-xl border px-3.5 py-2.5 text-[14.5px] leading-relaxed", NOTICE[kind], className)}
    >
      {children}
      {clause && (
        <>
          {" "}
          <Clause>{clause}</Clause>
        </>
      )}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-line bg-paper/60 px-4 py-6 text-center text-[15px] text-slate-500">
      {children}
    </p>
  );
}

export function Loading({ label = "Загрузка…" }: { label?: string }) {
  return <p className="py-8 text-center text-slate-500">{label}</p>;
}

export function Progress({ done, total }: { done: number; total: number }) {
  const share = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200" aria-hidden>
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${share}%` }} />
      </div>
      <span className="whitespace-nowrap text-sm tabular-nums text-slate-600">
        {done} из {total}
      </span>
    </div>
  );
}

/* ---------------- Чек-лист ---------------- */

const STATUSES: { key: Status; label: string; on: string }[] = [
  { key: "todo", label: "Не начато", on: "bg-slate-200 text-slate-800" },
  { key: "doing", label: "В работе", on: "bg-amber-200 text-amber-950" },
  { key: "done", label: "Готово", on: "bg-emerald-200 text-emerald-950" },
];

export function StatusSwitch({ value, onChange, label }: { value: Status; onChange(v: Status): void; label: string }) {
  return (
    <div role="radiogroup" aria-label={`Статус: ${label}`} className="inline-flex rounded-lg border border-line bg-white p-0.5">
      {STATUSES.map((s) => (
        <button
          key={s.key}
          type="button"
          role="radio"
          aria-checked={value === s.key}
          onClick={() => onChange(s.key)}
          className={cx(
            "rounded-md px-2.5 py-1 text-[13px] font-medium transition",
            value === s.key ? s.on : "text-slate-500 hover:bg-slate-50",
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

export function ChecklistRow({
  text,
  hint,
  clause,
  value,
  onChange,
  withChapter = true,
  index,
}: {
  text: string;
  hint?: string;
  clause: string;
  value: { status: Status; note: string; chapter_ref: string };
  onChange(changes: Partial<{ status: Status; note: string; chapter_ref: string }>): void;
  withChapter?: boolean;
  index?: number;
}) {
  const id = useId();
  // Пока пользователь сам не нажал кнопку, блок открыт, если в нём что-то записано.
  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = toggled ?? Boolean(value.note || value.chapter_ref);
  const setOpen = (next: (current: boolean) => boolean) => setToggled(next(open));
  return (
    <li className="border-b border-line py-3 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 basis-72">
          <p className="text-[15px] leading-snug text-ink">
            {index != null && <span className="mr-1.5 tabular-nums text-slate-400">{index}.</span>}
            {text} <Clause>{clause}</Clause>
          </p>
          {hint && <p className="mt-1 text-[13.5px] leading-snug text-slate-500">{hint}</p>}
        </div>
        <div className="flex items-center gap-1">
          <StatusSwitch value={value.status} onChange={(status) => onChange({ status })} label={text} />
          <Button small variant="ghost" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
            {open ? "Скрыть" : "Заметка"}
          </Button>
        </div>
      </div>
      {open && (
        <div id={id} className={cx("mt-2 grid gap-2", withChapter && "sm:grid-cols-[1fr_14rem]")}>
          <CommitTextarea
            rows={2}
            aria-label={`Заметка: ${text}`}
            placeholder="Заметка"
            value={value.note}
            onCommit={(note) => onChange({ note })}
          />
          {withChapter && (
            <CommitInput
              aria-label={`Где раскрыто: ${text}`}
              placeholder="Где раскрыто: гл. 1, п. 1.2"
              value={value.chapter_ref}
              onCommit={(chapter_ref) => onChange({ chapter_ref })}
            />
          )}
        </div>
      )}
    </li>
  );
}

/** Строка текста, которую студент переносит в Word, с кнопкой копирования. */
export function CopyLine({ text, serif = true }: { text: string; serif?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-lg border border-line bg-paper/60 px-3 py-1.5">
      <span className={cx("min-w-0 break-words", serif ? "docline" : "text-[15px]")}>{text}</span>
      <CopyButton text={text} />
    </div>
  );
}

export { cx };
