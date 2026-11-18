export { formatDate } from "./bibliography";

/** Сегодняшняя дата по местному времени в формате ГГГГ-ММ-ДД. */
export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const toUTC = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Сколько дней от `from` до `to` (отрицательное число — дата уже прошла). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUTC(to) - toUTC(from)) / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const date = new Date(toUTC(iso) + days * 86_400_000);
  return date.toISOString().slice(0, 10);
}

/** Склонение: plural(5, ["день", "дня", "дней"]) → «дней». */
export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

/**
 * Подсчёт слов так же, как в Word: слово — любая последовательность
 * символов между пробелами.
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** «Бабаян Мария Георгиевна» → «Бабаян Мария» (на титульном листе: Фамилия, Имя). */
export function surnameAndName(fullName: string): string {
  return fullName.trim().split(/\s+/).slice(0, 2).join(" ");
}

/** «Бабаян Мария Георгиевна» → «Бабаян М.Г.» */
export function surnameWithInitials(fullName: string): string {
  const [surname, ...rest] = fullName.trim().split(/\s+/).filter(Boolean);
  if (!surname) return "";
  const initials = rest.map((part) => `${part.charAt(0).toUpperCase()}.`).join("");
  return initials ? `${surname} ${initials}` : surname;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}
