import { FIGURES } from "@/requirements";

export type ItemKind = "figure" | "table";

/** Рисунок или таблица в реестре. */
export interface NumberedItem {
  id: string;
  kind: ItemKind;
  /** Порядок появления в тексте (внутри своего вида). */
  position: number;
  title: string;
  /** Единицы измерения (обязательны для таблицы). */
  units: string;
  /** Период времени, к которому относятся данные (обязателен для таблицы). */
  period: string;
  /** Единица измерения общая для всех числовых данных таблицы. */
  common_unit: boolean;
  /** Номер, под которым объект сейчас упомянут в тексте ВКР. */
  text_number: number | null;
  created_at?: string;
}

export interface StaleReference {
  id: string;
  kind: ItemKind;
  title: string;
  /** Ссылка, которая сейчас стоит в тексте: «рис. 3». */
  from: string;
  /** Какой она должна стать: «рис. 2». */
  to: string;
}

const byPosition = (a: NumberedItem, b: NumberedItem) =>
  a.position - b.position || (a.created_at ?? "").localeCompare(b.created_at ?? "");

export function ofKind(items: NumberedItem[], kind: ItemKind): NumberedItem[] {
  return items.filter((i) => i.kind === kind).sort(byPosition);
}

/** Сквозная нумерация в пределах всей работы, отдельно для рисунков и таблиц. */
export function numberItems(items: NumberedItem[]): Map<string, number> {
  const numbers = new Map<string, number>();
  for (const kind of ["figure", "table"] as const) {
    ofKind(items, kind).forEach((item, index) => numbers.set(item.id, index + 1));
  }
  return numbers;
}

/** Ссылка в тексте: «рис. 1», «табл. 2» (Прил. 7, п. 11). */
export function textRef(kind: ItemKind, n: number): string {
  return `${kind === "figure" ? FIGURES.refs.figure : FIGURES.refs.table} ${n}`;
}
export const pageRef = (page: string | number) => `${FIGURES.refs.page} ${page}`;
export const chapterRef = (chapter: string | number) => `${FIGURES.refs.chapter} ${chapter}`;

/** Подпись под рисунком: «Рисунок 1. Название» (Прил. 7, п. 9). */
export function figureCaption(n: number, title: string): string {
  return `${FIGURES.figureWord} ${n}. ${title.trim().replace(/\.$/, "")}`;
}

/**
 * Заголовок таблицы: строка «Таблица 1» в левом верхнем углу и под ней название.
 * Общая единица измерения приводится после названия (Прил. 7, п. 10).
 */
export function tableCaption(n: number, item: Pick<NumberedItem, "title" | "units" | "common_unit">) {
  const title = item.title.trim().replace(/\.$/, "");
  const units = item.units.trim();
  return {
    numberLine: `${FIGURES.tableWord} ${n}`,
    titleLine: item.common_unit && units ? `${title}, ${units}` : title,
  };
}

/** Ссылки в тексте, которые устарели после удаления или перестановки. */
export function staleReferences(items: NumberedItem[]): StaleReference[] {
  const numbers = numberItems(items);
  const stale: StaleReference[] = [];
  for (const kind of ["figure", "table"] as const) {
    for (const item of ofKind(items, kind)) {
      const current = numbers.get(item.id)!;
      if (item.text_number != null && item.text_number !== current) {
        stale.push({
          id: item.id,
          kind,
          title: item.title,
          from: textRef(kind, item.text_number),
          to: textRef(kind, current),
        });
      }
    }
  }
  return stale;
}

/** Переставляет объект на одну позицию вверх или вниз. Возвращает новые position. */
export function moveItem(items: NumberedItem[], id: string, direction: -1 | 1): NumberedItem[] {
  const target = items.find((i) => i.id === id);
  if (!target) return items;
  const list = ofKind(items, target.kind);
  const index = list.findIndex((i) => i.id === id);
  const swap = index + direction;
  if (swap < 0 || swap >= list.length) return items;
  [list[index], list[swap]] = [list[swap], list[index]];
  const positions = new Map(list.map((item, i) => [item.id, i + 1]));
  return items.map((i) => (positions.has(i.id) ? { ...i, position: positions.get(i.id)! } : i));
}

/** Удаляет объект и сообщает, какую ссылку нужно убрать из текста. */
export function removeItem(items: NumberedItem[], id: string): { items: NumberedItem[]; removedRef: string | null } {
  const target = items.find((i) => i.id === id);
  if (!target) return { items, removedRef: null };
  return {
    items: items.filter((i) => i.id !== id),
    removedRef: target.text_number != null ? textRef(target.kind, target.text_number) : null,
  };
}

/** Позиция для нового объекта — в конец своего списка. */
export function nextPosition(items: NumberedItem[], kind: ItemKind): number {
  return ofKind(items, kind).reduce((max, i) => Math.max(max, i.position), 0) + 1;
}
