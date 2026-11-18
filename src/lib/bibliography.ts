import type { SourceType } from "@/requirements";

/** Источник в том виде, в котором он хранится в базе. */
export interface Source {
  id: string;
  type: SourceType;
  /** Язык источника: null — определить автоматически по первой букве записи. */
  lang: "ru" | "foreign" | null;
  /** Поля формы (см. SOURCE_TYPES в файле требований). */
  data: Record<string, string>;
  url_checked: boolean;
  created_at?: string;
}

export interface BibliographyEntry {
  source: Source;
  lang: "ru" | "foreign";
  year: string;
  /** Буква после года для двух работ одного автора одного года: "", "a", "b"… */
  suffix: string;
  /** Готовая запись для списка литературы. */
  text: string;
}

const clean = (s: string | undefined | null) => (s ?? "").trim().replace(/\s+/g, " ");

/** «Коупленд Т., Коллер Т., Мурин Дж.» → ["Коупленд Т.", "Коллер Т.", "Мурин Дж."] */
export function parseAuthors(raw: string | undefined | null): string[] {
  return (raw ?? "")
    .split(/[,;\n]/)
    .map((a) => clean(a))
    .filter(Boolean);
}

/** ГГГГ-ММ-ДД → ДД.ММ.ГГГГ. Остальные строки возвращаются как есть. */
export function formatDate(iso: string | undefined | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean(iso));
  return m ? `${m[3]}.${m[2]}.${m[1]}` : clean(iso);
}

/** С чего начинается запись: авторы либо организация / портал / источник получения. */
export function leadOf(source: Source): string {
  const d = source.data;
  switch (source.type) {
    case "monograph":
    case "article":
      return parseAuthors(d.authors).join(", ");
    case "legal":
      return clean(d.obtainedFrom);
    case "internet": {
      const authors = parseAuthors(d.authors);
      return authors.length ? authors.join(", ") : clean(d.portal);
    }
    case "report":
      return clean(d.organisation);
  }
}

export function yearOf(source: Source): string {
  if (source.type === "legal") {
    const m = /^(\d{4})-/.exec(clean(source.data.adopted));
    return m ? m[1] : clean(source.data.year);
  }
  return clean(source.data.year);
}

export function langOf(source: Source): "ru" | "foreign" {
  if (source.lang === "ru" || source.lang === "foreign") return source.lang;
  const first = leadOf(source).replace(/^[^\p{L}]+/u, "").charAt(0);
  return /[А-Яа-яЁё]/.test(first) || first === "" ? "ru" : "foreign";
}

/** DOI → https://doi.org/…; код EDN → «EDN: КОД»; иначе ссылка на страницу источника. */
export function articleLink(d: Record<string, string>): string {
  const doi = clean(d.doi);
  if (doi) {
    if (/^https?:\/\//i.test(doi)) return doi;
    return `https://doi.org/${doi.replace(/^doi:\s*/i, "")}`;
  }
  const edn = clean(d.edn);
  if (edn) return `EDN: ${edn.replace(/^edn:?\s*/i, "")}`;
  return clean(d.url);
}

/** Запись в формате примеров Приложения 6. */
export function formatEntry(source: Source, suffix = ""): string {
  const d = source.data;
  const head = `${leadOf(source)} ${yearOf(source)}${suffix}.`;
  switch (source.type) {
    case "monograph": {
      const title = clean(d.title).replace(/\.$/, "");
      const edition = clean(d.edition);
      return `${head} ${title}.${edition ? ` – ${edition}` : ""} – ${clean(d.place)}: ${clean(d.publisher)}, ${clean(d.pages)} с.`;
    }
    case "article": {
      const issue = clean(d.issue);
      const link = articleLink(d);
      return `${head} ${clean(d.title)} // ${clean(d.publication)}${issue ? `, ${issue}` : ""}, с. ${clean(d.pages)}.${link ? ` ${link}` : ""}`;
    }
    case "legal": {
      const issuer = clean(d.issuer);
      return `${head} ${clean(d.docType)}${issuer ? ` ${issuer}` : ""} «${clean(d.title)}» от ${formatDate(d.adopted)} N ${clean(d.number)}, просмотрено ${formatDate(d.viewed)}, ${clean(d.url)}`;
    }
    case "internet": {
      const published = clean(d.published);
      return `${head} ${clean(d.title)} // ${clean(d.portal)}${published ? `, ${published}` : ""}, просмотрено ${formatDate(d.viewed)}, ${clean(d.url)}`;
    }
    case "report":
      return `${head} ${clean(d.title)} // ${clean(d.website)}, просмотрено ${formatDate(d.viewed)}, ${clean(d.url)}`;
  }
}

const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });

function compareSources(a: Source, b: Source): number {
  const la = langOf(a);
  const lb = langOf(b);
  if (la !== lb) return la === "ru" ? -1 : 1;
  return (
    collator.compare(leadOf(a), leadOf(b)) ||
    collator.compare(yearOf(a), yearOf(b)) ||
    collator.compare(clean(a.data.title), clean(b.data.title)) ||
    collator.compare(a.created_at ?? "", b.created_at ?? "")
  );
}

/**
 * Готовый список литературы: сначала источники на русском языке по алфавиту,
 * затем на иностранных; без нумерации; две работы одного автора одного года
 * получают латинские буквы a, b… (Прил. 6; Прил. 7, п. 14).
 */
export function buildBibliography(sources: Source[]): BibliographyEntry[] {
  const sorted = [...sources].sort(compareSources);
  const groups = new Map<string, Source[]>();
  for (const s of sorted) {
    const key = `${leadOf(s).toLocaleLowerCase("ru")}|${yearOf(s)}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  const suffixes = new Map<string, string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.forEach((s, i) => suffixes.set(s.id, String.fromCharCode(97 + i)));
  }
  return sorted.map((source) => {
    const suffix = suffixes.get(source.id) ?? "";
    return { source, lang: langOf(source), year: yearOf(source), suffix, text: formatEntry(source, suffix) };
  });
}

/** Проверка обязательных полей. Возвращает список сообщений об ошибках. */
export function validateSource(
  type: SourceType,
  data: Record<string, string>,
  fields: { key: string; label: string; required?: boolean; kind?: string }[],
): string[] {
  const errors: string[] = [];
  for (const f of fields) {
    const value = clean(data[f.key]);
    if (f.required && !value) errors.push(`Заполните поле «${f.label}»`);
    if (value && f.kind === "url" && !/^https?:\/\/\S+\.\S+/i.test(value)) {
      errors.push(`«${f.label}»: укажите полный адрес, начиная с http:// или https://`);
    }
    if (value && f.kind === "year" && !/^\d{4}$/.test(value)) {
      errors.push(`«${f.label}»: укажите год четырьмя цифрами`);
    }
  }
  if (type === "article" && !clean(data.doi) && !clean(data.edn) && !clean(data.url)) {
    errors.push("Укажите DOI, код EDN или ссылку на страницу источника");
  }
  return errors;
}
