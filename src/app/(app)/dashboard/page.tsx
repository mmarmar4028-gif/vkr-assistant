"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, Clause, CommitInput, Field, Loading, Notice, PageHeader, Progress, cx } from "@/components/ui";
import { addDays, daysBetween, formatDate, plural, todayISO } from "@/lib/format";
import { useKeyedRows, useProfile } from "@/lib/hooks";
import type { DeadlineState } from "@/lib/types";
import { DEADLINES, REVIEW_REMINDER } from "@/requirements";

const DAYS: [string, string, string] = ["день", "дня", "дней"];

export default function DashboardPage() {
  const { profile } = useProfile();
  const { map, save, loading } = useKeyedRows<DeadlineState>("deadline_states", "stage_key");
  const [today] = useState(() => todayISO());

  if (loading) return <Loading />;

  const stages = DEADLINES.map((stage) => {
    const state = map[stage.key];
    const exact = stage.exactByOrder ? (state?.exact_date ?? null) : null;
    const target = exact ?? stage.date;
    const last = exact ?? stage.dateEnd ?? stage.date;
    return {
      stage,
      done: Boolean(state?.done),
      exact,
      target,
      daysToTarget: daysBetween(today, target),
      daysToLast: daysBetween(today, last),
      outOfPeriod: Boolean(exact && stage.dateEnd && (exact < stage.date || exact > stage.dateEnd)),
      items: stage.items.filter((i) => !i.onlyFormats || !profile.format || i.onlyFormats.includes(profile.format)),
    };
  });

  const upcoming = stages.filter((s) => !s.done && s.daysToLast >= 0).sort((a, b) => a.daysToTarget - b.daysToTarget);
  const next = upcoming[0];
  const overdue = stages.filter((s) => !s.done && s.daysToLast < 0);
  const submission = stages.find((s) => s.stage.key === "submission")!;
  const handOver = addDays(submission.target, -14);

  return (
    <>
      <PageHeader
        title="Контрольные сроки"
        clause="Прил. 8"
        lead="Все этапы подготовки ВКР на 2026-2027 учебный год. Отмечайте выполненные этапы — отметки сохраняются."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="bg-brand-700! text-white">
          {next ? (
            <>
              <p className="text-sm font-medium text-brand-100">Ближайший срок</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="text-6xl font-semibold tabular-nums tracking-tight">
                  {Math.max(next.daysToTarget, 0)}
                </span>
                <span className="text-xl">{plural(Math.max(next.daysToTarget, 0), DAYS)}</span>
              </p>
              <p className="mt-2 text-lg font-medium">
                {next.daysToTarget <= 0 && next.stage.dateEnd && !next.exact
                  ? `Идёт период: ${formatDate(next.stage.date)} – ${formatDate(next.stage.dateEnd)}`
                  : next.daysToTarget === 0
                    ? "Срок — сегодня"
                    : `до ${formatDate(next.target)}`}
              </p>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[15px] text-brand-50">
                {next.items.map((i) => (
                  <li key={i.text}>{i.text}</li>
                ))}
              </ul>
              {next.stage.submitTo && <p className="mt-2 text-sm text-brand-100">Кому: {next.stage.submitTo}</p>}
            </>
          ) : (
            <p className="text-lg">Все этапы отмечены как выполненные или их сроки прошли.</p>
          )}
        </Card>

        <Card title="Выполнение этапов">
          <Progress done={stages.filter((s) => s.done).length} total={stages.length} />
          {overdue.length > 0 && (
            <Notice kind="warn" className="mt-3">
              Срок прошёл, а этап не отмечен: {overdue.map((s) => formatDate(s.stage.dateEnd ?? s.stage.date)).join(", ")}.
              Если этап выполнен — поставьте отметку ниже.
            </Notice>
          )}
          <Notice className="mt-3" clause={REVIEW_REMINDER.clause}>
            {REVIEW_REMINDER.text}
          </Notice>
          <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
            Расчёт: чтобы уложиться в обе недели до сдачи ({formatDate(submission.target)}
            {submission.exact ? "" : ", начало периода"}), законченный вариант стоит передать руководителю не позднее{" "}
            <strong className="text-ink">{formatDate(handOver)}</strong>.
          </p>
          {!profile.format && (
            <p className="mt-2 text-[14px] text-slate-600">
              Формат ВКР ещё не выбран —{" "}
              <Link href="/profile" className="font-medium text-brand-700 underline underline-offset-2">
                заполните профиль
              </Link>
              , чтобы видеть только свои документы.
            </p>
          )}
        </Card>
      </div>

      <ol className="mt-5 space-y-3">
        {stages.map((s, index) => {
          const { stage } = s;
          const late = !s.done && s.daysToLast < 0;
          return (
            <li
              key={stage.key}
              className={cx(
                "rounded-2xl border bg-white p-4 shadow-xs sm:p-5",
                s.done ? "border-emerald-200" : late ? "border-amber-300" : "border-line",
              )}
            >
              <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-5"
                    checked={s.done}
                    onChange={(e) => save(stage.key, { done: e.target.checked })}
                    aria-label={`Этап выполнен: ${stage.label}`}
                  />
                  <span>
                    <span className="block text-sm text-slate-500">Этап {index + 1}</span>
                    <span className={cx("text-lg font-semibold", s.done && "text-slate-500 line-through")}>
                      {stage.label}
                    </span>
                  </span>
                </label>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {s.done ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-sm font-medium text-emerald-900">
                      выполнено
                    </span>
                  ) : late ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-medium text-amber-950">
                      срок прошёл {Math.abs(s.daysToLast)} {plural(Math.abs(s.daysToLast), DAYS)} назад
                    </span>
                  ) : (
                    <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-sm font-medium text-brand-800">
                      {s.daysToTarget > 0
                        ? `через ${s.daysToTarget} ${plural(s.daysToTarget, DAYS)}`
                        : s.daysToLast === 0 || !stage.dateEnd
                          ? "сегодня"
                          : "идёт период"}
                    </span>
                  )}
                  <Clause>{stage.clause}</Clause>
                </div>
              </div>

              <div className="mt-3 pl-8">
                <ul className="list-disc space-y-1 pl-5 text-[15px] leading-snug text-slate-800">
                  {s.items.map((i) => (
                    <li key={i.text}>{i.text}</li>
                  ))}
                </ul>
                {stage.submitTo && (
                  <p className="mt-2 text-[14.5px] text-slate-600">
                    Кому сдаётся: <span className="font-medium text-ink">{stage.submitTo}</span>
                  </p>
                )}
                {stage.note && (
                  <Notice kind={stage.noteKind ?? "info"} className="mt-2">
                    {stage.note}
                    {stage.lastDate && daysBetween(today, stage.lastDate) >= 0 && (
                      <>
                        {" "}
                        До {formatDate(stage.lastDate)} осталось {daysBetween(today, stage.lastDate)}{" "}
                        {plural(daysBetween(today, stage.lastDate), DAYS)}.
                      </>
                    )}
                  </Notice>
                )}
                {stage.exactByOrder && (
                  <div className="mt-3 max-w-xs">
                    <Field
                      label="Точная дата по Приказу декана"
                      hint={
                        s.outOfPeriod
                          ? undefined
                          : `Период в программе: ${formatDate(stage.date)} – ${formatDate(stage.dateEnd)}.`
                      }
                    >
                      <CommitInput
                        type="date"
                        value={s.exact ?? ""}
                        onCommit={(v) => save(stage.key, { exact_date: v || null })}
                      />
                    </Field>
                    {s.outOfPeriod && (
                      <p className="mt-1 text-[13px] text-amber-800">
                        Дата вне периода, указанного в программе ({formatDate(stage.date)} – {formatDate(stage.dateEnd)}
                        ). Проверьте.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
