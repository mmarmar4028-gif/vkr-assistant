"use client";

import { useState, type FormEvent } from "react";
import {
  Button,
  Card,
  Clause,
  CommitInput,
  CopyLine,
  Empty,
  Field,
  Input,
  Loading,
  Notice,
  PageHeader,
  Select,
} from "@/components/ui";
import { useRows } from "@/lib/hooks";
import {
  chapterRef,
  figureCaption,
  moveItem,
  nextPosition,
  numberItems,
  ofKind,
  pageRef,
  staleReferences,
  tableCaption,
  textRef,
  type ItemKind,
  type NumberedItem,
} from "@/lib/numbering";
import { FIGURES } from "@/requirements";

const KIND_LABEL: Record<ItemKind, string> = { figure: "Рисунок", table: "Таблица" };

export default function FiguresPage() {
  const store = useRows<NumberedItem>("figures_tables", "position");
  const [kind, setKind] = useState<ItemKind>("figure");
  const [title, setTitle] = useState("");
  const [units, setUnits] = useState("");
  const [period, setPeriod] = useState("");
  const [common, setCommon] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [page, setPage] = useState("34");
  const [chapter, setChapter] = useState("2");

  if (store.loading) return <Loading />;

  const items = store.rows;
  const numbers = numberItems(items);
  const stale = staleReferences(items);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Укажите название.");
    if (kind === "table" && (!units.trim() || !period.trim())) {
      return setError("Для таблицы обязательны единицы измерения и период времени, к которому относятся данные.");
    }
    setError(null);
    const position = nextPosition(items, kind);
    await store.add({
      kind,
      position,
      title: title.trim(),
      units: kind === "table" ? units.trim() : "",
      period: kind === "table" ? period.trim() : "",
      common_unit: kind === "table" && common,
      // новый объект встаёт в конец, поэтому его номер в тексте равен номеру по порядку
      text_number: ofKind(items, kind).length + 1,
    });
    setTitle("");
    setUnits("");
    setPeriod("");
    setCommon(false);
  }

  async function move(id: string, direction: -1 | 1) {
    const moved = moveItem(items, id, direction);
    await Promise.all(
      moved.filter((m) => items.find((i) => i.id === m.id)?.position !== m.position).map((m) => store.patch(m.id, { position: m.position })),
    );
  }

  async function remove(item: NumberedItem) {
    if (item.text_number != null) setRemoved((prev) => [...prev, `${textRef(item.kind, item.text_number!)} («${item.title}»)`]);
    await store.remove(item.id);
  }

  const confirm = (id: string) => store.patch(id, { text_number: numbers.get(id) ?? null });

  const list = (k: ItemKind) => {
    const rows = ofKind(items, k);
    if (rows.length === 0) return <Empty>{k === "figure" ? "Рисунков пока нет." : "Таблиц пока нет."}</Empty>;
    return (
      <ul>
        {rows.map((item, index) => {
          const n = numbers.get(item.id)!;
          const caption = k === "table" ? tableCaption(n, item) : null;
          const missing = k === "table" && (!item.units.trim() || !item.period.trim());
          return (
            <li key={item.id} className="border-b border-line py-3 last:border-b-0">
              <div className="flex flex-wrap items-start gap-2">
                <span className="mt-1.5 w-8 shrink-0 text-lg font-semibold tabular-nums text-brand-700">{n}</span>
                <div className="min-w-0 flex-1 basis-64 space-y-1.5">
                  <CommitInput
                    aria-label={`${KIND_LABEL[k]} ${n}: название`}
                    value={item.title}
                    onCommit={(v) => store.patch(item.id, { title: v })}
                  />
                  {k === "table" && (
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      <CommitInput
                        aria-label={`Таблица ${n}: единицы измерения`}
                        placeholder="Единицы измерения: млн руб."
                        value={item.units}
                        onCommit={(v) => store.patch(item.id, { units: v })}
                      />
                      <CommitInput
                        aria-label={`Таблица ${n}: период`}
                        placeholder="Период: 2023-2025 гг."
                        value={item.period}
                        onCommit={(v) => store.patch(item.id, { period: v })}
                      />
                      <label className="flex items-center gap-2 text-[14px] text-slate-700 sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={item.common_unit}
                          onChange={(e) => store.patch(item.id, { common_unit: e.target.checked })}
                        />
                        единица измерения общая для всех числовых данных
                      </label>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center">
                  <Button small variant="ghost" aria-label="Переместить выше" disabled={index === 0} onClick={() => move(item.id, -1)}>
                    ↑
                  </Button>
                  <Button
                    small
                    variant="ghost"
                    aria-label="Переместить ниже"
                    disabled={index === rows.length - 1}
                    onClick={() => move(item.id, 1)}
                  >
                    ↓
                  </Button>
                  <Button small variant="danger" onClick={() => remove(item)}>
                    Удалить
                  </Button>
                </div>
              </div>
              <div className="mt-2 grid gap-1.5 pl-10 md:grid-cols-[minmax(0,1fr)_11rem]">
                {caption ? (
                  <div className="space-y-1">
                    <CopyLine text={caption.numberLine} />
                    <CopyLine text={caption.titleLine} />
                  </div>
                ) : (
                  <CopyLine text={figureCaption(n, item.title)} />
                )}
                <div>
                  <CopyLine text={textRef(k, n)} />
                </div>
              </div>
              {missing && (
                <p className="mt-1.5 pl-10 text-[13.5px] text-red-700">
                  Укажите единицы измерения и период — они обязательны в каждой таблице.
                </p>
              )}
              {k === "table" && !missing && (
                <p className="mt-1.5 pl-10 text-[13.5px] text-slate-500">
                  Период «{item.period}»{item.common_unit ? "" : ` и единицы измерения «${item.units}»`} должны быть
                  видны в самой таблице.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <>
      <PageHeader
        title="Рисунки и таблицы"
        clause="Прил. 7, пп. 9-11"
        lead="Реестр со сквозной нумерацией по всей работе. Расставьте объекты в том порядке, в котором они идут в тексте, — номера, подписи и ссылки пересчитаются сами."
      />

      {(stale.length > 0 || removed.length > 0) && (
        <Notice kind="warn" className="mb-4">
          <p className="font-semibold">Нумерация изменилась — обновите ссылки в тексте ВКР</p>
          <ul className="mt-1.5 space-y-1.5">
            {stale.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  «{s.title}»: <strong>{s.from}</strong> → <strong>{s.to}</strong>
                  {s.kind === "figure" ? " (и подпись под рисунком)" : " (и номер над таблицей)"}
                </span>
                <Button small onClick={() => confirm(s.id)}>
                  Исправлено в тексте
                </Button>
              </li>
            ))}
            {removed.map((r) => (
              <li key={r}>
                Удалено: уберите из текста ссылки на <strong>{r}</strong>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            {stale.length > 1 && (
              <Button small onClick={() => Promise.all(stale.map((s) => confirm(s.id)))}>
                Всё исправлено
              </Button>
            )}
            {removed.length > 0 && (
              <Button small onClick={() => setRemoved([])}>
                Ссылки на удалённые объекты убраны
              </Button>
            )}
          </div>
        </Notice>
      )}

      <Card title="Добавить рисунок или таблицу">
        <form onSubmit={add} className="grid gap-4 md:grid-cols-[10rem_minmax(0,1fr)]">
          <Field label="Вид">
            <Select value={kind} onChange={(e) => setKind(e.target.value as ItemKind)}>
              <option value="figure">Рисунок</option>
              <option value="table">Таблица</option>
            </Select>
          </Field>
          <Field label="Название" required hint="Без кавычек и без точки в конце.">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          {kind === "table" && (
            <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
              <Field label="Единицы измерения" required>
                <Input value={units} onChange={(e) => setUnits(e.target.value)} placeholder="млн руб." />
              </Field>
              <Field label="Период времени, к которому относятся данные" required>
                <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2023-2025 гг." />
              </Field>
              <label className="flex items-center gap-2 text-[15px] md:col-span-2">
                <input type="checkbox" className="size-4.5" checked={common} onChange={(e) => setCommon(e.target.checked)} />
                Единица измерения общая для всех числовых данных — приводится в заголовке после названия
              </label>
            </div>
          )}
          {error && (
            <Notice kind="error" className="md:col-span-2">
              {error}
            </Notice>
          )}
          <div className="md:col-span-2">
            <Button type="submit" variant="primary">
              Добавить
            </Button>
          </div>
        </form>
      </Card>

      <div className="mt-4 grid gap-4 2xl:grid-cols-2">
        <Card title={`Рисунки (${ofKind(items, "figure").length})`} clause="Прил. 7, п. 9">
          <p className="mb-1 text-[14px] text-slate-600">{FIGURES.rules[0].text}</p>
          {list("figure")}
        </Card>
        <Card title={`Таблицы (${ofKind(items, "table").length})`} clause="Прил. 7, п. 10">
          <p className="mb-1 text-[14px] text-slate-600">
            {FIGURES.rules[2].text} {FIGURES.rules[3].text}
          </p>
          {list("table")}
        </Card>
      </div>

      <Card className="mt-4" title="Ссылки на страницу и главу" clause="Прил. 7, п. 11">
        <p className="mb-3 text-[14.5px] text-slate-600">{FIGURES.rules[4].text}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Field label="Номер страницы">
              <Input value={page} onChange={(e) => setPage(e.target.value)} inputMode="numeric" className="mb-1.5" />
            </Field>
            <CopyLine text={pageRef(page.trim())} />
          </div>
          <div>
            <Field label="Номер главы">
              <Input value={chapter} onChange={(e) => setChapter(e.target.value)} inputMode="numeric" className="mb-1.5" />
            </Field>
            <CopyLine text={chapterRef(chapter.trim())} />
          </div>
        </div>
        <p className="mt-3 text-[13.5px] text-slate-500">
          Знак № в ссылках и подписях не используется <Clause>Прил. 7, пп. 9-11</Clause>
        </p>
      </Card>
    </>
  );
}
