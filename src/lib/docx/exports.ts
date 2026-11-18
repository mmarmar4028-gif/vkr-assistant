import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { DATA_TYPES, SCHEDULE, SECTION_TITLES } from "@/requirements";
import { formatDate, surnameWithInitials } from "../format";
import type { Assumption, Profile, Risk, ScheduleItem } from "../types";
import { STYLE, blank, cm, documentStyles, mm, pageProperties, pt } from "./styles";

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

function cell(text: string, widthMm: number, opts: { bold?: boolean; center?: boolean; size?: number } = {}) {
  return new TableCell({
    width: { size: mm(widthMm), type: WidthType.DXA },
    borders: BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: mm(1), bottom: mm(1), left: mm(1.5), right: mm(1.5) },
    children: text.split("\n").map(
      (line) =>
        new Paragraph({
          style: STYLE.small,
          alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new TextRun({ text: line, bold: opts.bold, size: pt(opts.size ?? 11) })],
        }),
    ),
  });
}

function table(widthsMm: number[], header: string[], rows: string[][]) {
  return new Table({
    width: { size: mm(widthsMm.reduce((a, b) => a + b, 0)), type: WidthType.DXA },
    columnWidths: widthsMm.map(mm),
    rows: [
      new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, widthsMm[i], { bold: true, center: true })) }),
      ...rows.map((r) => new TableRow({ children: r.map((text, i) => cell(text, widthsMm[i])) })),
    ],
  });
}

const line = (text: string, opts: { bold?: boolean; style?: string; size?: number } = {}) =>
  new Paragraph({
    style: opts.style ?? STYLE.noIndent,
    children: [new TextRun({ text, bold: opts.bold, size: opts.size ? pt(opts.size) : undefined })],
  });

/* ---------------- План-график (Прил. 9) ---------------- */

/**
 * План-график строго по форме Приложения 9. Столбцы «Фактическая дата
 * встречи / обсуждения» и «Отметка о выполнении, подпись научного
 * руководителя» остаются пустыми: их заполняет руководитель от руки.
 */
export function scheduleDocument(profile: Profile, items: ScheduleItem[]): Document {
  const F = SCHEDULE.form;
  const sorted = [...items].sort((a, b) => a.position - b.position);
  const rows = sorted.map((item, i) => [`${i + 1}.`, item.title, formatDate(item.due_date), "", ""]);
  for (let i = rows.length; i < F.minRows; i += 1) rows.push([`${i + 1}.`, "", "", "", ""]);

  const right = (text: string, bold = false) =>
    new Paragraph({
      style: STYLE.noIndent,
      indent: { left: cm(9.5), firstLine: 0 },
      children: [new TextRun({ text, bold })],
    });
  const signature = (label: string) => [
    line(label),
    line("____________________________________________________________________________"),
    new Paragraph({
      style: STYLE.small,
      tabStops: [
        { type: TabStopType.LEFT, position: cm(6) },
        { type: TabStopType.LEFT, position: cm(12.5) },
      ],
      indent: { left: cm(1), firstLine: 0 },
      children: [new TextRun(F.signCaption.join("\t"))],
    }),
  ];

  return new Document({
    creator: "",
    title: "План-график подготовки ВКР",
    styles: documentStyles(0),
    sections: [
      {
        properties: pageProperties(false),
        children: [
          right(F.approve[0], true),
          right(`${F.approve[1]} ______________________`),
          right(`${F.approve[2]} ______________________`),
          right(`${F.approve[3]} ______________________`),
          ...blank(1),
          new Paragraph({ style: STYLE.centered, children: [new TextRun({ text: F.heading, bold: true })] }),
          ...blank(1),
          line(`${F.topic} ${profile.topic_ru.trim()}`),
          line(`${F.student} ${profile.full_name.trim()}`),
          line(`${F.group} ${profile.study_group.trim()}`),
          ...blank(1),
          table([10, 70, 28, 30, 32], [...F.columns], rows),
          ...blank(1),
          line(F.footnote1, { style: STYLE.small }),
          line(F.footnote2, { style: STYLE.small }),
          ...blank(1),
          line(F.attention, { style: STYLE.small }),
          ...blank(1),
          line(F.afterWork),
          line(F.total),
          ...blank(1),
          ...signature(F.signStudent),
          ...blank(1),
          ...signature(F.signSupervisor),
        ],
      },
    ],
  });
}

/* ---------------- Список литературы ---------------- */

export function bibliographyDocument(entries: string[], indentCm: number): Document {
  return new Document({
    creator: "",
    title: SECTION_TITLES.bibliography,
    styles: documentStyles(indentCm),
    sections: [
      {
        properties: pageProperties(false),
        children: [
          new Paragraph({
            style: STYLE.noIndent,
            children: [new TextRun({ text: SECTION_TITLES.bibliography, bold: true, size: pt(14) })],
          }),
          ...blank(1),
          ...entries.map((text) => new Paragraph({ children: [new TextRun(text)] })),
        ],
      },
    ],
  });
}

/* ---------------- Допущения и риски ---------------- */

export function assumptionsDocument(profile: Profile, assumptions: Assumption[], risks: Risk[]): Document {
  const typeLabel = (key: string) => DATA_TYPES.find((d) => d.key === key)?.label ?? "";
  return new Document({
    creator: "",
    title: "Допущения и риски",
    styles: documentStyles(0),
    sections: [
      {
        properties: pageProperties(false),
        children: [
          line("Допущения и риски", { bold: true, size: 14 }),
          ...(profile.topic_ru.trim() ? [line(`Тема ВКР: ${profile.topic_ru.trim()}`)] : []),
          ...blank(1),
          line("Допущения, лежащие в основе анализа и расчётов", { bold: true }),
          ...blank(1),
          table(
            [10, 55, 40, 40, 25],
            ["№", "Допущение", "Где используется", "Основание", "Тип данных"],
            assumptions.length
              ? assumptions.map((a, i) => [String(i + 1), a.text, a.used_in, a.basis, typeLabel(a.data_type)])
              : [["", "", "", "", ""]],
          ),
          ...blank(1),
          line("Риски внедрения рекомендаций", { bold: true }),
          ...blank(1),
          table(
            [10, 60, 25, 30, 45],
            ["№", "Риск", "Вероятность", "Влияние", "Реагирование"],
            risks.length
              ? risks.map((r, i) => [String(i + 1), r.text, r.probability, r.impact, r.response])
              : [["", "", "", "", ""]],
          ),
        ],
      },
    ],
  });
}

export const toBlob = (doc: Document) => Packer.toBlob(doc);

/** Имя файла: «Иванов И.И.» → «Иванов_ИИ». */
export function fileStem(profile: Profile): string {
  const name = surnameWithInitials(profile.full_name).replace(/\./g, "").replace(/\s+/g, "_");
  return name || "ВКР";
}
