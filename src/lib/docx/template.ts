import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TabStopType,
  TableOfContents,
  TextRun,
  type FileChild,
} from "docx";
import {
  ABBREVIATIONS_TITLE,
  ETHICS_STATEMENT,
  INTRO_CONTENT,
  CONCLUSION_CONTENT,
  LIMITS,
  PROGRAMME,
  SECTION_TITLES,
  SIGNATURE_CAPTIONS,
  TITLE_PAGE,
} from "@/requirements";
import { aiStatement } from "../ai-statement";
import { surnameAndName } from "../format";
import type { AiEntry, Profile } from "../types";
import { STYLE, blank, cm, documentStyles, pageNumberFooters, pageProperties, pt } from "./styles";

export interface TemplateInput {
  profile: Profile;
  /** Анонимный экземпляр: номер зачётной книжки вместо имени, без руководителя и заявлений. */
  anonymous: boolean;
  chapters: number;
  indentCm: number;
  abbreviations: boolean;
  /** Готовые записи списка литературы (в нужном порядке). */
  bibliography: string[];
  aiLog: AiEntry[];
}

/** Блок шаблона. Сначала собирается список блоков, затем он превращается в .docx. */
export type Block =
  | { t: "p"; section: string; text: string; style?: string; bold?: boolean; size?: number; leftCm?: number; pageBreak?: boolean; placeholder?: boolean }
  | { t: "h"; section: string; level: 1 | 2 | 3; text: string }
  | { t: "front"; section: string; text: string; style: string }
  | { t: "blank"; section: string; count: number }
  | { t: "toc"; section: string }
  | { t: "sign"; section: string };

const supervisorLine = (p: Profile) => [p.supervisor_degree.trim(), p.supervisor_name.trim()].filter(Boolean).join(", ");

function titlePage(input: TemplateInput): Block[] {
  const { profile: p, anonymous } = input;
  const s = "Титульный лист";
  const right = 9.5;
  const blocks: Block[] = [
    { t: "p", section: s, text: TITLE_PAGE.university, style: STYLE.centered },
    { t: "p", section: s, text: TITLE_PAGE.school, style: STYLE.centered },
    { t: "p", section: s, text: TITLE_PAGE.programme, style: STYLE.centered },
    { t: "blank", section: s, count: 8 },
    {
      t: "p",
      section: s,
      text: (p.topic_ru.trim() || TITLE_PAGE.titlePlaceholder).toLocaleUpperCase("ru"),
      style: STYLE.centered,
      bold: true,
      size: 14,
    },
    { t: "blank", section: s, count: 7 },
  ];
  if (anonymous) {
    blocks.push(
      { t: "p", section: s, text: TITLE_PAGE.recordBookLabel, style: STYLE.noIndent, leftCm: right },
      { t: "p", section: s, text: p.record_book.trim() || TITLE_PAGE.recordBookPlaceholder, style: STYLE.noIndent, leftCm: right },
      { t: "blank", section: s, count: 12 },
    );
  } else {
    blocks.push(
      { t: "p", section: s, text: TITLE_PAGE.doneBy, style: STYLE.noIndent, leftCm: right },
      { t: "p", section: s, text: surnameAndName(p.full_name) || TITLE_PAGE.doneByPlaceholder, style: STYLE.noIndent, leftCm: right },
      { t: "blank", section: s, count: 1 },
      { t: "p", section: s, text: TITLE_PAGE.supervisor, style: STYLE.noIndent, leftCm: right },
      { t: "p", section: s, text: supervisorLine(p) || TITLE_PAGE.supervisorPlaceholder, style: STYLE.noIndent, leftCm: right },
      { t: "blank", section: s, count: 9 },
    );
  }
  blocks.push(
    { t: "p", section: s, text: TITLE_PAGE.city, style: STYLE.centered },
    { t: "p", section: s, text: String(PROGRAMME.defenceYear), style: STYLE.centered },
  );
  return blocks;
}

function statements(input: TemplateInput): Block[] {
  const { profile: p } = input;
  const ethics = "Заявление о соблюдении профессиональной этики";
  const ai = "Заявление об использовании генеративных моделей";
  const st = aiStatement(p.full_name.trim(), p.topic_ru.trim(), input.aiLog);
  return [
    { t: "p", section: ethics, text: ETHICS_STATEMENT.heading, style: STYLE.centered, bold: true, pageBreak: true },
    { t: "blank", section: ethics, count: 1 },
    ...ETHICS_STATEMENT.paragraphs(p.full_name.trim(), p.topic_ru.trim()).map(
      (text): Block => ({ t: "p", section: ethics, text }),
    ),
    { t: "blank", section: ethics, count: 2 },
    { t: "sign", section: ethics },

    { t: "p", section: ai, text: st.heading, style: STYLE.centered, bold: true, pageBreak: true },
    { t: "blank", section: ai, count: 1 },
    { t: "p", section: ai, text: st.opening },
    ...st.models.map((text): Block => ({ t: "p", section: ai, text })),
    { t: "p", section: ai, text: st.closing },
    { t: "blank", section: ai, count: 2 },
    { t: "sign", section: ai },
  ];
}

const listHint = (items: { text: string }[]) => items.map((i) => i.text.charAt(0).toLowerCase() + i.text.slice(1)).join("; ");

/** Содержимое шаблона ВКР в порядке п. 2.6. */
export function buildTemplateBlocks(input: TemplateInput): Block[] {
  const T = SECTION_TITLES;
  const blocks: Block[] = [...titlePage(input)];
  if (!input.anonymous) blocks.push(...statements(input));

  blocks.push(
    { t: "front", section: T.abstractRu, text: T.abstractRu, style: STYLE.frontTitle },
    { t: "blank", section: T.abstractRu, count: 1 },
    {
      t: "p",
      section: T.abstractRu,
      text: `[Текст аннотации на русском языке: не более ${LIMITS.abstractWords.max} слов и не более одной страницы.]`,
      placeholder: true,
    },
    { t: "front", section: T.abstractEn, text: T.abstractEn, style: STYLE.frontTitle },
    { t: "blank", section: T.abstractEn, count: 1 },
    {
      t: "p",
      section: T.abstractEn,
      text: `[Abstract in English: no more than ${LIMITS.abstractWords.max} words and no more than one page.]`,
      placeholder: true,
    },
    { t: "front", section: T.toc, text: T.toc, style: STYLE.tocTitle },
    { t: "blank", section: T.toc, count: 1 },
    { t: "toc", section: T.toc },
  );

  if (input.abbreviations) {
    blocks.push(
      { t: "h", section: ABBREVIATIONS_TITLE, level: 1, text: ABBREVIATIONS_TITLE },
      { t: "blank", section: ABBREVIATIONS_TITLE, count: 1 },
      { t: "p", section: ABBREVIATIONS_TITLE, text: "[Сокращение – расшифровка.]", placeholder: true },
    );
  }

  blocks.push(
    { t: "h", section: T.intro, level: 1, text: T.intro },
    { t: "blank", section: T.intro, count: 1 },
    {
      t: "p",
      section: T.intro,
      text: `[Введение: ${listHint(INTRO_CONTENT)}. Объём – не более ${LIMITS.intro.max} страниц.]`,
      placeholder: true,
    },
  );

  const chapters = Math.min(LIMITS.chapters.max, Math.max(LIMITS.chapters.min, input.chapters));
  for (let n = 1; n <= chapters; n += 1) {
    const s = `${T.chapter} ${n}`;
    blocks.push(
      { t: "h", section: s, level: 1, text: `${T.chapter} ${n}. ${T.chapterPlaceholder}` },
      { t: "blank", section: s, count: 1 },
      { t: "h", section: s, level: 2, text: `${n}.1. ${T.paragraphPlaceholder}` },
      { t: "p", section: s, text: "[Текст параграфа.]", placeholder: true },
      { t: "h", section: s, level: 3, text: `${n}.1.1. ${T.itemPlaceholder}` },
      { t: "p", section: s, text: "[Текст пункта.]", placeholder: true },
    );
  }

  blocks.push(
    { t: "h", section: T.conclusion, level: 1, text: T.conclusion },
    { t: "blank", section: T.conclusion, count: 1 },
    {
      t: "p",
      section: T.conclusion,
      text: `[Заключение: ${listHint(CONCLUSION_CONTENT)}. Объём – не более ${LIMITS.conclusion.max} страниц.]`,
      placeholder: true,
    },
    { t: "h", section: T.bibliography, level: 1, text: T.bibliography },
    { t: "blank", section: T.bibliography, count: 1 },
  );
  if (input.bibliography.length) {
    blocks.push(...input.bibliography.map((text): Block => ({ t: "p", section: T.bibliography, text })));
  } else {
    blocks.push({
      t: "p",
      section: T.bibliography,
      text: "[Записи появятся здесь, когда вы добавите источники в разделе «Список литературы».]",
      placeholder: true,
    });
  }
  const app = `${T.appendix} 1`;
  blocks.push(
    { t: "h", section: app, level: 1, text: `${T.appendix} 1. ${T.appendixPlaceholder}` },
    { t: "blank", section: app, count: 1 },
    { t: "p", section: app, text: "[Материалы приложения. Если приложения не нужны, удалите этот раздел.]", placeholder: true },
  );
  return blocks;
}

/* ---------------- Поиск имён в анонимном экземпляре ---------------- */

export interface NameHit {
  who: "student" | "supervisor";
  name: string;
  section: string;
  snippet: string;
}

/** Основа фамилии для поиска с учётом падежей: «Иванова» → «иванов». */
function stem(word: string): string {
  const w = word.toLocaleLowerCase("ru");
  const cut = w.replace(/(ой|ая|ую|ым|ом|ого|ему|ой|ий|ый|а|я|у|ю|е|ы|и)$/u, "");
  return cut.length >= 4 ? cut : w;
}

function nameTokens(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((t) => t.replace(/[^\p{L}-]/gu, ""))
    .filter((t) => t.length >= 4 && !/\./.test(t));
}

/**
 * Ищет в тексте шаблона упоминания студента и научного руководителя
 * (пп. 3.1.13, 3.1.15: в анонимном экземпляре их быть не должно).
 */
export function findNames(blocks: Block[], profile: Profile): NameHit[] {
  const targets: { who: NameHit["who"]; name: string; needle: string }[] = [];
  const studentSurname = nameTokens(profile.full_name)[0];
  if (studentSurname) targets.push({ who: "student", name: studentSurname, needle: stem(studentSurname) });
  const supervisorSurname = nameTokens(profile.supervisor_name)[0];
  if (supervisorSurname) targets.push({ who: "supervisor", name: supervisorSurname, needle: stem(supervisorSurname) });

  const hits: NameHit[] = [];
  for (const block of blocks) {
    if (!("text" in block)) continue;
    const lower = block.text.toLocaleLowerCase("ru");
    for (const target of targets) {
      const at = lower.indexOf(target.needle);
      if (at < 0) continue;
      const start = Math.max(0, at - 30);
      const snippet = `${start > 0 ? "…" : ""}${block.text.slice(start, at + 60)}${at + 60 < block.text.length ? "…" : ""}`;
      hits.push({ who: target.who, name: target.name, section: block.section, snippet });
    }
  }
  return hits;
}

/* ---------------- Сборка .docx ---------------- */

const HEADING = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3 } as const;

function signatureLines(): Paragraph[] {
  const tab = [{ type: TabStopType.LEFT, position: cm(6) }];
  return [
    new Paragraph({
      style: STYLE.noIndent,
      tabStops: tab,
      children: [new TextRun("_______________\t______________________________________")],
    }),
    new Paragraph({
      style: STYLE.noIndent,
      tabStops: tab,
      children: [new TextRun(`${SIGNATURE_CAPTIONS.sign}\t${SIGNATURE_CAPTIONS.name}`)],
    }),
    ...blank(1),
    new Paragraph({ style: STYLE.noIndent, children: [new TextRun("__________________")] }),
    new Paragraph({ style: STYLE.noIndent, children: [new TextRun(SIGNATURE_CAPTIONS.date)] }),
  ];
}

function render(block: Block): FileChild[] {
  switch (block.t) {
    case "blank":
      return blank(block.count);
    case "h":
      return [new Paragraph({ heading: HEADING[block.level], children: [new TextRun(block.text)] })];
    case "front":
      return [new Paragraph({ style: block.style, children: [new TextRun(block.text)] })];
    case "toc":
      return [new TableOfContents(SECTION_TITLES.toc, { hyperlink: true, headingStyleRange: "1-3" })];
    case "sign":
      return signatureLines();
    case "p":
      return [
        new Paragraph({
          style: block.style,
          pageBreakBefore: block.pageBreak,
          indent: block.leftCm ? { left: cm(block.leftCm), firstLine: 0 } : undefined,
          alignment: block.leftCm ? AlignmentType.LEFT : undefined,
          children: [
            new TextRun({
              text: block.text,
              bold: block.bold,
              size: block.size ? pt(block.size) : undefined,
              color: block.placeholder ? "7F7F7F" : undefined,
            }),
          ],
        }),
      ];
  }
}

export function renderTemplate(blocks: Block[], input: TemplateInput): Document {
  return new Document({
    creator: input.anonymous ? "" : surnameAndName(input.profile.full_name),
    title: input.profile.topic_ru || "ВКР",
    description: "",
    lastModifiedBy: "",
    // Word при открытии предложит обновить оглавление.
    features: { updateFields: true },
    styles: documentStyles(input.indentCm),
    sections: [
      {
        properties: pageProperties(true),
        footers: pageNumberFooters(),
        children: blocks.flatMap(render),
      },
    ],
  });
}

export async function templateBlob(input: TemplateInput): Promise<Blob> {
  return Packer.toBlob(renderTemplate(buildTemplateBlocks(input), input));
}
