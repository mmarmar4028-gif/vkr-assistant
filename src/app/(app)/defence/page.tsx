"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, Clause, CommitInput, CommitTextarea, Loading, Notice, PageHeader, cx } from "@/components/ui";
import { useKeyedRows } from "@/lib/hooks";
import type { DefenceNote } from "@/lib/types";
import { DEFENCE } from "@/requirements";

const TOTAL = DEFENCE.talkMinutes * 60;

function clock(seconds: number): string {
  const s = Math.abs(Math.trunc(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function Timer() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startedAt = useRef(0);
  const base = useRef(0);

  useEffect(() => {
    if (!running) return;
    startedAt.current = Date.now();
    const id = setInterval(() => setElapsed(base.current + (Date.now() - startedAt.current) / 1000), 250);
    return () => {
      clearInterval(id);
      base.current += (Date.now() - startedAt.current) / 1000;
    };
  }, [running]);

  const left = TOTAL - elapsed;
  const over = left < 0;
  const share = Math.min(elapsed / TOTAL, 1);

  return (
    <Card title="Таймер доклада" clause={DEFENCE.talkClause}>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div>
          <p
            role="timer"
            aria-live="off"
            className={cx(
              "text-7xl font-semibold tabular-nums tracking-tight",
              over ? "text-red-700" : left <= 120 ? "text-amber-700" : "text-ink",
            )}
          >
            {over ? "+" : ""}
            {clock(left)}
          </p>
          <p className="mt-1 text-[15px] text-slate-600" aria-live="polite">
            {over
              ? "Время вышло — доклад длится дольше 15 минут."
              : elapsed === 0
                ? `На устный доклад отводится ${DEFENCE.talkMinutes} минут.`
                : left <= 120
                  ? "Осталось меньше двух минут — переходите к выводам."
                  : `Прошло ${clock(elapsed)}.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => setRunning((r) => !r)}>
            {running ? "Пауза" : elapsed > 0 ? "Продолжить" : "Начать репетицию"}
          </Button>
          <Button
            onClick={() => {
              setRunning(false);
              base.current = 0;
              setElapsed(0);
            }}
            disabled={elapsed === 0}
          >
            Сбросить
          </Button>
        </div>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200" aria-hidden>
        <div
          className={cx("h-full rounded-full transition-[width]", over ? "bg-red-600" : left <= 120 ? "bg-amber-500" : "bg-brand-500")}
          style={{ width: `${share * 100}%` }}
        />
      </div>
    </Card>
  );
}

export default function DefencePage() {
  const notes = useKeyedRows<DefenceNote>("defence_notes", "criterion_key");

  return (
    <>
      <PageHeader
        title="Подготовка к защите"
        clause="раздел IV; п. 5.3"
        lead="Отрепетируйте доклад по таймеру и оцените себя по критериям, которые учитывает комиссия."
      />

      <Timer />

      <Card className="mt-4" title="Памятка">
        <ul className="space-y-2">
          {DEFENCE.reminders.map((r) => (
            <li key={r.key}>
              <Notice kind={r.key === "devices" || r.key === "late" ? "warn" : "info"} clause={r.clause}>
                {r.text}
              </Notice>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-4" title="Самооценка по критериям" clause={DEFENCE.criteriaClause}>
        <p className="mb-2 text-[14.5px] text-slate-600">
          Под каждым критерием запишите, чем вы его подтверждаете, и вопросы, которые может задать комиссия.
        </p>
        {notes.loading ? (
          <Loading />
        ) : (
          <ol className="space-y-4">
            {DEFENCE.criteria.map((c, index) => {
              const note = notes.map[c.key];
              const questions = note?.questions ?? [];
              const setQuestions = (next: string[]) => notes.save(c.key, { questions: next });
              return (
                <li key={c.key} className="rounded-xl border border-line p-3.5">
                  <h3 className="text-[16px] font-semibold text-ink">
                    {index + 1}. {c.text.charAt(0).toUpperCase() + c.text.slice(1)} <Clause>{c.clause}</Clause>
                  </h3>
                  <div className="mt-2 grid gap-3 lg:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">Заметки</span>
                      <CommitTextarea rows={4} value={note?.notes ?? ""} onCommit={(v) => notes.save(c.key, { notes: v })} />
                    </label>
                    <div>
                      <span className="mb-1 block text-sm font-medium text-slate-700">Вероятные вопросы комиссии</span>
                      <ul className="space-y-1.5">
                        {questions.map((q, i) => (
                          <li key={`${i}-${q}`} className="flex gap-1.5">
                            <CommitInput
                              aria-label={`Вопрос ${i + 1}`}
                              value={q}
                              onCommit={(v) => setQuestions(questions.map((old, j) => (j === i ? v : old)))}
                              placeholder="Формулировка вопроса"
                            />
                            <Button small variant="danger" aria-label={`Удалить вопрос ${i + 1}`} onClick={() => setQuestions(questions.filter((_, j) => j !== i))}>
                              ✕
                            </Button>
                          </li>
                        ))}
                      </ul>
                      <Button small className="mt-1.5" onClick={() => setQuestions([...questions, ""])}>
                        + Добавить вопрос
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </>
  );
}
