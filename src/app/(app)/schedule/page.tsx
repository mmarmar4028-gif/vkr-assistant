"use client";

import { useState } from "react";
import { Button, Card, Clause, CommitInput, CommitTextarea, Empty, Loading, Notice, PageHeader } from "@/components/ui";
import { fileStem, scheduleDocument, toBlob } from "@/lib/docx/exports";
import { downloadBlob, plural } from "@/lib/format";
import { notifyError, useProfile, useRows } from "@/lib/hooks";
import type { Meeting, ScheduleItem } from "@/lib/types";
import { SCHEDULE } from "@/requirements";

export default function SchedulePage() {
  const { profile } = useProfile();
  const items = useRows<ScheduleItem>("schedule_items", "position");
  const meetings = useRows<Meeting>("meetings", "meeting_date");
  const [busy, setBusy] = useState(false);

  if (items.loading || meetings.loading) return <Loading />;

  const sorted = [...items.rows].sort((a, b) => a.position - b.position);
  const inPerson = meetings.rows.filter((m) => m.in_person && m.meeting_date).length;
  const enough = inPerson >= SCHEDULE.minInPersonMeetings;

  async function move(index: number, direction: -1 | 1) {
    const other = sorted[index + direction];
    const current = sorted[index];
    if (!other) return;
    await Promise.all([
      items.patch(current.id, { position: other.position }),
      items.patch(other.id, { position: current.position }),
    ]);
  }

  async function exportDocx() {
    setBusy(true);
    try {
      downloadBlob(await toBlob(scheduleDocument(profile, sorted)), `План-график_${fileStem(profile)}.docx`);
    } catch (e) {
      notifyError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="План-график подготовки ВКР"
        clause={SCHEDULE.clause}
        lead="План-график утверждается научным руководителем в начале работы. Копия с отметками сдаётся в учебный отдел в феврале, оригинал — вместе с ВКР."
      />

      <Card
        title="Этапы работы"
        actions={
          <Button variant="primary" onClick={exportDocx} disabled={busy}>
            {busy ? "Готовим файл…" : "Скачать .docx по форме Прил. 9"}
          </Button>
        }
      >
        <Notice className="mb-3" clause={SCHEDULE.bringRule.clause}>
          {SCHEDULE.bringRule.text} В файле Word столбцы «{SCHEDULE.form.columns[3]}» и «{SCHEDULE.form.columns[4]}»
          остаются пустыми — их заполняет руководитель от руки.
        </Notice>

        {sorted.length === 0 ? (
          <Empty>Пока нет ни одного этапа. Добавьте блоки работы и сроки.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-separate border-spacing-y-1.5 text-[15px]">
              <thead>
                <tr className="text-left text-[13px] font-medium text-slate-500">
                  <th className="w-10 px-1">№</th>
                  <th className="px-1">Наименование блока (раздела) и виды работ</th>
                  <th className="w-40 px-1">Срок выполнения</th>
                  <th className="w-40 px-1">Фактическая дата встречи</th>
                  <th className="w-24 px-1">Выполнено</th>
                  <th className="w-36 px-1" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((item, index) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-1 pt-2 tabular-nums text-slate-500">{index + 1}.</td>
                    <td className="px-1">
                      <CommitInput
                        aria-label={`Этап ${index + 1}: название`}
                        value={item.title}
                        onCommit={(title) => items.patch(item.id, { title })}
                        placeholder="Например: Глава 1 — анализ организации"
                      />
                    </td>
                    <td className="px-1">
                      <CommitInput
                        type="date"
                        aria-label={`Этап ${index + 1}: срок выполнения`}
                        value={item.due_date ?? ""}
                        onCommit={(v) => items.patch(item.id, { due_date: v || null })}
                      />
                    </td>
                    <td className="px-1">
                      <CommitInput
                        type="date"
                        aria-label={`Этап ${index + 1}: фактическая дата встречи`}
                        value={item.actual_date ?? ""}
                        onCommit={(v) => items.patch(item.id, { actual_date: v || null })}
                      />
                    </td>
                    <td className="px-1 pt-2 text-center">
                      <input
                        type="checkbox"
                        className="size-5"
                        aria-label={`Этап ${index + 1}: выполнен`}
                        checked={item.done}
                        onChange={(e) => items.patch(item.id, { done: e.target.checked })}
                      />
                    </td>
                    <td className="whitespace-nowrap px-1 pt-1 text-right">
                      <Button small variant="ghost" aria-label="Переместить выше" disabled={index === 0} onClick={() => move(index, -1)}>
                        ↑
                      </Button>
                      <Button
                        small
                        variant="ghost"
                        aria-label="Переместить ниже"
                        disabled={index === sorted.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        ↓
                      </Button>
                      <Button small variant="danger" onClick={() => items.remove(item.id)}>
                        Удалить
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Button
          className="mt-3"
          onClick={() =>
            items.add({
              position: sorted.reduce((max, i) => Math.max(max, i.position), 0) + 1,
              title: "",
              due_date: null,
              actual_date: null,
              done: false,
            })
          }
        >
          + Добавить этап
        </Button>
      </Card>

      <Card
        className="mt-4"
        title="Очные встречи с научным руководителем"
        actions={
          <span className="text-[15px] text-slate-700">
            Проведено очных: <strong className="text-xl tabular-nums text-ink">{inPerson}</strong>
          </span>
        }
      >
        <Notice kind={enough ? "ok" : "warn"} clause={SCHEDULE.minMeetingsRule.clause} className="mb-3">
          {enough
            ? `Проведено ${inPerson} ${plural(inPerson, ["очная встреча", "очные встречи", "очных встреч"])} — минимум выполнен.`
            : `Очных встреч меньше двух. ${SCHEDULE.minMeetingsRule.text}`}
        </Notice>
        <p className="mb-3 text-[14.5px] text-slate-600">
          {SCHEDULE.summaryRule.text} <Clause>{SCHEDULE.summaryRule.clause}</Clause>
        </p>

        {meetings.rows.length === 0 ? (
          <Empty>Встреч пока нет.</Empty>
        ) : (
          <ul className="space-y-3">
            {meetings.rows.map((m, index) => (
              <li key={m.id} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-slate-500">Встреча {index + 1}</span>
                  <CommitInput
                    type="date"
                    className="w-44!"
                    aria-label={`Встреча ${index + 1}: дата`}
                    value={m.meeting_date ?? ""}
                    onCommit={(v) => meetings.patch(m.id, { meeting_date: v || null })}
                  />
                  <label className="flex items-center gap-2 text-[15px]">
                    <input
                      type="checkbox"
                      className="size-4.5"
                      checked={m.in_person}
                      onChange={(e) => meetings.patch(m.id, { in_person: e.target.checked })}
                    />
                    очная
                  </label>
                  {!m.meeting_date && <span className="text-[13px] text-amber-800">укажите дату, чтобы встреча учитывалась</span>}
                  <Button small variant="danger" className="ml-auto" onClick={() => meetings.remove(m.id)}>
                    Удалить
                  </Button>
                </div>
                <label className="mt-2 block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">{SCHEDULE.summaryLabel}</span>
                  <CommitTextarea value={m.summary} onCommit={(summary) => meetings.patch(m.id, { summary })} rows={3} />
                </label>
              </li>
            ))}
          </ul>
        )}
        <Button className="mt-3" onClick={() => meetings.add({ meeting_date: null, in_person: true, summary: "" })}>
          + Добавить встречу
        </Button>
      </Card>
    </>
  );
}
