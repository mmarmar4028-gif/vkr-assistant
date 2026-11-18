/**
 * Проверка изоляции данных на НАСТОЯЩЕМ проекте Supabase.
 *
 * Что делает:
 *   1. Входит под тестовым пользователем A и создаёт по строке в каждой таблице.
 *   2. Входит под тестовым пользователем B и пытается прочитать, изменить,
 *      удалить строки A и вставить строку от имени A.
 *   3. Пробует прочитать таблицы без входа.
 *   4. Удаляет тестовые строки A.
 *
 * Запуск (из папки проекта):
 *   npm run check:rls-live
 *
 * Нужны переменные в .env.local (см. .env.example):
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *   RLS_TEST_EMAIL_A, RLS_TEST_PASSWORD_A, RLS_TEST_EMAIL_B, RLS_TEST_PASSWORD_B
 * Пароли нигде не выводятся.
 */
import { createClient } from "@supabase/supabase-js";

const env = process.env;
const need = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "RLS_TEST_EMAIL_A",
  "RLS_TEST_PASSWORD_A",
  "RLS_TEST_EMAIL_B",
  "RLS_TEST_PASSWORD_B",
];
const missing = need.filter((k) => !env[k]);
if (missing.length) {
  console.error(`Не заданы переменные в .env.local: ${missing.join(", ")}`);
  process.exit(2);
}

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const client = () => createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

/** Тестовая строка для каждой таблицы. Метка позволяет найти и удалить их потом. */
const MARK = `rls-check-${Date.now()}`;
const TABLES = {
  profiles: { key: ["user_id"], row: { full_name: MARK } },
  deadline_states: { key: ["user_id", "stage_key"], row: { stage_key: MARK, done: true } },
  schedule_items: { row: { title: MARK } },
  meetings: { row: { summary: MARK } },
  checklist_items: { key: ["user_id", "scope", "item_key"], row: { scope: "rls-check", item_key: MARK } },
  sources: { row: { type: "monograph", data: { title: MARK } } },
  figures_tables: { row: { kind: "figure", title: MARK } },
  assumptions: { row: { text: MARK } },
  risks: { row: { text: MARK } },
  ai_log: { row: { model: MARK, purpose: MARK } },
  defence_notes: { key: ["user_id", "criterion_key"], row: { criterion_key: MARK, notes: MARK } },
};

let failures = 0;
const ok = (msg) => console.log(`  ✓ ${msg}`);
const bad = (msg) => {
  failures += 1;
  console.log(`  ✗ ${msg}`);
};

async function signIn(email, password, label) {
  const sb = client();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    console.error(`Не удалось войти как пользователь ${label}: ${error.message}`);
    process.exit(2);
  }
  return { sb, id: data.user.id };
}

/** Фильтр по ключу строки: для таблиц с id — по id, иначе по составному ключу. */
function match(query, table, row) {
  const keys = TABLES[table].key ?? ["id"];
  for (const k of keys) query = query.eq(k, row[k]);
  return query;
}

const a = await signIn(env.RLS_TEST_EMAIL_A, env.RLS_TEST_PASSWORD_A, "A");
const b = await signIn(env.RLS_TEST_EMAIL_B, env.RLS_TEST_PASSWORD_B, "B");
if (a.id === b.id) {
  console.error("A и B — один и тот же пользователь. Укажите две разные учётные записи.");
  process.exit(2);
}
console.log(`Проект: ${URL}`);
console.log(`Пользователь A: ${env.RLS_TEST_EMAIL_A}\nПользователь B: ${env.RLS_TEST_EMAIL_B}\n`);

// Профиль у A мог уже существовать — запомним, чтобы вернуть как было.
const { data: oldProfile } = await a.sb.from("profiles").select("*").maybeSingle();

const created = {};
for (const [table, def] of Object.entries(TABLES)) {
  const q = def.key
    ? a.sb.from(table).upsert(def.row, { onConflict: def.key.join(",") })
    : a.sb.from(table).insert(def.row);
  const { data, error } = await q.select().single();
  if (error) {
    console.error(`Не удалось создать тестовую строку в ${table} от имени A: ${error.message}`);
    console.error("Проверьте, что миграция из supabase/migrations выполнена.");
    process.exit(2);
  }
  created[table] = data;
}

for (const table of Object.keys(TABLES)) {
  console.log(table);
  const row = created[table];

  // 1. A видит свою строку
  const own = await match(a.sb.from(table).select("*"), table, row);
  if (own.data?.length === 1) ok("A видит свою строку");
  else bad(`A не видит свою строку (${own.error?.message ?? "0 строк"})`);

  // 2. B не видит строк A
  const seen = await b.sb.from(table).select("user_id").eq("user_id", a.id);
  if (!seen.error && seen.data.length === 0) ok("B не видит строки A");
  else bad(`B видит строки A: ${seen.data?.length ?? seen.error?.message}`);

  // 3. B не может изменить строку A
  const patchField = Object.keys(TABLES[table].row).find((k) => typeof TABLES[table].row[k] === "string" && !["type", "kind", "scope", "stage_key", "item_key", "criterion_key"].includes(k));
  if (patchField) {
    const upd = await match(b.sb.from(table).update({ [patchField]: "взлом" }), table, row).select();
    if (!upd.error && upd.data.length === 0) ok("B не может изменить строку A");
    else bad(`B изменил строку A (${upd.error?.message ?? upd.data.length})`);
  }

  // 4. B не может удалить строку A
  const del = await match(b.sb.from(table).delete(), table, row).select();
  if (!del.error && del.data.length === 0) ok("B не может удалить строку A");
  else bad(`B удалил строку A (${del.error?.message ?? del.data.length})`);

  // 5. B не может вставить строку от имени A
  const forged = { ...TABLES[table].row, user_id: a.id };
  if (TABLES[table].key?.includes("stage_key")) forged.stage_key = `${MARK}-b`;
  if (TABLES[table].key?.includes("item_key")) forged.item_key = `${MARK}-b`;
  if (TABLES[table].key?.includes("criterion_key")) forged.criterion_key = `${MARK}-b`;
  const ins = await b.sb.from(table).insert(forged).select();
  if (ins.error) ok("B не может вставить строку от имени A");
  else bad("B вставил строку от имени A");

  // 6. Без входа доступа нет
  const anon = await client().from(table).select("*").limit(1);
  if (anon.error || anon.data.length === 0) ok("без входа данные недоступны");
  else bad("без входа данные видны");

  // 7. Строка A после всех попыток не изменилась
  const after = await match(a.sb.from(table).select("*"), table, row);
  if (after.data?.length === 1 && !JSON.stringify(after.data[0]).includes("взлом")) ok("строка A цела");
  else bad("строка A изменена или удалена");
}

// Уборка
for (const [table, def] of Object.entries(TABLES)) {
  if (table === "profiles") continue;
  await match(a.sb.from(table).delete(), table, created[table]);
  void def;
}
if (oldProfile) await a.sb.from("profiles").upsert(oldProfile, { onConflict: "user_id" });
else await a.sb.from("profiles").delete().eq("user_id", a.id);

console.log(
  failures === 0
    ? "\nИтог: изоляция данных работает. Тестовые строки удалены."
    : `\nИтог: найдено нарушений: ${failures}. Тестовые строки удалены.`,
);
process.exit(failures === 0 ? 0 : 1);
