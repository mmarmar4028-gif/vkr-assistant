/**
 * Резервная копия данных из браузера: один файл .json со всеми таблицами.
 * Нужна, чтобы не потерять данные при очистке браузера и чтобы перенести
 * их на другое устройство.
 */

/** Все таблицы приложения (совпадают с таблицами в supabase/migrations). */
export const TABLES = [
  "profiles",
  "deadline_states",
  "schedule_items",
  "meetings",
  "checklist_items",
  "sources",
  "figures_tables",
  "assumptions",
  "risks",
  "ai_log",
  "defence_notes",
] as const;

export type TableName = (typeof TABLES)[number];

export const BACKUP_APP = "vkr-assistant";
export const BACKUP_VERSION = 1;

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exported_at: string;
  tables: Record<TableName, Record<string, unknown>[]>;
}

/** Подписи таблиц для экрана резервной копии. */
export const TABLE_LABELS: Record<TableName, string> = {
  profiles: "Профиль",
  deadline_states: "Отметки сроков",
  schedule_items: "Этапы план-графика",
  meetings: "Встречи с руководителем",
  checklist_items: "Отметки чек-листов",
  sources: "Источники",
  figures_tables: "Рисунки и таблицы",
  assumptions: "Допущения",
  risks: "Риски",
  ai_log: "Записи журнала ИИ",
  defence_notes: "Заметки к защите",
};

export function makeBackup(read: (table: TableName) => Record<string, unknown>[], now = new Date()): Backup {
  const tables = {} as Backup["tables"];
  for (const t of TABLES) tables[t] = read(t);
  return { app: BACKUP_APP, version: BACKUP_VERSION, exported_at: now.toISOString(), tables };
}

export function backupFileName(now = new Date()): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return `vkr-backup-${d}.json`;
}

export function countRows(backup: Backup): number {
  return TABLES.reduce((sum, t) => sum + backup.tables[t].length, 0);
}

/** Читает файл резервной копии. При ошибке бросает исключение с понятным текстом. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Файл не похож на резервную копию: он повреждён или это другой файл.");
  }
  const b = data as Partial<Backup> | null;
  if (!b || typeof b !== "object" || b.app !== BACKUP_APP || typeof b.tables !== "object" || !b.tables) {
    throw new Error("Это не резервная копия «Помощника по ВКР».");
  }
  if (typeof b.version !== "number" || b.version > BACKUP_VERSION) {
    throw new Error("Резервная копия сделана более новой версией приложения. Обновите страницу и попробуйте снова.");
  }
  const tables = {} as Backup["tables"];
  for (const t of TABLES) {
    const rows = (b.tables as Record<string, unknown>)[t] ?? [];
    if (!Array.isArray(rows) || rows.some((r) => !r || typeof r !== "object" || Array.isArray(r))) {
      throw new Error(`В резервной копии повреждён раздел «${TABLE_LABELS[t]}».`);
    }
    tables[t] = rows as Record<string, unknown>[];
  }
  return { app: BACKUP_APP, version: b.version, exported_at: String(b.exported_at ?? ""), tables };
}
