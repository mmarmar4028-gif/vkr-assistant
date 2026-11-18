import { AI_STATEMENT } from "@/requirements";
import type { AiEntry } from "./types";

/**
 * Перечень моделей и целей для заявления по форме Прил. 4:
 * одна строка на модель, цели перечисляются через точку с запятой.
 */
export function aiModelLines(entries: AiEntry[]): string[] {
  const byModel = new Map<string, string[]>();
  const sorted = [...entries].sort((a, b) => (a.used_on ?? "").localeCompare(b.used_on ?? ""));
  for (const e of sorted) {
    const model = e.model.trim();
    const purpose = e.purpose.trim().replace(/[.;]+$/, "");
    if (!model) continue;
    const purposes = byModel.get(model) ?? [];
    if (purpose && !purposes.includes(purpose)) purposes.push(purpose);
    byModel.set(model, purposes);
  }
  return [...byModel.entries()].map(([model, purposes]) =>
    purposes.length ? `${model} – ${purposes.join("; ")}.` : `${model}.`,
  );
}

/** Текст заявления об использовании генеративных моделей (Прил. 4). */
export function aiStatement(fullName: string, topic: string, entries: AiEntry[]) {
  const models = aiModelLines(entries);
  const used = models.length > 0;
  return {
    heading: AI_STATEMENT.heading,
    used,
    opening: AI_STATEMENT.opening(fullName, topic, used),
    models,
    closing: AI_STATEMENT.closing,
  };
}
