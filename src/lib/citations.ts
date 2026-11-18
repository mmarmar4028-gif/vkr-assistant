import { CITATION_WORDS } from "@/requirements";
import { leadOf, parseAuthors, type BibliographyEntry, type Source } from "./bibliography";

const INITIALS = /^(\p{Lu}\p{Ll}{0,2}\.)+$/u;

/** «Клейнер Г. Б.» → «Клейнер»; «Мурин Дж.» → «Мурин»; «РБК» → «РБК». */
export function surnameOf(author: string): string {
  const tokens = author.trim().split(/\s+/);
  while (tokens.length > 1 && INITIALS.test(tokens[tokens.length - 1])) tokens.pop();
  return tokens.join(" ");
}

/** Фамилии для ссылки: авторы, а если их нет — организация или портал. */
export function citationNames(source: Source): string[] {
  const hasAuthors = source.type === "monograph" || source.type === "article" || source.type === "internet";
  const authors = hasAuthors ? parseAuthors(source.data.authors) : [];
  return authors.length ? authors.map(surnameOf) : [leadOf(source)];
}

/** Фамилия (фамилии) в ссылке: один автор, два автора или «и др.» / «et al.» (Прил. 7, п. 16). */
export function citationName(entry: BibliographyEntry): string {
  const names = citationNames(entry.source);
  if (names.length >= 3) {
    return `${names[0]} ${entry.lang === "ru" ? CITATION_WORDS.etAlRu : CITATION_WORDS.etAlForeign}`;
  }
  return names.join(", ");
}

const core = (entry: BibliographyEntry) => `${citationName(entry)}, ${entry.year}${entry.suffix}`;

/**
 * Ссылка без цитаты: (Иванов, 2006). Несколько работ — через точку с запятой
 * в порядке списка литературы (Прил. 7, пп. 13, 15).
 * @param entries выбранные записи
 * @param order полный список литературы, задающий порядок
 */
export function citeParenthetical(entries: BibliographyEntry[], order?: BibliographyEntry[]): string {
  const sorted = order
    ? [...entries].sort(
        (a, b) =>
          order.findIndex((e) => e.source.id === a.source.id) - order.findIndex((e) => e.source.id === b.source.id),
      )
    : entries;
  return `(${sorted.map(core).join("; ")})`;
}

/** Цитата с номерами страниц: [Петров, 2006, с. 123-124] (Прил. 7, п. 13). */
export function citeQuote(entry: BibliographyEntry, pages: string): string {
  const p = pages.trim();
  return `[${core(entry)}${p ? `, ${CITATION_WORDS.page} ${p}` : ""}]`;
}

/** Цитата не по первоисточнику: [Смитт, цит. по Иванов, 2010, с. 35] (Прил. 7, п. 17). */
export function citeSecondary(quotedAuthor: string, entry: BibliographyEntry, pages: string): string {
  const p = pages.trim();
  return `[${quotedAuthor.trim()}, ${CITATION_WORDS.citedBy} ${core(entry)}${p ? `, ${CITATION_WORDS.page} ${p}` : ""}]`;
}
