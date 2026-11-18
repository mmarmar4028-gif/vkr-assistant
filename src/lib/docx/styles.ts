import {
  AlignmentType,
  Footer,
  LineRuleType,
  PageNumber,
  Paragraph,
  TextRun,
  type ISectionPropertiesOptions,
  type IStylesOptions,
} from "docx";
import { FORMATTING } from "@/requirements";

/** Миллиметры → twip (1/1440 дюйма), с округлением до ближайшего. */
export const mm = (value: number) => Math.round((value * 1440) / 25.4);
export const cm = (value: number) => mm(value * 10);
/** Размер шрифта задаётся в полупунктах. */
export const pt = (value: number) => value * 2;

const FONT = FORMATTING.font.name;
const LINE = Math.round(FORMATTING.lineSpacing.value * 240);
const SPACING = { line: LINE, lineRule: LineRuleType.AUTO, before: 0, after: 0 };

// Библиотека docx записывает это свойство в стиль, хотя в её типах для стилей его нет.
const PAGE_BREAK = { pageBreakBefore: true };

export const STYLE = {
  noIndent: "NoIndent",
  centered: "Centered",
  frontTitle: "FrontTitle",
  tocTitle: "TocTitle",
  small: "SmallNote",
} as const;

/** Стили документа по Приложению 7. */
export function documentStyles(indentCm: number): IStylesOptions {
  const heading = (id: string, name: string, size: number, level: number, pageBreakBefore: boolean) => ({
    id,
    name,
    basedOn: "Normal",
    next: "Normal",
    quickFormat: true,
    run: { font: FONT, size: pt(size), bold: true },
    paragraph: {
      alignment: AlignmentType.LEFT,
      indent: { firstLine: 0 },
      spacing: SPACING,
      keepNext: true,
      keepLines: true,
      pageBreakBefore,
      outlineLevel: level,
    },
  });
  const toc = (id: string, name: string, leftCm: number) => ({
    id,
    name,
    basedOn: "Normal",
    next: "Normal",
    run: { font: FONT, size: pt(FORMATTING.font.sizePt) },
    paragraph: { alignment: AlignmentType.LEFT, indent: { firstLine: 0, left: cm(leftCm) }, spacing: SPACING },
  });
  return {
    default: {
      document: {
        run: { font: FONT, size: pt(FORMATTING.font.sizePt), language: { value: "ru-RU" } },
        paragraph: { spacing: SPACING },
      },
    },
    paragraphStyles: [
      {
        id: "Normal",
        name: "Normal",
        quickFormat: true,
        run: { font: FONT, size: pt(FORMATTING.font.sizePt) },
        paragraph: {
          alignment: AlignmentType.BOTH,
          indent: { firstLine: cm(indentCm) },
          spacing: SPACING,
        },
      },
      heading("Heading1", "heading 1", FORMATTING.headings.level1Pt, 0, true),
      heading("Heading2", "heading 2", FORMATTING.headings.level2Pt, 1, false),
      heading("Heading3", "heading 3", FORMATTING.headings.level3Pt, 2, false),
      toc("TOC1", "toc 1", 0),
      toc("TOC2", "toc 2", 0.5),
      toc("TOC3", "toc 3", 1),
      {
        id: STYLE.noIndent,
        name: "Без отступа",
        basedOn: "Normal",
        quickFormat: true,
        paragraph: { alignment: AlignmentType.LEFT, indent: { firstLine: 0 }, spacing: SPACING },
      },
      {
        id: STYLE.centered,
        name: "По центру",
        basedOn: "Normal",
        quickFormat: true,
        paragraph: { alignment: AlignmentType.CENTER, indent: { firstLine: 0 }, spacing: SPACING },
      },
      {
        // Заголовок раздела, который не попадает в оглавление (аннотации).
        id: STYLE.frontTitle,
        name: "Заголовок без оглавления",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { font: FONT, size: pt(FORMATTING.headings.level1Pt), bold: true },
        paragraph: {
          alignment: AlignmentType.LEFT,
          indent: { firstLine: 0 },
          spacing: SPACING,
          keepNext: true,
          ...PAGE_BREAK,
        },
      },
      {
        // Слово «Оглавление» — по центру (Прил. 7, п. 7).
        id: STYLE.tocTitle,
        name: "Заголовок оглавления",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { font: FONT, size: pt(FORMATTING.headings.level1Pt), bold: true },
        paragraph: {
          alignment: AlignmentType.CENTER,
          indent: { firstLine: 0 },
          spacing: SPACING,
          keepNext: true,
          ...PAGE_BREAK,
        },
      },
      {
        id: STYLE.small,
        name: "Примечание",
        basedOn: "Normal",
        run: { font: FONT, size: pt(10) },
        paragraph: {
          alignment: AlignmentType.LEFT,
          indent: { firstLine: 0 },
          spacing: { line: 240, lineRule: LineRuleType.AUTO, before: 0, after: 0 },
        },
      },
    ],
  };
}

/** Лист A4 и поля по Прил. 7, п. 3. */
export function pageProperties(titlePage: boolean): ISectionPropertiesOptions {
  const { top, bottom, left, right } = FORMATTING.marginsMm;
  return {
    page: {
      size: { width: mm(FORMATTING.page.widthMm), height: mm(FORMATTING.page.heightMm) },
      margin: { top: mm(top), bottom: mm(bottom), left: mm(left), right: mm(right), header: mm(10), footer: mm(10) },
    },
    titlePage,
  };
}

/**
 * Сквозная нумерация арабскими цифрами. Титульный лист входит в нумерацию,
 * но номер на нём не ставится (Прил. 7, п. 5).
 */
export function pageNumberFooters() {
  return {
    default: new Footer({
      children: [
        new Paragraph({
          style: STYLE.centered,
          children: [new TextRun({ children: [PageNumber.CURRENT] })],
        }),
      ],
    }),
    first: new Footer({ children: [new Paragraph({ style: STYLE.centered, children: [] })] }),
  };
}

export const blank = (count = 1, style: string = STYLE.noIndent) =>
  Array.from({ length: count }, () => new Paragraph({ style, children: [] }));
