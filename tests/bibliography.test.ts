import { describe, expect, it } from "vitest";
import { buildBibliography, formatEntry, validateSource, type Source } from "@/lib/bibliography";
import { SOURCE_TYPES } from "@/requirements";

let n = 0;
function src(type: Source["type"], data: Record<string, string>, lang: Source["lang"] = null): Source {
  n += 1;
  return { id: `s${n}`, type, lang, data, url_checked: false, created_at: String(n).padStart(4, "0") };
}

/**
 * Эталонные записи из Приложения 6 Программы ГИА 2026-2027.
 * Результат должен совпадать с ними символ в символ.
 */
describe("эталонные записи Приложения 6", () => {
  it("монография", () => {
    const s = src("monograph", {
      authors: "Коупленд Т., Коллер Т., Мурин Дж.",
      year: "2007",
      title: "Стоимость компаний: оценка и управление",
      edition: "3-е изд., перераб. и доп. / Пер. с англ.",
      place: "М.",
      publisher: "«Олимп-Бизнес»",
      pages: "576",
    });
    expect(formatEntry(s)).toBe(
      "Коупленд Т., Коллер Т., Мурин Дж. 2007. Стоимость компаний: оценка и управление. – 3-е изд., перераб. и доп. / Пер. с англ. – М.: «Олимп-Бизнес», 576 с.",
    );
  });

  it("статья в рецензируемом журнале с DOI", () => {
    const s = src("article", {
      authors: "Клейнер Г. Б.",
      year: "2024",
      title: "Многополярное управление организацией",
      publication: "Российский журнал менеджмента",
      issue: "2024, Т. 22, № 2",
      pages: "163–178",
      doi: "10.21638/spbu18.2024.201",
    });
    expect(formatEntry(s)).toBe(
      "Клейнер Г. Б. 2024. Многополярное управление организацией // Российский журнал менеджмента, 2024, Т. 22, № 2, с. 163–178. https://doi.org/10.21638/spbu18.2024.201",
    );
  });

  it("нормативно-правовой акт", () => {
    const s = src("legal", {
      obtainedFrom: "КонсультантПлюс",
      docType: "Федеральный закон",
      issuer: "",
      title:
        "Об инновационных научно-технологических центрах и о внесении изменений в отдельные законодательные акты Российской Федерации",
      adopted: "2017-07-29",
      number: "216-ФЗ",
      viewed: "2018-11-10",
      url: "http://www.consultant.ru/document/cons_doc_LAW_221172/",
    });
    expect(formatEntry(s)).toBe(
      "КонсультантПлюс 2017. Федеральный закон «Об инновационных научно-технологических центрах и о внесении изменений в отдельные законодательные акты Российской Федерации» от 29.07.2017 N 216-ФЗ, просмотрено 10.11.2018, http://www.consultant.ru/document/cons_doc_LAW_221172/",
    );
  });

  it("новость без автора (запись начинается с портала)", () => {
    // В примере программы название новости заканчивается точкой — она введена как часть названия.
    const s = src("internet", {
      authors: "",
      year: "2026",
      title: "В «Лемана ПРО» и FM Logistic сменились гендиректора.",
      portal: "РБК",
      published: "",
      viewed: "2026-11-11",
      url: "https://www.rbc.ru/business/23/09/2026/6ab396de86e25f3cc3f0fb7d",
    });
    expect(formatEntry(s)).toBe(
      "РБК 2026. В «Лемана ПРО» и FM Logistic сменились гендиректора. // РБК, просмотрено 11.11.2026, https://www.rbc.ru/business/23/09/2026/6ab396de86e25f3cc3f0fb7d",
    );
  });

  it("статья в интернет-издании с автором и датой публикации", () => {
    const s = src("internet", {
      authors: "Романова Т.",
      year: "2018",
      title: "Глобальный рынок роскоши ждут большие перемены",
      portal: "Ведомости",
      published: "15 ноября",
      viewed: "2018-11-15",
      url: "https://www.vedomosti.ru/business/articles/2018/11/15/786579-zhdut",
    });
    expect(formatEntry(s)).toBe(
      "Романова Т. 2018. Глобальный рынок роскоши ждут большие перемены // Ведомости, 15 ноября, просмотрено 15.11.2018, https://www.vedomosti.ru/business/articles/2018/11/15/786579-zhdut",
    );
  });

  it("отчётность компании", () => {
    const s = src("report", {
      organisation: "Газпром",
      year: "2025",
      title: "Годовой отчет ПАО «Газпром» за 2025 год",
      website: "Официальный сайт ПАО «Газпром»",
      viewed: "2026-10-05",
      url: "https://www.gazprom.ru/f/posts/43/351867/gazprom-annual-report-2025-ru.pdf",
    });
    expect(formatEntry(s)).toBe(
      "Газпром 2025. Годовой отчет ПАО «Газпром» за 2025 год // Официальный сайт ПАО «Газпром», просмотрено 05.10.2026, https://www.gazprom.ru/f/posts/43/351867/gazprom-annual-report-2025-ru.pdf",
    );
  });

  it("статистические материалы", () => {
    const s = src("report", {
      organisation: "ФСГС",
      year: "2026",
      title: "Доклад «Социально-экономическое положение России»: январь-июль 2026 г.",
      website: "Федеральная служба государственной статистики",
      viewed: "2026-11-02",
      url: "https://rosstat.gov.ru/storage/mediabank/osn-07-2026.pdf",
    });
    expect(formatEntry(s)).toBe(
      "ФСГС 2026. Доклад «Социально-экономическое положение России»: январь-июль 2026 г. // Федеральная служба государственной статистики, просмотрено 02.11.2026, https://rosstat.gov.ru/storage/mediabank/osn-07-2026.pdf",
    );
  });
});

describe("другие примеры из Приложения 6", () => {
  it("статья в сборнике материалов конференции (без номера издания, со ссылкой)", () => {
    const s = src("article", {
      authors: "Виханский О.С.",
      year: "2023",
      title: "Управленческая парадигма XXI века: взгляд вчера и взгляд сегодня",
      publication:
        'XXIII Международная конференция. История управленческой мысли и бизнеса. "Учения об управлении организациями: прошлое, настоящее, проблемы". Материалы конференции 22–23 сентября 2023 г. – М.',
      pages: "72-76",
      url: "https://www.econ.msu.ru/sys/raw.php?o=104347&p=attachment",
    });
    expect(formatEntry(s)).toBe(
      'Виханский О.С. 2023. Управленческая парадигма XXI века: взгляд вчера и взгляд сегодня // XXIII Международная конференция. История управленческой мысли и бизнеса. "Учения об управлении организациями: прошлое, настоящее, проблемы". Материалы конференции 22–23 сентября 2023 г. – М., с. 72-76. https://www.econ.msu.ru/sys/raw.php?o=104347&p=attachment',
    );
  });

  it("статья из периодической печати в сети Интернет (номер вместо даты)", () => {
    const s = src("internet", {
      authors: "Молвинский А.",
      year: "2006",
      title: "Как сократить затраты",
      portal: "Финансовый Директор",
      published: "№ 5",
      viewed: "2027-04-05",
      url: "http://www.cfin.ru/management/finance/cost/cost-reduction_plan.shtml",
    });
    expect(formatEntry(s)).toBe(
      "Молвинский А. 2006. Как сократить затраты // Финансовый Директор, № 5, просмотрено 05.04.2027, http://www.cfin.ru/management/finance/cost/cost-reduction_plan.shtml",
    );
  });

  it("публичная информация о компании", () => {
    const s = src("report", {
      organisation: "ФНС",
      year: "2026",
      title: "ООО «ЦАИР»",
      website: "Онлайн-сервис «Прозрачный бизнес»",
      viewed: "2026-12-12",
      url: "https://pb.nalog.ru/company.html?token=CAF8660F",
    });
    expect(formatEntry(s)).toBe(
      "ФНС 2026. ООО «ЦАИР» // Онлайн-сервис «Прозрачный бизнес», просмотрено 12.12.2026, https://pb.nalog.ru/company.html?token=CAF8660F",
    );
  });
});

describe("варианты записи", () => {
  it("монография без сведений об издании", () => {
    const s = src("monograph", {
      authors: "Иванов И. И.",
      year: "2020",
      title: "Стратегия",
      place: "М.",
      publisher: "Наука",
      pages: "300",
    });
    expect(formatEntry(s)).toBe("Иванов И. И. 2020. Стратегия. – М.: Наука, 300 с.");
  });

  it("статья с кодом EDN вместо DOI", () => {
    const s = src("article", {
      authors: "Петров П. П.",
      year: "2022",
      title: "Название",
      publication: "Журнал",
      issue: "№ 1",
      pages: "5-9",
      edn: "ABCDEF",
    });
    expect(formatEntry(s)).toBe("Петров П. П. 2022. Название // Журнал, № 1, с. 5-9. EDN: ABCDEF");
  });

  it("DOI, введённый полной ссылкой, не дублируется", () => {
    const s = src("article", {
      authors: "Smith J.",
      year: "2019",
      title: "Title",
      publication: "Journal",
      pages: "1-2",
      doi: "https://doi.org/10.1000/x",
    });
    expect(formatEntry(s)).toBe("Smith J. 2019. Title // Journal, с. 1-2. https://doi.org/10.1000/x");
  });

  it("акт с органом, принявшим документ", () => {
    const s = src("legal", {
      obtainedFrom: "Гарант",
      docType: "Указ",
      issuer: "Президента РФ",
      title: "О национальных целях",
      adopted: "2024-05-07",
      number: "309",
      viewed: "2026-10-01",
      url: "https://example.org/doc",
    });
    expect(formatEntry(s)).toBe(
      "Гарант 2024. Указ Президента РФ «О национальных целях» от 07.05.2024 N 309, просмотрено 01.10.2026, https://example.org/doc",
    );
  });
});

describe("порядок и буквы после года", () => {
  const mono = (authors: string, year: string, title: string) =>
    src("monograph", { authors, year, title, place: "М.", publisher: "Изд.", pages: "100" });

  it("сначала источники на русском языке по алфавиту, затем на иностранных", () => {
    const list = buildBibliography([
      mono("Smith A.", "2007", "Zeta"),
      mono("Сидоров С.", "2004", "Книга"),
      mono("Johnson B.", "2002", "Alpha"),
      mono("Иванов И.", "2006", "Книга"),
      src("report", { organisation: "Газпром", year: "2025", title: "Отчет", website: "Сайт", viewed: "2026-10-05", url: "https://g.ru" }),
    ]);
    expect(list.map((e) => e.source.data.authors ?? e.source.data.organisation)).toEqual([
      "Газпром",
      "Иванов И.",
      "Сидоров С.",
      "Johnson B.",
      "Smith A.",
    ]);
    expect(list.map((e) => e.lang)).toEqual(["ru", "ru", "ru", "foreign", "foreign"]);
  });

  it("записи не нумеруются", () => {
    const list = buildBibliography([mono("Иванов И.", "2006", "Книга")]);
    expect(list[0].text).toMatch(/^Иванов И\. 2006\./);
  });

  it("две работы одного автора одного года получают латинские a и b", () => {
    const list = buildBibliography([
      mono("Портер М.", "2005", "Как достичь высокого результата"),
      mono("Портер М.", "2005", "Конкурентная стратегия"),
      mono("Портер М.", "2008", "Другая книга"),
    ]);
    expect(list.map((e) => e.suffix)).toEqual(["a", "b", ""]);
    expect(list[0].text.startsWith("Портер М. 2005a. Как достичь")).toBe(true);
    expect(list[1].text.startsWith("Портер М. 2005b. Конкурентная")).toBe(true);
    // буквы именно латинские
    expect(list[0].suffix.charCodeAt(0)).toBe(97);
  });

  it("в списке приводятся все авторы, даже если их три и более", () => {
    const list = buildBibliography([mono("Петров А., Сидоров Б., Кузнецов В., Орлов Г.", "2010", "Книга")]);
    expect(list[0].text.startsWith("Петров А., Сидоров Б., Кузнецов В., Орлов Г. 2010.")).toBe(true);
  });

  it("язык можно указать вручную", () => {
    const list = buildBibliography([mono("Иванов И.", "2006", "Книга"), mono("Яковлев Я.", "2001", "Book", ), mono("Adams A.", "2000", "Book")]);
    list[2].source.lang = "ru";
    const again = buildBibliography(list.map((e) => e.source));
    expect(again.map((e) => e.lang)).toEqual(["ru", "ru", "ru"]);
  });
});

describe("проверка обязательных полей", () => {
  const fields = (type: Source["type"]) => SOURCE_TYPES.find((t) => t.key === type)!.fields;

  it("для интернет-источника URL обязателен", () => {
    const errors = validateSource(
      "internet",
      { year: "2026", title: "Новость", portal: "РБК", viewed: "2026-11-11", url: "" },
      fields("internet"),
    );
    expect(errors).toContain("Заполните поле «URL»");
  });

  it("URL должен быть полным адресом", () => {
    const errors = validateSource(
      "report",
      { organisation: "ФСГС", year: "2026", title: "Доклад", website: "Сайт", viewed: "2026-11-02", url: "rosstat" },
      fields("report"),
    );
    expect(errors.some((e) => e.includes("http://"))).toBe(true);
  });

  it("для статьи нужен DOI, EDN или ссылка", () => {
    const data = { authors: "Иванов И.", year: "2020", title: "Т", publication: "Ж", pages: "1-2" };
    expect(validateSource("article", data, fields("article"))).toContain(
      "Укажите DOI, код EDN или ссылку на страницу источника",
    );
    expect(validateSource("article", { ...data, edn: "ABCDEF" }, fields("article"))).toEqual([]);
  });
});
