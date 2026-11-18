"use client";

import { useState, type FormEvent } from "react";
import {
  Button,
  Card,
  CommitInput,
  CopyButton,
  Empty,
  Field,
  Input,
  Loading,
  Notice,
  PageHeader,
} from "@/components/ui";
import { aiStatement } from "@/lib/ai-statement";
import { todayISO } from "@/lib/format";
import { useProfile, useRows } from "@/lib/hooks";
import type { AiEntry } from "@/lib/types";
import { AI_STATEMENT } from "@/requirements";

export default function AiLogPage() {
  const { profile } = useProfile();
  const log = useRows<AiEntry>("ai_log", "used_on");
  const [date, setDate] = useState(() => todayISO());
  const [model, setModel] = useState("");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (log.loading) return <Loading />;

  const statement = aiStatement(profile.full_name.trim(), profile.topic_ru.trim(), log.rows);
  const statementText = [statement.heading, "", statement.opening, ...statement.models, statement.closing].join("\n");
  const rows = [...log.rows].sort((a, b) => (a.used_on ?? "").localeCompare(b.used_on ?? ""));

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!model.trim() || !purpose.trim()) return setError("Укажите модель и цель использования.");
    setError(null);
    await log.add({ used_on: date || null, model: model.trim(), purpose: purpose.trim() });
    setPurpose("");
  }

  return (
    <>
      <PageHeader
        title="Журнал использования ИИ"
        clause={AI_STATEMENT.clause}
        lead="Записывайте каждое обращение к генеративным моделям: дату, модель и цель. Из журнала формируется текст заявления по форме Приложения 4. Само приложение текст ВКР не генерирует."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <Card title="Новая запись">
            <form onSubmit={add} className="grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)]">
              <Field label="Дата">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Модель" required>
                <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Название и версия модели" />
              </Field>
              <Field label="Цель использования" required className="sm:col-span-2">
                <Input
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Например: проверка орфографии в главе 2"
                />
              </Field>
              {error && (
                <Notice kind="error" className="sm:col-span-2">
                  {error}
                </Notice>
              )}
              <div className="sm:col-span-2">
                <Button type="submit" variant="primary">
                  Добавить запись
                </Button>
              </div>
            </form>
          </Card>

          <Card title={`Записи (${rows.length})`}>
            {rows.length === 0 ? (
              <Empty>Записей нет — в заявлении будет указано, что технологии ИИ не использовались.</Empty>
            ) : (
              <ul>
                {rows.map((entry, i) => (
                  <li key={entry.id} className="grid gap-1.5 border-b border-line py-2.5 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                    <CommitInput
                      type="date"
                      aria-label={`Запись ${i + 1}: дата`}
                      value={entry.used_on ?? ""}
                      onCommit={(v) => log.patch(entry.id, { used_on: v || null })}
                    />
                    <CommitInput
                      aria-label={`Запись ${i + 1}: модель`}
                      value={entry.model}
                      onCommit={(v) => log.patch(entry.id, { model: v })}
                    />
                    <CommitInput
                      aria-label={`Запись ${i + 1}: цель`}
                      value={entry.purpose}
                      onCommit={(v) => log.patch(entry.id, { purpose: v })}
                    />
                    <Button small variant="danger" onClick={() => log.remove(entry.id)}>
                      Удалить
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card
          title="Текст заявления"
          clause={AI_STATEMENT.clause}
          actions={<CopyButton text={statementText} label="Скопировать текст" small={false} />}
        >
          <Notice kind={statement.used ? "info" : "ok"} className="mb-3">
            {statement.used
              ? `В журнале есть записи — используется вариант «${AI_STATEMENT.used}» с перечнем моделей и целей.`
              : `Журнал пуст — используется вариант «${AI_STATEMENT.notUsed}».`}
          </Notice>
          <div className="docline space-y-3 rounded-xl border border-line bg-white p-4">
            <p className="text-center font-bold">{statement.heading}</p>
            <p className="text-justify indent-8">{statement.opening}</p>
            {statement.models.map((line) => (
              <p key={line} className="text-justify indent-8">
                {line}
              </p>
            ))}
            <p className="text-justify indent-8">{statement.closing}</p>
          </div>
          <p className="mt-3 text-[13.5px] leading-snug text-slate-500">
            Заявление включается только в два подписанных экземпляра. Оно автоматически попадает в шаблон Word; ФИО и
            тема берутся из профиля.
          </p>
        </Card>
      </div>
    </>
  );
}
