/**
 * Проверка генераторов Word: собранный .docx распаковывается и проверяется
 * содержимое word/document.xml и word/styles.xml.
 */
import { inflateRawSync } from "node:zlib";
import { Packer } from "docx";
import { describe, expect, it } from "vitest";
import { assumptionsDocument, scheduleDocument } from "@/lib/docx/exports";
import { buildTemplateBlocks, findNames, renderTemplate, type TemplateInput } from "@/lib/docx/template";
import type { Profile } from "@/lib/types";
import { AI_STATEMENT, ETHICS_STATEMENT, SCHEDULE, STRUCTURE } from "@/requirements";

/** Достаёт файл из zip-архива (.docx) без сторонних библиотек. */
function unzip(buffer: Buffer, name: string): string {
  let offset = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const entries = buffer.readUInt16LE(offset + 10);
  offset = buffer.readUInt32LE(offset + 16);
  for (let i = 0; i < entries; i += 1) {
    const method = buffer.readUInt16LE(offset + 10);
    const size = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const local = buffer.readUInt32LE(offset + 42);
    const entryName = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    if (entryName === name) {
      const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
      const data = buffer.subarray(start, start + size);
      return (method === 0 ? data : inflateRawSync(data)).toString("utf8");
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`В архиве нет файла ${name}`);
}

const text = (xml: string) =>
  xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const profile: Profile = {
  user_id: "u",
  full_name: "Иванова Анна Сергеевна",
  study_group: "ВА-27-2",
  record_book: "02190123",
  topic_ru: "Разработка стратегии развития ООО «Ромашка»",
  topic_en: "Development strategy for Romashka LLC",
  supervisor_degree: "к.э.н., доцент",
  supervisor_name: "Петров П.П.",
  format: "project",
  organisation: "ООО «Ромашка»",
  settings: {},
};

const input = (over: Partial<TemplateInput> = {}): TemplateInput => ({
  profile,
  anonymous: false,
  chapters: 3,
  indentCm: 1.5,
  abbreviations: false,
  bibliography: ["Сидоров С. С. 2020. Стратегия. – М.: Наука, 300 с."],
  aiLog: [],
  ...over,
});

async function build(over: Partial<TemplateInput> = {}) {
  const i = input(over);
  const buffer = await Packer.toBuffer(renderTemplate(buildTemplateBlocks(i), i));
  return { document: unzip(buffer, "word/document.xml"), styles: unzip(buffer, "word/styles.xml"), settings: unzip(buffer, "word/settings.xml") };
}

describe("шаблон ВКР", () => {
  it("оформление по Приложению 7: A4, поля, шрифт, интервал, отступ", async () => {
    const { document, styles } = await build();
    expect(document).toMatch(/<w:pgSz w:w="11906" w:h="16838"/); // 210 x 297 мм
    expect(document).toMatch(/w:top="1134"/); // 20 мм
    expect(document).toMatch(/w:bottom="1134"/);
    expect(document).toMatch(/w:left="1701"/); // 30 мм
    expect(document).toMatch(/w:right="567"/); // 10 мм
    expect(styles).toContain("Times New Roman");
    expect(styles).toMatch(/<w:sz w:val="24"\/>/); // 12 пт
    expect(styles).toMatch(/w:line="360"/); // интервал 1,5
    expect(styles).toMatch(/w:firstLine="850"/); // 1,5 см
    expect(styles).toMatch(/<w:jc w:val="both"\/>/); // по ширине
    expect(styles).toMatch(/<w:sz w:val="28"\/>/); // заголовки разделов 14 пт
    expect(styles).toMatch(/<w:sz w:val="26"\/>/); // второй уровень 13 пт
  });

  it("каждый раздел начинается с новой страницы (Прил. 7, п. 8)", async () => {
    const { styles } = await build();
    const style = (id: string) => {
      const at = styles.indexOf(`w:styleId="${id}"`);
      return styles.slice(at, styles.indexOf("</w:style>", at));
    };
    // главы, введение, заключение, список литературы, приложения — стиль «Заголовок 1»
    expect(style("Heading1")).toContain("<w:pageBreakBefore/>");
    expect(style("TocTitle")).toContain("<w:pageBreakBefore/>");
    expect(style("TocTitle")).toContain('<w:jc w:val="center"/>'); // «Оглавление» по центру
    expect(style("Heading1")).toContain('<w:jc w:val="left"/>');
    expect(style("Heading2")).not.toContain("<w:pageBreakBefore/>");
  });

  it("титульный лист входит в нумерацию, но номер на нём не ставится", async () => {
    const { document } = await build();
    expect(document).toContain("<w:titlePg/>");
    expect(document).toMatch(/<w:footerReference w:type="first"/);
    expect(document).toMatch(/<w:footerReference w:type="default"/);
  });

  it("структура в порядке п. 2.6", async () => {
    const { document } = await build();
    const body = text(document);
    const order = [
      "Московский государственный университет имени М.В. Ломоносова",
      "Высшая школа бизнеса",
      "Программа «Бакалавр»",
      "РАЗРАБОТКА СТРАТЕГИИ РАЗВИТИЯ ООО «РОМАШКА»",
      "Выполнил:",
      "Иванова Анна",
      "Научный руководитель:",
      "к.э.н., доцент, Петров П.П.",
      "Москва",
      "2027",
      "ЗАЯВЛЕНИЕ О СОБЛЮДЕНИИ ПРОФЕССИОНАЛЬНОЙ ЭТИКИ",
      "ЗАЯВЛЕНИЕ ОБ ИСПОЛЬЗОВАНИИ ГЕНЕРАТИВНЫХ МОДЕЛЕЙ",
      "Аннотация",
      "Abstract",
      "Оглавление",
      "Введение",
      "Глава 1. Название главы",
      "1.1. Название параграфа",
      "1.1.1. Название пункта",
      "Глава 2. Название главы",
      "Глава 3. Название главы",
      "Заключение",
      "Список литературы",
      "Сидоров С. С. 2020. Стратегия. – М.: Наука, 300 с.",
      "Приложение 1. Название приложения",
    ];
    let at = -1;
    for (const piece of order) {
      const next = body.indexOf(piece, at + 1);
      expect(next, `«${piece}» должен идти после предыдущего элемента`).toBeGreaterThan(at);
      at = next;
    }
    expect(body).not.toContain("Глава 4.");
    expect(STRUCTURE).toHaveLength(10);
  });

  it("оглавление — поле Word, которое обновляется", async () => {
    const { document, settings } = await build();
    expect(document).toMatch(/TOC \\h[^<]*\\o &quot;1-3&quot;|TOC[^<]*1-3/);
    expect(settings).toContain("w:updateFields");
  });

  it("количество глав настраивается от 2 до 4", async () => {
    expect(text((await build({ chapters: 2 })).document)).not.toContain("Глава 3.");
    expect(text((await build({ chapters: 4 })).document)).toContain("Глава 4. Название главы");
    expect(text((await build({ chapters: 9 })).document)).not.toContain("Глава 5.");
  });

  it("заявление по форме Прил. 3 — дословно, с ФИО и темой", async () => {
    const body = text((await build()).document);
    for (const paragraph of ETHICS_STATEMENT.paragraphs(profile.full_name, profile.topic_ru)) {
      expect(body).toContain(paragraph);
    }
    expect(body).toContain(
      "Я, Иванова Анна Сергеевна, студент бакалавриата Высшей школы бизнеса МГУ имени М.В. Ломоносова, заявляю, что в моей выпускной квалификационной работе на тему «Разработка стратегии развития ООО «Ромашка»», представленной в государственную экзаменационную комиссию для публичной защиты, соблюдены правила профессиональной этики, не допускающие наличия плагиата, фальсификации данных и ложного цитирования при написании выпускных квалификационных работ.",
    );
    expect(body).toContain("подпись\tрасшифровка подписи");
    expect(body).toContain("дата");
  });

  it("заявление по форме Прил. 4: без записей в журнале — «не были использованы»", async () => {
    const body = text((await build()).document);
    expect(body).toContain("мною не были использованы технологии искусственного интеллекта.");
    expect(body).toContain(AI_STATEMENT.closing);
  });

  it("заявление по форме Прил. 4: с записями — «были использованы» и перечень моделей и целей", async () => {
    const body = text(
      (
        await build({
          aiLog: [
            { id: "1", used_on: "2027-01-10", model: "Модель А", purpose: "проверка орфографии" },
            { id: "2", used_on: "2027-02-01", model: "Модель А", purpose: "перевод аннотации." },
            { id: "3", used_on: "2027-02-05", model: "Модель Б", purpose: "поиск источников" },
          ],
        })
      ).document,
    );
    expect(body).toContain("мною были использованы технологии искусственного интеллекта.");
    expect(body).not.toContain("не были использованы");
    expect(body).toContain("Модель А – проверка орфографии; перевод аннотации.");
    expect(body).toContain("Модель Б – поиск источников.");
  });

  it("раздел «Список используемых сокращений» добавляется между оглавлением и введением", async () => {
    const body = text((await build({ abbreviations: true })).document);
    expect(body.indexOf("Список используемых сокращений")).toBeGreaterThan(body.indexOf("Оглавление"));
    expect(body.indexOf("Список используемых сокращений")).toBeLessThan(body.indexOf("Введение"));
  });
});

describe("анонимный экземпляр", () => {
  it("номер зачётной книжки вместо имени, без руководителя и без заявлений", async () => {
    const body = text((await build({ anonymous: true })).document);
    expect(body).toContain("02190123");
    expect(body).not.toContain("Иванова");
    expect(body).not.toContain("Петров");
    expect(body).not.toContain("Выполнил:");
    expect(body).not.toContain("Научный руководитель");
    expect(body).not.toContain("ЗАЯВЛЕНИЕ");
    expect(body).toContain("Аннотация");
  });

  it("поиск имён: в чистом шаблоне ничего не найдено", () => {
    expect(findNames(buildTemplateBlocks(input({ anonymous: true })), profile)).toEqual([]);
  });

  it("поиск имён: находит руководителя в списке литературы и студента в теме (с учётом падежа)", () => {
    const withNames = input({
      anonymous: true,
      profile: { ...profile, topic_ru: "Исследование Ивановой А.С. рынка" },
      bibliography: ["Петров П. П. 2021. Управление. – М.: Наука, 200 с."],
    });
    const hits = findNames(buildTemplateBlocks(withNames), withNames.profile);
    expect(hits.map((h) => `${h.who}:${h.section}`)).toEqual(["student:Титульный лист", "supervisor:Список литературы"]);
  });
});

describe("План-график (Прил. 9)", () => {
  it("содержит тексты формы дословно, а столбцы руководителя остаются пустыми", async () => {
    const doc = scheduleDocument(profile, [
      { id: "1", position: 1, title: "Глава 1: анализ организации", due_date: "2026-12-20", actual_date: "2026-12-22", done: true },
      { id: "2", position: 2, title: "Глава 2: разработка решения", due_date: "2027-02-01", actual_date: null, done: false },
    ]);
    const body = text(unzip(await Packer.toBuffer(doc), "word/document.xml"));
    const F = SCHEDULE.form;
    for (const piece of [
      "УТВЕРЖДАЮ",
      "Ф.И.О. науч. руководителя",
      "Подпись",
      "Дата утверждения",
      "ПЛАН-ГРАФИК ПОДГОТОВКИ ВКР НА ТЕМУ:",
      "Тема: Разработка стратегии развития ООО «Ромашка»",
      "Студент Ф.И.О.: Иванова Анна Сергеевна",
      "Учебная группа: ВА-27-2",
      "Наименование блока (раздела) и виды работ по подготовке ВКР*",
      "Срок выполнения*",
      "Фактическая дата встречи / обсуждения**",
      "Отметка о выполнении, подпись научного руководителя**",
      "* Заполняется студентом и согласовывается с научным руководителем.",
      "** Заполняется научным руководителем при очных встречах-обсуждениях хода выполнения ВКР со студентом",
      "Итого количество проведенных с научным руководителем очных встреч: _____",
      "Студент:",
      "Научный руководитель:",
      F.attention,
    ]) {
      expect(body, piece).toContain(piece);
    }
    expect(body).toContain("Глава 1: анализ организации");
    expect(body).toContain("20.12.2026");
    // фактическая дата встречи в экспорт не попадает
    expect(body).not.toContain("22.12.2026");
    // в форме не меньше пяти строк
    expect(body).toContain("5.");
  });
});

describe("экспорт допущений и рисков", () => {
  it("содержит обе таблицы и тип данных", async () => {
    const doc = assumptionsDocument(
      profile,
      [{ id: "a", text: "Рост рынка 5% в год", used_in: "Глава 3, финансовая модель", basis: "ФСГС 2026", data_type: "source" }],
      [{ id: "r", text: "Рост ключевой ставки", probability: "Средняя", impact: "Высокое", response: "Сценарный анализ" }],
    );
    const body = text(unzip(await Packer.toBuffer(doc), "word/document.xml"));
    for (const piece of ["Рост рынка 5% в год", "из источника", "Рост ключевой ставки", "Сценарный анализ", "Реагирование"]) {
      expect(body).toContain(piece);
    }
  });
});
