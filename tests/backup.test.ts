import { describe, expect, it } from "vitest";
import { TABLES, backupFileName, countRows, makeBackup, parseBackup } from "@/lib/backup";

const sample = () =>
  makeBackup(
    (t) => (t === "sources" ? [{ id: "1", type: "monograph", data: { title: "Книга" } }] : t === "profiles" ? [{ full_name: "Иванова" }] : []),
    new Date("2027-01-15T10:00:00Z"),
  );

describe("резервная копия", () => {
  it("содержит все таблицы приложения", () => {
    const b = sample();
    expect(Object.keys(b.tables).sort()).toEqual([...TABLES].sort());
    expect(countRows(b)).toBe(2);
    expect(b.exported_at).toBe("2027-01-15T10:00:00.000Z");
  });

  it("читается обратно без потерь", () => {
    const b = sample();
    expect(parseBackup(JSON.stringify(b))).toEqual(b);
  });

  it("недостающие разделы считаются пустыми", () => {
    const text = JSON.stringify({ app: "vkr-assistant", version: 1, exported_at: "x", tables: { sources: [{ id: "1" }] } });
    const b = parseBackup(text);
    expect(b.tables.sources).toHaveLength(1);
    expect(b.tables.risks).toEqual([]);
  });

  it("понятные ошибки на чужих и повреждённых файлах", () => {
    expect(() => parseBackup("не json")).toThrow(/повреждён или это другой файл/);
    expect(() => parseBackup(JSON.stringify({ app: "other", tables: {} }))).toThrow(/не резервная копия/);
    expect(() => parseBackup(JSON.stringify({ app: "vkr-assistant", version: 99, tables: {} }))).toThrow(/более новой версией/);
    expect(() =>
      parseBackup(JSON.stringify({ app: "vkr-assistant", version: 1, tables: { sources: "x" } })),
    ).toThrow(/Источники/);
  });

  it("имя файла с датой", () => {
    expect(backupFileName(new Date(2027, 0, 5))).toBe("vkr-backup-2027-01-05.json");
  });
});
