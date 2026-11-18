import { describe, expect, it } from "vitest";
import {
  chapterRef,
  figureCaption,
  moveItem,
  nextPosition,
  numberItems,
  pageRef,
  removeItem,
  staleReferences,
  tableCaption,
  textRef,
  type NumberedItem,
} from "@/lib/numbering";

const item = (id: string, kind: NumberedItem["kind"], position: number, text_number: number | null = null): NumberedItem => ({
  id,
  kind,
  position,
  title: `Объект ${id}`,
  units: "млн руб.",
  period: "2023-2025 гг.",
  common_unit: false,
  text_number,
});

describe("нумерация рисунков и таблиц (Прил. 7, пп. 9-11)", () => {
  it("сквозная нумерация по всей работе, отдельно для рисунков и таблиц", () => {
    const numbers = numberItems([
      item("t2", "table", 2),
      item("f1", "figure", 1),
      item("t1", "table", 1),
      item("f3", "figure", 5),
      item("f2", "figure", 3),
    ]);
    expect([numbers.get("f1"), numbers.get("f2"), numbers.get("f3")]).toEqual([1, 2, 3]);
    expect([numbers.get("t1"), numbers.get("t2")]).toEqual([1, 2]);
  });

  it("подпись рисунка: без кавычек и без знака №", () => {
    expect(figureCaption(1, "Название")).toBe("Рисунок 1. Название");
    expect(figureCaption(2, "Динамика выручки.")).toBe("Рисунок 2. Динамика выручки");
    expect(figureCaption(1, "Название")).not.toMatch(/[№«»"]/);
  });

  it("заголовок таблицы: «Таблица 1» над названием, общая единица измерения — после названия", () => {
    expect(tableCaption(1, { title: "Выручка компании", units: "млн руб.", common_unit: true })).toEqual({
      numberLine: "Таблица 1",
      titleLine: "Выручка компании, млн руб.",
    });
    expect(tableCaption(3, { title: "Показатели", units: "млн руб., %", common_unit: false })).toEqual({
      numberLine: "Таблица 3",
      titleLine: "Показатели",
    });
  });

  it("ссылки в тексте", () => {
    expect(textRef("figure", 1)).toBe("рис. 1");
    expect(textRef("table", 2)).toBe("табл. 2");
    expect(pageRef(34)).toBe("с. 34");
    expect(chapterRef(2)).toBe("гл. 2");
  });
});

describe("пересчёт после удаления и перестановки", () => {
  const base = () => [
    item("f1", "figure", 1, 1),
    item("f2", "figure", 2, 2),
    item("f3", "figure", 3, 3),
    item("t1", "table", 1, 1),
  ];

  it("без изменений устаревших ссылок нет", () => {
    expect(staleReferences(base())).toEqual([]);
  });

  it("после удаления номера следующих объектов сдвигаются и ссылки помечаются", () => {
    const { items, removedRef } = removeItem(base(), "f1");
    expect(removedRef).toBe("рис. 1");
    const numbers = numberItems(items);
    expect([numbers.get("f2"), numbers.get("f3")]).toEqual([1, 2]);
    expect(staleReferences(items).map((s) => `${s.from} → ${s.to}`)).toEqual(["рис. 2 → рис. 1", "рис. 3 → рис. 2"]);
    // таблицы не затронуты
    expect(numbers.get("t1")).toBe(1);
  });

  it("после перестановки меняются местами два номера", () => {
    const moved = moveItem(base(), "f3", -1);
    const numbers = numberItems(moved);
    expect([numbers.get("f1"), numbers.get("f3"), numbers.get("f2")]).toEqual([1, 2, 3]);
    expect(staleReferences(moved).map((s) => `${s.id}: ${s.from} → ${s.to}`)).toEqual([
      "f3: рис. 3 → рис. 2",
      "f2: рис. 2 → рис. 3",
    ]);
  });

  it("крайние объекты не двигаются за пределы списка", () => {
    expect(moveItem(base(), "f1", -1)).toEqual(base());
    expect(moveItem(base(), "f3", 1)).toEqual(base());
  });

  it("объект, которого ещё нет в тексте, не даёт предупреждений", () => {
    const items = [item("f1", "figure", 1, 1), item("f2", "figure", 2, null)];
    expect(staleReferences(moveItem(items, "f2", -1)).map((s) => s.id)).toEqual(["f1"]);
  });

  it("новый объект добавляется в конец своего списка", () => {
    expect(nextPosition(base(), "figure")).toBe(4);
    expect(nextPosition(base(), "table")).toBe(2);
    expect(nextPosition([], "table")).toBe(1);
  });
});
