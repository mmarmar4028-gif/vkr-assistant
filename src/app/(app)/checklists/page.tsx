"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Card,
  ChecklistRow,
  Clause,
  Field,
  Loading,
  Notice,
  NumberInput,
  PageHeader,
  Progress,
  Textarea,
  cx,
} from "@/components/ui";
import { countWords } from "@/lib/format";
import { useChecklist, useProfile } from "@/lib/hooks";
import type { PageCounts } from "@/lib/types";
import {
  ABBREVIATIONS_RULE,
  CONCLUSION_CONTENT,
  FORMATS,
  FORMAT_CONTENT,
  INTRO_CONTENT,
  JUSTIFICATION_SECTIONS,
  LIMITS,
  OTHER_FORMAT_NOTE,
  STRUCTURE,
  type Rule,
} from "@/requirements";

const TABS = [
  { key: "structure", label: "Структура" },
  { key: "volume", label: "Объём" },
  { key: "intro", label: "Введение и заключение" },
  { key: "content", label: "Содержание по формату" },
  { key: "words", label: "Счётчик слов" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function Checklist({ scope, rules, numbered, withChapter = true }: { scope: string; rules: Rule[]; numbered?: boolean; withChapter?: boolean }) {
  const list = useChecklist(scope);
  if (list.loading) return <Loading />;
  return (
    <>
      <Progress done={list.doneCount(rules.map((r) => r.key))} total={rules.length} />
      <ul className="mt-2">
        {rules.map((rule, i) => (
          <ChecklistRow
            key={rule.key}
            index={numbered ? i + 1 : undefined}
            text={rule.text}
            hint={rule.hint}
            clause={rule.clause}
            withChapter={withChapter}
            value={list.get(rule.key)}
            onChange={(changes) => list.save(rule.key, changes)}
          />
        ))}
      </ul>
    </>
  );
}

function StructureTab() {
  return (
    <Card title="Структурные элементы — строго в этом порядке" clause="п. 2.6">
      <Checklist scope="structure" rules={STRUCTURE} numbered withChapter={false} />
      <Notice className="mt-3" clause={ABBREVIATIONS_RULE.clause}>
        {ABBREVIATIONS_RULE.text}
      </Notice>
    </Card>
  );
}

type Verdict = { kind: "ok" | "warn" | "none"; text: string };

function VolumeTab() {
  const { profile, saveSettings } = useProfile();
  const pages: PageCounts = profile.settings.pages ?? {};
  const set = (changes: Partial<PageCounts>) => saveSettings({ pages: { ...pages, ...changes } });

  const range = (v: number | null | undefined, min: number | null, max: number, unit = "стр."): Verdict => {
    if (v == null) return { kind: "none", text: "не указано" };
    if (min != null && v < min) return { kind: "warn", text: `меньше минимума на ${+(min - v).toFixed(1)} ${unit}` };
    if (v > max) return { kind: "warn", text: `превышение на ${+(v - max).toFixed(1)} ${unit}` };
    return { kind: "ok", text: "в норме" };
  };

  const share = pages.total && pages.appendices != null ? pages.appendices / pages.total : null;
  const shareVerdict: Verdict =
    share == null
      ? { kind: "none", text: "укажите страницы приложений и общий объём" }
      : share > LIMITS.appendicesShare.max
        ? { kind: "warn", text: `приложения занимают ${Math.round(share * 100)}% — больше 1/3` }
        : { kind: "ok", text: `приложения занимают ${Math.round(share * 100)}% — в норме` };

  const rows: { key: keyof PageCounts; label: string; rule: { text: string; clause: string }; verdict: Verdict; unit?: string }[] = [
    {
      key: "main",
      label: "Основной текст, стр.",
      rule: LIMITS.mainText,
      verdict: range(pages.main, LIMITS.mainText.min, LIMITS.mainText.max),
    },
    { key: "intro", label: "Введение, стр.", rule: LIMITS.intro, verdict: range(pages.intro, null, LIMITS.intro.max) },
    {
      key: "conclusion",
      label: "Заключение, стр.",
      rule: LIMITS.conclusion,
      verdict: range(pages.conclusion, null, LIMITS.conclusion.max),
    },
    {
      key: "chapters",
      label: "Количество глав",
      rule: LIMITS.chapters,
      verdict: range(pages.chapters, LIMITS.chapters.min, LIMITS.chapters.max, "гл."),
    },
    {
      key: "abstractRu",
      label: "Аннотация на русском, стр.",
      rule: LIMITS.abstractPages,
      verdict: range(pages.abstractRu, null, LIMITS.abstractPages.max),
    },
    {
      key: "abstractEn",
      label: "Аннотация на английском, стр.",
      rule: LIMITS.abstractPages,
      verdict: range(pages.abstractEn, null, LIMITS.abstractPages.max),
    },
    { key: "appendices", label: "Приложения, стр.", rule: LIMITS.appendicesShare, verdict: shareVerdict },
    { key: "total", label: "Общий объём ВКР, стр.", rule: LIMITS.appendicesShare, verdict: shareVerdict },
  ];

  const abbreviations = pages.abbreviations;

  return (
    <Card title="Объём работы">
      <p className="mb-3 text-[14.5px] text-slate-600">
        Количество страниц введите вручную после проверки в Word. Приложение сравнит его с ограничениями программы.
      </p>
      <ul>
        {rows.map((row) => (
          <li key={row.key} className="grid items-center gap-x-4 gap-y-1 border-b border-line py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,14rem)]">
            <div>
              <p className="font-medium text-ink">{row.label}</p>
              <p className="text-[13.5px] leading-snug text-slate-500">
                {row.rule.text} <Clause>{row.rule.clause}</Clause>
              </p>
            </div>
            <NumberInput aria-label={row.label} value={pages[row.key]} onCommit={(v) => set({ [row.key]: v })} />
            <p
              className={cx(
                "text-[14.5px] font-medium",
                row.verdict.kind === "ok" && "text-emerald-700",
                row.verdict.kind === "warn" && "text-red-700",
                row.verdict.kind === "none" && "font-normal text-slate-400",
              )}
            >
              {row.verdict.kind === "ok" ? "✓ " : row.verdict.kind === "warn" ? "⚠ " : ""}
              {row.verdict.text}
            </p>
          </li>
        ))}
        <li className="grid items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,14rem)]">
          <div>
            <p className="font-medium text-ink">Сколько буквенных аббревиатур вы вводите сами</p>
            <p className="text-[13.5px] leading-snug text-slate-500">
              {ABBREVIATIONS_RULE.text} <Clause>{ABBREVIATIONS_RULE.clause}</Clause>
            </p>
          </div>
          <NumberInput aria-label="Количество аббревиатур" value={abbreviations} onCommit={(v) => set({ abbreviations: v })} />
          <p className={cx("text-[14.5px]", abbreviations != null && abbreviations >= 5 ? "font-medium text-amber-800" : "text-slate-400")}>
            {abbreviations == null
              ? "не указано"
              : abbreviations >= 5
                ? "рекомендуется раздел «Список используемых сокращений»"
                : "раздел не обязателен"}
          </p>
        </li>
      </ul>
    </Card>
  );
}

function IntroTab() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Введение должно содержать" clause="п. 2.8">
        <Checklist scope="intro" rules={INTRO_CONTENT} withChapter={false} />
        <Notice className="mt-3" clause={LIMITS.intro.clause}>
          {LIMITS.intro.text}
        </Notice>
      </Card>
      <Card title="Заключение должно содержать" clause="п. 2.10">
        <Checklist scope="conclusion" rules={CONCLUSION_CONTENT} withChapter={false} />
        <Notice className="mt-3" clause={LIMITS.conclusion.clause}>
          {LIMITS.conclusion.text} Допущения и риски удобно собирать в разделе{" "}
          <Link href="/assumptions" className="font-medium underline underline-offset-2">
            «Допущения и риски»
          </Link>
          .
        </Notice>
      </Card>
    </div>
  );
}

function ContentTab() {
  const { profile } = useProfile();
  const format = profile.format;
  if (!format) {
    return (
      <Notice kind="warn">
        Формат ВКР не выбран. Укажите его в{" "}
        <Link href="/profile" className="font-medium underline underline-offset-2">
          профиле
        </Link>{" "}
        — от формата зависит перечень обязательных элементов содержания.
      </Notice>
    );
  }
  const label = FORMATS.find((f) => f.key === format)!.label;
  if (format === "other") {
    return (
      <Card title={`Формат: ${label}`}>
        <Notice clause={OTHER_FORMAT_NOTE.clause}>{OTHER_FORMAT_NOTE.text}</Notice>
      </Card>
    );
  }
  return (
    <Card title={`Формат: ${label}. Работа должна содержать`} clause="п. 2.3">
      <p className="mb-3 text-[14.5px] text-slate-600">
        Для каждого элемента отметьте статус, оставьте заметку и укажите, в какой главе он раскрыт.
      </p>
      <Checklist key={format} scope={`content-${format}`} rules={FORMAT_CONTENT[format]} />
    </Card>
  );
}

function WordCounter({ title, clause, limit, lang, hint }: { title: string; clause: string; limit: number; lang?: string; hint?: string }) {
  const [text, setText] = useState("");
  const words = countWords(text);
  const over = words > limit;
  return (
    <Card title={title} clause={clause}>
      <Field label="Вставьте текст" hint={hint ?? "Текст нигде не сохраняется — он нужен только для подсчёта."}>
        <Textarea
          rows={9}
          lang={lang}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={cx(over && "border-red-400! bg-red-50! focus:ring-red-100!")}
          aria-invalid={over}
        />
      </Field>
      <p className={cx("mt-2 text-[15px] font-medium tabular-nums", over ? "text-red-700" : "text-emerald-700")} aria-live="polite">
        {words} из {limit} слов
        {over ? ` — превышение на ${words - limit}` : words > 0 ? " — в норме" : ""}
      </p>
    </Card>
  );
}

function WordsTab() {
  return (
    <>
      <p className="mb-3 text-[14.5px] text-slate-600">
        Слова считаются так же, как в Word: слово — любая последовательность символов между пробелами.
      </p>
      <div className="grid gap-4 xl:grid-cols-2">
        <WordCounter title="Аннотация на русском языке" clause={LIMITS.abstractWords.clause} limit={LIMITS.abstractWords.max} />
        <WordCounter
          title="Аннотация на английском языке"
          clause={LIMITS.abstractWords.clause}
          limit={LIMITS.abstractWords.max}
          lang="en"
        />
        <div className="xl:col-span-2">
          <WordCounter
            title="Обоснование выбора темы ВКР"
            clause={LIMITS.justificationWords.clause}
            limit={LIMITS.justificationWords.max}
          />
          <Card className="mt-4" title="Разделы Обоснования выбора темы" clause="п. 3.1.6">
            <ul className="list-disc space-y-1 pl-5 text-[15px] text-slate-800">
              {JUSTIFICATION_SECTIONS.map((s) => (
                <li key={s.key}>{s.text}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function ChecklistsPage() {
  const [tab, setTab] = useState<TabKey>("structure");
  return (
    <>
      <PageHeader
        title="Требования к ВКР"
        lead="Чек-листы по Программе ГИА. Рядом с каждым пунктом — номер пункта программы, по которому его можно сверить."
      />
      <div role="tablist" aria-label="Разделы требований" className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cx(
              "rounded-full border px-3.5 py-1.5 text-[15px] font-medium transition",
              tab === t.key ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-slate-700 hover:bg-brand-50",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === "structure" && <StructureTab />}
        {tab === "volume" && <VolumeTab />}
        {tab === "intro" && <IntroTab />}
        {tab === "content" && <ContentTab />}
        {tab === "words" && <WordsTab />}
      </div>
    </>
  );
}
