import { describe, expect, it } from "vitest";
import { buildBibliography, type Source } from "@/lib/bibliography";
import { citeParenthetical, citeQuote, citeSecondary, citationName, surnameOf } from "@/lib/citations";

let n = 0;
const mono = (authors: string, year: string, title = "Книга", lang: Source["lang"] = null): Source => {
  n += 1;
  return {
    id: `c${n}`,
    type: "monograph",
    lang,
    data: { authors, year, title, place: "М.", publisher: "Изд.", pages: "100" },
    url_checked: false,
    created_at: String(n).padStart(4, "0"),
  };
};
const entryOf = (source: Source) => buildBibliography([source])[0];

describe("фамилия для ссылки", () => {
  it("отделяет инициалы", () => {
    expect(surnameOf("Клейнер Г. Б.")).toBe("Клейнер");
    expect(surnameOf("Мурин Дж.")).toBe("Мурин");
    expect(surnameOf("Виханский О.С.")).toBe("Виханский");
    expect(surnameOf("Johnson M.")).toBe("Johnson");
    expect(surnameOf("Ван дер Ваарден Б.")).toBe("Ван дер Ваарден");
  });

  it("организация остаётся целиком", () => {
    expect(surnameOf("РБК")).toBe("РБК");
    const org: Source = {
      id: "org",
      type: "report",
      lang: null,
      data: { organisation: "Газпром", year: "2025", title: "Отчет", website: "Сайт", viewed: "2026-10-05", url: "https://g.ru" },
      url_checked: false,
    };
    expect(citeParenthetical([entryOf(org)])).toBe("(Газпром, 2025)");
  });
});

describe("ссылки в тексте (Прил. 7, пп. 13-17)", () => {
  it("ссылка без цитаты", () => {
    expect(citeParenthetical([entryOf(mono("Иванов И.", "2006"))])).toBe("(Иванов, 2006)");
    expect(citeParenthetical([entryOf(mono("Johnson B.", "2002"))])).toBe("(Johnson, 2002)");
  });

  it("цитата с номерами страниц", () => {
    expect(citeQuote(entryOf(mono("Петров П.", "2006")), "123-124")).toBe("[Петров, 2006, с. 123-124]");
  });

  it("три и более авторов: «и др.» для русского источника", () => {
    const e = entryOf(mono("Петров А., Сидоров Б., Кузнецов В.", "2010"));
    expect(citeParenthetical([e])).toBe("(Петров и др., 2010)");
  });

  it("три и более авторов: «et al.» для английского источника", () => {
    const e = entryOf(mono("Brown A., Green B., White C.", "2011"));
    expect(citeParenthetical([e])).toBe("(Brown et al., 2011)");
  });

  it("два автора перечисляются оба", () => {
    expect(citationName(entryOf(mono("Иванов И., Петров П.", "2015")))).toBe("Иванов, Петров");
  });

  it("несколько источников в одних скобках — через точку с запятой в порядке списка литературы", () => {
    const sources = [
      mono("Smith A., Jones B., Lee C.", "2007"),
      mono("Johnson B.", "2002"),
      mono("Сидоров С.", "2004", "Вторая работа"),
      mono("Сидоров С.", "2004", "Первая работа"),
      mono("Иванов И.", "2006"),
    ];
    const list = buildBibliography(sources);
    const pick = (title: string, author: string) =>
      list.find((e) => e.source.data.authors.startsWith(author) && e.source.data.title === title)!;
    // выбираем в произвольном порядке — результат всё равно в порядке списка
    const chosen = [
      pick("Книга", "Smith"),
      pick("Вторая работа", "Сидоров"),
      pick("Книга", "Johnson"),
      pick("Книга", "Иванов"),
    ];
    expect(citeParenthetical(chosen, list)).toBe("(Иванов, 2006; Сидоров, 2004a; Johnson, 2002; Smith et al., 2007)");
  });

  it("буквы после года совпадают со списком литературы", () => {
    const list = buildBibliography([
      mono("Портер М.", "2005", "Конкурентная стратегия"),
      mono("Портер М.", "2005", "Как достичь высокого результата"),
    ]);
    expect(citeParenthetical([list[0]])).toBe("(Портер, 2005a)");
    expect(citeQuote(list[1], "15")).toBe("[Портер, 2005b, с. 15]");
  });

  it("цитата не по первоисточнику", () => {
    expect(citeSecondary("Смитт", entryOf(mono("Иванов И.", "2010")), "35")).toBe(
      "[Смитт, цит. по Иванов, 2010, с. 35]",
    );
  });
});
