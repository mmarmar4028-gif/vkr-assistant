"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Card, Clause, Field, Loading, Notice, NumberInput, PageHeader, Select } from "@/components/ui";
import { buildBibliography, type Source } from "@/lib/bibliography";
import { fileStem } from "@/lib/docx/exports";
import { buildTemplateBlocks, findNames, templateBlob, type NameHit, type TemplateInput } from "@/lib/docx/template";
import { downloadBlob } from "@/lib/format";
import { notifyError, useProfile, useRows } from "@/lib/hooks";
import type { AiEntry } from "@/lib/types";
import { ABBREVIATIONS_RULE, ANONYMOUS_RULES, FORMATTING, LIMITS, STRUCTURE } from "@/requirements";

const link = "font-medium text-brand-700 underline underline-offset-2";

export default function TemplatePage() {
  const { profile, saveSettings, loading } = useProfile();
  const sources = useRows<Source>("sources");
  const aiLog = useRows<AiEntry>("ai_log", "used_on");
  const [busy, setBusy] = useState<"named" | "anonymous" | null>(null);
  const [hits, setHits] = useState<NameHit[] | null>(null);

  const bibliography = useMemo(() => buildBibliography(sources.rows).map((e) => e.text), [sources.rows]);

  if (loading || sources.loading || aiLog.loading) return <Loading />;

  const s = profile.settings;
  const chapters = s.chapters ?? 3;
  const indentCm = s.indentCm ?? FORMATTING.indent.defaultCm;
  const abbreviations = Boolean(s.abbreviations);

  const input = (anonymous: boolean): TemplateInput => ({
    profile,
    anonymous,
    chapters,
    indentCm,
    abbreviations,
    bibliography,
    aiLog: aiLog.rows,
  });

  async function download(anonymous: boolean) {
    setBusy(anonymous ? "anonymous" : "named");
    try {
      const blob = await templateBlob(input(anonymous));
      const name = anonymous ? `ВКР_анонимный_${profile.record_book.trim() || "экземпляр"}` : `ВКР_${fileStem(profile)}`;
      downloadBlob(blob, `${name}.docx`);
    } catch (e) {
      notifyError(e);
    } finally {
      setBusy(null);
    }
  }

  function anonymousClick() {
    const found = findNames(buildTemplateBlocks(input(true)), profile);
    setHits(found);
    if (found.length === 0 && profile.record_book.trim()) download(true);
  }

  const missing = [
    !profile.full_name.trim() && "ФИО",
    !profile.topic_ru.trim() && "тема ВКР",
    !profile.supervisor_name.trim() && "научный руководитель",
  ].filter(Boolean) as string[];

  const rules = [
    { text: `Лист A4 (${FORMATTING.page.widthMm} x ${FORMATTING.page.heightMm} мм). ${FORMATTING.page.oneSided}`, clause: FORMATTING.page.clause },
    {
      text: `Шрифт ${FORMATTING.font.name}, размер ${FORMATTING.font.sizePt}, интервал 1,5, выравнивание по ширине.`,
      clause: FORMATTING.font.clause,
    },
    {
      text: `Поля: верхнее и нижнее — ${FORMATTING.marginsMm.top} мм, левое — ${FORMATTING.marginsMm.left} мм, правое — ${FORMATTING.marginsMm.right} мм.`,
      clause: FORMATTING.marginsMm.clause,
    },
    FORMATTING.headings,
    FORMATTING.numbering,
    FORMATTING.tocTitle,
    FORMATTING.newPage,
    FORMATTING.pageNumbers,
    FORMATTING.appendices,
  ];

  return (
    <>
      <PageHeader
        title="Шаблон Word"
        clause="Прил. 2, 3, 4, 5, 7"
        lead="Файл .docx с настроенными стилями и вашими данными: титульный лист, заявления, аннотации, оглавление, главы, список литературы и приложение — в порядке п. 2.6."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
        <div className="space-y-4">
          <Card title="Настройки шаблона">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={<>Количество глав <Clause>{LIMITS.chapters.clause}</Clause></>} hint={LIMITS.chapters.text}>
                <Select value={chapters} onChange={(e) => saveSettings({ chapters: Number(e.target.value) })}>
                  {[2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label={<>Отступ первой строки, см <Clause>{FORMATTING.indent.clause}</Clause></>}
                hint={FORMATTING.indent.note}
              >
                <NumberInput
                  value={indentCm}
                  onCommit={(v) => saveSettings({ indentCm: v != null && v >= 0 && v <= 5 ? v : FORMATTING.indent.defaultCm })}
                />
              </Field>
              <label className="flex items-start gap-2.5 text-[15px] sm:col-span-2">
                <input
                  type="checkbox"
                  className="mt-1 size-4.5"
                  checked={abbreviations}
                  onChange={(e) => saveSettings({ abbreviations: e.target.checked })}
                />
                <span>
                  Добавить раздел «Список используемых сокращений»
                  <span className="mt-0.5 block text-[13.5px] leading-snug text-slate-500">
                    {ABBREVIATIONS_RULE.text} <Clause>{ABBREVIATIONS_RULE.clause}</Clause>
                  </span>
                </span>
              </label>
            </div>
          </Card>

          <Card title="Экземпляры с фамилиями" clause="п. 3.1.13">
            <p className="text-[15px] leading-relaxed text-slate-700">
              Два печатных экземпляра и файл .docx на электронном носителе: титульный лист с фамилиями и заявления по
              формам Прил. 3 и Прил. 4. Список литературы ({bibliography.length}) и заявление об ИИ ({aiLog.rows.length}{" "}
              записей в журнале) подставляются автоматически.
            </p>
            {missing.length > 0 && (
              <Notice kind="warn" className="mt-3">
                В профиле не заполнено: {missing.join(", ")}. В шаблоне на этих местах останутся подсказки.{" "}
                <Link href="/profile" className={link}>
                  Заполнить профиль
                </Link>
              </Notice>
            )}
            <Button variant="primary" className="mt-3" onClick={() => download(false)} disabled={busy !== null}>
              {busy === "named" ? "Готовим файл…" : "Скачать шаблон ВКР"}
            </Button>
          </Card>

          <Card title="Анонимный экземпляр" clause="пп. 3.1.13, 3.1.15, 3.3.4">
            <ul className="list-disc space-y-1 pl-5 text-[15px] leading-snug text-slate-700">
              {ANONYMOUS_RULES.map((r) => (
                <li key={r.key}>
                  {r.text} <Clause>{r.clause}</Clause>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[14px] text-slate-600">
              В файле: номер зачётной книжки вместо имени, без руководителя, без заявлений. Перед скачиванием текст
              шаблона проверяется на упоминания студента и руководителя.
            </p>
            {!profile.record_book.trim() && (
              <Notice kind="warn" className="mt-3">
                Номер зачётной книжки не указан — на титульном листе останется подсказка.{" "}
                <Link href="/profile" className={link}>
                  Указать в профиле
                </Link>
              </Notice>
            )}
            {hits && hits.length > 0 && (
              <Notice kind="error" className="mt-3">
                <p className="font-semibold">В тексте шаблона найдены упоминания — проверьте перед сдачей:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {hits.map((h, i) => (
                    <li key={i}>
                      {h.who === "student" ? "Студент" : "Научный руководитель"} («{h.name}») — раздел «{h.section}»:{" "}
                      <span className="docline text-[15px]!">{h.snippet}</span>
                    </li>
                  ))}
                </ul>
              </Notice>
            )}
            {hits && hits.length === 0 && (
              <Notice kind="ok" className="mt-3">
                В тексте шаблона упоминаний студента и руководителя не найдено. Когда допишете работу, проверьте сам
                текст ВКР поиском в Word — приложение видит только шаблон.
              </Notice>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" onClick={anonymousClick} disabled={busy !== null}>
                {busy === "anonymous" ? "Готовим файл…" : "Скачать анонимный экземпляр"}
              </Button>
              {hits && (hits.length > 0 || !profile.record_book.trim()) && (
                <Button onClick={() => download(true)} disabled={busy !== null}>
                  Всё равно скачать
                </Button>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Что уже настроено в файле" clause="Прил. 7">
            <ul className="space-y-2 text-[14.5px] leading-snug text-slate-700">
              {rules.map((r) => (
                <li key={r.text}>
                  {r.text} <Clause>{r.clause}</Clause>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Обратите внимание">
            <div className="space-y-2">
              <Notice kind="warn" clause={FORMATTING.page.clause}>
                {FORMATTING.page.note}
              </Notice>
              <Notice kind="warn" clause={FORMATTING.pageNumbers.clause}>
                {FORMATTING.pageNumbers.note}
              </Notice>
              <Notice kind="warn" clause={FORMATTING.bibliographyTitleNote.clause}>
                {FORMATTING.bibliographyTitleNote.text}
              </Notice>
              <Notice>
                Оглавление — это поле Word. После того как допишете текст, щёлкните по оглавлению и нажмите F9 (на Mac —
                правая кнопка мыши → «Обновить поле»), чтобы обновились названия и номера страниц. При открытии файла
                Word может спросить, обновить ли поля, — ответьте «Да».
              </Notice>
            </div>
          </Card>

          <Card title="Порядок элементов в шаблоне" clause="п. 2.6">
            <ol className="list-decimal space-y-0.5 pl-5 text-[14.5px] text-slate-700">
              {STRUCTURE.map((r) => (
                <li key={r.key}>{r.text}</li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
