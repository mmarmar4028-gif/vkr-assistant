"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Clause,
  CopyButton,
  CopyLine,
  Empty,
  Field,
  Input,
  Loading,
  Notice,
  PageHeader,
  Select,
  cx,
} from "@/components/ui";
import { buildBibliography, formatEntry, validateSource, type BibliographyEntry, type Source } from "@/lib/bibliography";
import { citeParenthetical, citeQuote, citeSecondary, citationNames } from "@/lib/citations";
import { bibliographyDocument, fileStem, toBlob } from "@/lib/docx/exports";
import { downloadBlob } from "@/lib/format";
import { notifyError, useProfile, useRows } from "@/lib/hooks";
import {
  BIBLIOGRAPHY_RULES,
  CITATION_RULES,
  EDN_NOTE,
  FORMATTING,
  SOURCE_TYPES,
  TWO_AUTHORS_NOTE,
  URL_CHECKED_LABEL,
  type SourceType,
} from "@/requirements";

const typeDef = (type: SourceType) => SOURCE_TYPES.find((t) => t.key === type)!;
const hasUrl = (type: SourceType, data: Record<string, string>) =>
  type !== "monograph" && (type !== "article" || Boolean(data.url?.trim()));

interface Draft {
  id: string | null;
  type: SourceType;
  lang: Source["lang"];
  data: Record<string, string>;
  url_checked: boolean;
}
const emptyDraft = (type: SourceType = "monograph"): Draft => ({ id: null, type, lang: null, data: {}, url_checked: false });

function SourceForm({
  draft,
  setDraft,
  onSave,
  onCancel,
}: {
  draft: Draft;
  setDraft(d: Draft): void;
  onSave(): Promise<void>;
  onCancel(): void;
}) {
  const [errors, setErrors] = useState<string[]>([]);
  const def = typeDef(draft.type);
  const set = (key: string, value: string) => setDraft({ ...draft, data: { ...draft.data, [key]: value } });
  const preview = formatEntry({ id: "preview", type: draft.type, lang: draft.lang, data: draft.data, url_checked: false });
  const filled = Object.values(draft.data).some((v) => v?.trim());

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const found = validateSource(draft.type, draft.data, def.fields);
        setErrors(found);
        if (found.length === 0) await onSave();
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Вид источника">
          <Select
            value={draft.type}
            onChange={(e) => {
              setErrors([]);
              setDraft({ ...draft, type: e.target.value as SourceType });
            }}
          >
            {SOURCE_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Язык источника" hint="От языка зависит место в списке и «и др.» / «et al.» в ссылке.">
          <Select
            value={draft.lang ?? ""}
            onChange={(e) => setDraft({ ...draft, lang: (e.target.value || null) as Source["lang"] })}
          >
            <option value="">Автоматически</option>
            <option value="ru">Русский</option>
            <option value="foreign">Иностранный</option>
          </Select>
        </Field>
      </div>

      <div className="rounded-xl bg-paper/70 px-3.5 py-2.5 text-[14px] leading-relaxed text-slate-600">
        <span className="font-medium text-slate-700">Пример из программы</span> <Clause>{def.clause}</Clause>
        <p className="docline mt-1 break-words text-[15px]! text-slate-700">{def.example}</p>
        {def.note && <p className="mt-1">{def.note}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {def.fields.map((f) => {
          const wide = f.key === "title" || f.kind === "authors" || f.kind === "url" || f.key === "publication";
          return (
            <Field
              key={`${draft.type}-${f.key}`}
              label={f.label}
              required={f.required}
              className={cx(wide && "md:col-span-2")}
              hint={
                f.kind === "authors"
                  ? `${f.hint ? `${f.hint} ` : ""}Несколько авторов — через запятую: Коупленд Т., Коллер Т., Мурин Дж.`
                  : f.key === "edn"
                    ? EDN_NOTE
                    : f.hint
              }
            >
              <Input
                type={f.kind === "date" ? "date" : f.kind === "url" ? "url" : "text"}
                inputMode={f.kind === "year" || f.kind === "number" ? "numeric" : undefined}
                value={draft.data[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.kind === "date" ? undefined : f.placeholder}
              />
            </Field>
          );
        })}
      </div>

      {hasUrl(draft.type, draft.data) && (
        <label className="flex items-center gap-2 text-[15px]">
          <input
            type="checkbox"
            className="size-4.5"
            checked={draft.url_checked}
            onChange={(e) => setDraft({ ...draft, url_checked: e.target.checked })}
          />
          {URL_CHECKED_LABEL}
          <Clause>п. 3.1.5</Clause>
        </label>
      )}

      {filled && (
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Как запись будет выглядеть в списке</p>
          <p className="docline break-words rounded-lg border border-line bg-white px-3 py-2">{preview}</p>
        </div>
      )}

      {errors.length > 0 && (
        <Notice kind="error">
          <ul className="list-disc pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Notice>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary">
          {draft.id ? "Сохранить изменения" : "Добавить источник"}
        </Button>
        {(draft.id || filled) && <Button onClick={onCancel}>{draft.id ? "Отмена" : "Очистить"}</Button>}
      </div>
    </form>
  );
}

function Citations({ entry }: { entry: BibliographyEntry }) {
  const [pages, setPages] = useState("");
  const [quoted, setQuoted] = useState("");
  const [quotedPages, setQuotedPages] = useState("");
  const twoAuthors = citationNames(entry.source).length === 2;
  return (
    <div className="mt-3 grid gap-3 rounded-xl bg-paper/70 p-3 lg:grid-cols-3">
      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">
          Ссылка без цитаты <Clause>Прил. 7, п. 13</Clause>
        </p>
        <CopyLine text={citeParenthetical([entry])} />
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">
          Цитата со страницами <Clause>Прил. 7, п. 13</Clause>
        </p>
        <Input aria-label="Страницы цитаты" placeholder="Страницы: 123-124" value={pages} onChange={(e) => setPages(e.target.value)} className="mb-1.5" />
        <CopyLine text={citeQuote(entry, pages)} />
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">
          Цитата не по первоисточнику <Clause>Прил. 7, п. 17</Clause>
        </p>
        <div className="mb-1.5 grid grid-cols-[1fr_6rem] gap-1.5">
          <Input aria-label="Фамилия цитируемого автора" placeholder="Кого цитируют: Смитт" value={quoted} onChange={(e) => setQuoted(e.target.value)} />
          <Input aria-label="Страница" placeholder="с. 35" value={quotedPages} onChange={(e) => setQuotedPages(e.target.value)} />
        </div>
        {quoted.trim() ? (
          <CopyLine text={citeSecondary(quoted, entry, quotedPages)} />
        ) : (
          <p className="text-[13.5px] text-slate-500">Введите фамилию автора, чьи слова приводит этот источник.</p>
        )}
      </div>
      {twoAuthors && <p className="text-[13.5px] text-amber-800 lg:col-span-3">{TWO_AUTHORS_NOTE}</p>}
    </div>
  );
}

export default function BibliographyPage() {
  const { profile } = useProfile();
  const sources = useRows<Source>("sources");
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => buildBibliography(sources.rows), [sources.rows]);
  if (sources.loading) return <Loading />;

  const chosen = list.filter((e) => selected.includes(e.source.id));
  const fullText = list.map((e) => e.text).join("\n");
  const unchecked = list.filter((e) => hasUrl(e.source.type, e.source.data) && !e.source.url_checked).length;
  const indentCm = profile.settings.indentCm ?? FORMATTING.indent.defaultCm;

  async function saveDraft() {
    const row = { type: draft.type, lang: draft.lang, data: draft.data, url_checked: draft.url_checked };
    if (draft.id) await sources.patch(draft.id, row);
    else await sources.add(row);
    setDraft(emptyDraft(draft.type));
  }

  async function exportDocx() {
    setBusy(true);
    try {
      const blob = await toBlob(bibliographyDocument(list.map((e) => e.text), indentCm));
      downloadBlob(blob, `Список_литературы_${fileStem(profile)}.docx`);
    } catch (e) {
      notifyError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Список литературы и ссылки в тексте"
        clause="Прил. 6; Прил. 7, пп. 13-17"
        lead="Заполните поля источника — приложение соберёт запись в формате примеров программы, расставит источники в нужном порядке и подготовит ссылки для текста."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
        <Card title={draft.id ? "Изменить источник" : "Добавить источник"} className="xl:row-span-2" >
          <div id="source-form" />
          <SourceForm draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={() => setDraft(emptyDraft(draft.type))} />
        </Card>

        <Card title="Правила списка">
          <ul className="space-y-2 text-[14.5px] leading-snug text-slate-700">
            {BIBLIOGRAPHY_RULES.map((r) => (
              <li key={r.key}>
                {r.text} <Clause>{r.clause}</Clause>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Правила ссылок в тексте">
          <ul className="space-y-2 text-[14.5px] leading-snug text-slate-700">
            {CITATION_RULES.map((r) => (
              <li key={r.key}>
                {r.text} <Clause>{r.clause}</Clause>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card
        className="mt-4"
        title={`Список литературы (${list.length})`}
        actions={
          <>
            <CopyButton text={fullText} label="Скопировать список" small={false} />
            <Button variant="primary" onClick={exportDocx} disabled={busy || list.length === 0}>
              {busy ? "Готовим файл…" : "Скачать .docx"}
            </Button>
          </>
        }
      >
        {unchecked > 0 && (
          <Notice kind="warn" className="mb-3" clause="п. 3.1.5">
            Ссылок, не отмеченных как проверенные: {unchecked}. Откройте каждую и убедитесь, что она действительна.
          </Notice>
        )}

        {chosen.length > 0 && (
          <div className="mb-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
            <p className="mb-1 text-sm font-medium text-brand-900">
              Несколько источников в одних скобках — в порядке списка литературы <Clause>Прил. 7, п. 15</Clause>
            </p>
            <CopyLine text={citeParenthetical(chosen, list)} />
            <Button small variant="ghost" className="mt-1" onClick={() => setSelected([])}>
              Снять выбор
            </Button>
          </div>
        )}

        {list.length === 0 ? (
          <Empty>Источников пока нет. Добавьте первый с помощью формы выше.</Empty>
        ) : (
          <ul>
            {list.map((entry) => {
              const s = entry.source;
              const open = openId === s.id;
              const needsCheck = hasUrl(s.type, s.data);
              return (
                <li key={s.id} className="border-b border-line py-3 last:border-b-0">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1.5 size-4.5 shrink-0"
                      aria-label="Добавить в общую ссылку"
                      title="Добавить в общую ссылку"
                      checked={selected.includes(s.id)}
                      onChange={(e) =>
                        setSelected((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)))
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="docline break-words">{entry.text}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-500">
                        <span>{typeDef(s.type).label}</span>
                        <span>{entry.lang === "ru" ? "русский" : "иностранный"}</span>
                        {entry.suffix && <span className="text-brand-700">буква «{entry.suffix}» после года</span>}
                        {needsCheck && (
                          <label className={cx("flex items-center gap-1.5", s.url_checked ? "text-emerald-700" : "text-amber-800")}>
                            <input
                              type="checkbox"
                              checked={s.url_checked}
                              onChange={(e) => sources.patch(s.id, { url_checked: e.target.checked })}
                            />
                            {URL_CHECKED_LABEL}
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-7">
                    <Button small variant="ghost" aria-expanded={open} onClick={() => setOpenId(open ? null : s.id)}>
                      {open ? "Скрыть ссылки" : "Ссылки в тексте"}
                    </Button>
                    <CopyButton text={entry.text} label="Копировать запись" />
                    <Button
                      small
                      variant="ghost"
                      onClick={() => {
                        setDraft({ id: s.id, type: s.type, lang: s.lang, data: { ...s.data }, url_checked: s.url_checked });
                        document.getElementById("source-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      Изменить
                    </Button>
                    <Button
                      small
                      variant="danger"
                      onClick={() => {
                        if (draft.id === s.id) setDraft(emptyDraft());
                        setSelected((prev) => prev.filter((id) => id !== s.id));
                        sources.remove(s.id);
                      }}
                    >
                      Удалить
                    </Button>
                  </div>
                  {open && (
                    <div className="pl-7">
                      <Citations entry={entry} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
