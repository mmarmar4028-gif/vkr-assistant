/**
 * Проверка Row Level Security без Docker и без облака.
 *
 * Миграции из supabase/migrations выполняются в настоящем Postgres,
 * запущенном внутри процесса (PGlite). Схема auth имитируется так же,
 * как в Supabase: функция auth.uid() читает идентификатор пользователя
 * из настроек запроса, а роль authenticated не является суперпользователем.
 *
 * Создаются два тестовых пользователя; проверяется, что один не видит
 * и не может изменить данные другого.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const ALICE = "11111111-1111-1111-1111-111111111111";
const BOB = "22222222-2222-2222-2222-222222222222";

/** Таблицы и минимальная строка для вставки в каждую. */
const TABLES: Record<string, { cols: string; vals: string; set: string }> = {
  profiles: { cols: "full_name", vals: "'Студент'", set: "full_name = 'взлом'" },
  deadline_states: { cols: "stage_key, done", vals: "'defence', true", set: "done = false" },
  schedule_items: { cols: "title", vals: "'Глава 1'", set: "title = 'взлом'" },
  meetings: { cols: "summary", vals: "'Резюме встречи'", set: "summary = 'взлом'" },
  checklist_items: { cols: "scope, item_key", vals: "'structure', 'title'", set: "note = 'взлом'" },
  sources: { cols: "type, data", vals: "'monograph', '{\"title\":\"Книга\"}'", set: "url_checked = true" },
  figures_tables: { cols: "kind, title", vals: "'figure', 'Рисунок'", set: "title = 'взлом'" },
  assumptions: { cols: "text", vals: "'Допущение'", set: "text = 'взлом'" },
  risks: { cols: "text", vals: "'Риск'", set: "text = 'взлом'" },
  ai_log: { cols: "model, purpose", vals: "'Модель', 'Цель'", set: "model = 'взлом'" },
  defence_notes: { cols: "criterion_key, notes", vals: "'relevance', 'Заметка'", set: "notes = 'взлом'" },
};

let db: PGlite;

/** Выполняет запрос от имени пользователя (или анонимно, если uid не задан). */
async function as<T = Record<string, unknown>>(uid: string | null, sql: string): Promise<T[]> {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
  await db.exec(`set role ${uid ? "authenticated" : "anon"};`);
  try {
    const res = await db.query<T>(sql);
    return res.rows;
  } finally {
    await db.exec("reset role;");
  }
}

beforeAll(async () => {
  db = new PGlite();
  // Имитация окружения Supabase.
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    insert into auth.users (id) values ('${ALICE}'), ('${BOB}');
  `);
  const dir = join(process.cwd(), "supabase", "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(dir, file), "utf8"));
  }
  // Каждый пользователь создаёт по строке в каждой таблице.
  for (const uid of [ALICE, BOB]) {
    for (const [table, row] of Object.entries(TABLES)) {
      await as(uid, `insert into public.${table} (${row.cols}) values (${row.vals})`);
    }
  }
});

describe("Row Level Security", () => {
  it("на каждой таблице схемы public включён RLS и есть политика", async () => {
    const rows = await db.query<{ relname: string; relrowsecurity: boolean; policies: number }>(`
      select c.relname, c.relrowsecurity,
             (select count(*)::int from pg_policy p where p.polrelid = c.oid) as policies
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' order by c.relname
    `);
    expect(rows.rows.map((r) => r.relname).sort()).toEqual(Object.keys(TABLES).sort());
    for (const r of rows.rows) {
      expect(r.relrowsecurity, `RLS на ${r.relname}`).toBe(true);
      expect(r.policies, `политика на ${r.relname}`).toBeGreaterThan(0);
    }
  });

  for (const [table, row] of Object.entries(TABLES)) {
    describe(table, () => {
      it("пользователь видит только свои строки", async () => {
        const alice = await as<{ user_id: string }>(ALICE, `select user_id from public.${table}`);
        const bob = await as<{ user_id: string }>(BOB, `select user_id from public.${table}`);
        expect(alice).toHaveLength(1);
        expect(bob).toHaveLength(1);
        expect(alice[0].user_id).toBe(ALICE);
        expect(bob[0].user_id).toBe(BOB);
      });

      it("чужие строки нельзя изменить или удалить", async () => {
        await as(BOB, `update public.${table} set ${row.set} where user_id = '${ALICE}'`);
        await as(BOB, `delete from public.${table} where user_id = '${ALICE}'`);
        // даже без условия where затрагиваются только свои строки
        const touched = await as<{ user_id: string }>(BOB, `update public.${table} set ${row.set} returning user_id`);
        expect(touched.every((r) => r.user_id === BOB)).toBe(true);
        const alice = await as<{ user_id: string }>(ALICE, `select * from public.${table}`);
        expect(alice).toHaveLength(1);
        expect(JSON.stringify(alice[0])).not.toContain("взлом");
      });

      it("нельзя вставить строку от имени другого пользователя", async () => {
        await expect(
          as(BOB, `insert into public.${table} (user_id, ${row.cols}) values ('${ALICE}', ${row.vals})`),
        ).rejects.toThrow();
      });

      it("нельзя переписать свою строку на другого пользователя", async () => {
        await expect(as(BOB, `update public.${table} set user_id = '${ALICE}'`)).rejects.toThrow();
      });

      it("без входа данные недоступны", async () => {
        await expect(as(null, `select * from public.${table}`)).rejects.toThrow(/permission denied/);
      });
    });
  }
});
