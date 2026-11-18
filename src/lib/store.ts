import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>;

/** Единый интерфейс доступа к данным: Supabase или демо-хранилище в браузере. */
export interface Backend {
  select<T = Row>(table: string, orderBy?: string): Promise<T[]>;
  insert<T = Row>(table: string, row: Row): Promise<T>;
  update(table: string, id: string, patch: Row): Promise<void>;
  remove(table: string, id: string): Promise<void>;
  /** Вставка или обновление строки с составным ключом (user_id + keys). */
  upsert<T = Row>(table: string, row: Row, keys: string[]): Promise<T>;
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

function fail(action: string, message: string): never {
  throw new Error(`${action}: ${message}`);
}

/**
 * Хранилище Supabase. Строки фильтрует сама база (Row Level Security):
 * запрос без условий возвращает только строки текущего пользователя.
 */
export function supabaseBackend(userId: string): Backend {
  const sb = getSupabase();
  return {
    async select(table, orderBy) {
      let query = sb.from(table).select("*");
      if (orderBy) query = query.order(orderBy, { ascending: true });
      const { data, error } = await query;
      if (error) fail("Не удалось загрузить данные", error.message);
      return (data ?? []) as any[];
    },
    async insert(table, row) {
      const { data, error } = await sb.from(table).insert({ ...row, user_id: userId }).select().single();
      if (error) fail("Не удалось сохранить", error.message);
      return data as any;
    },
    async update(table, id, patch) {
      const { error } = await sb.from(table).update(patch).eq("id", id);
      if (error) fail("Не удалось сохранить", error.message);
    },
    async remove(table, id) {
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) fail("Не удалось удалить", error.message);
    },
    async upsert(table, row, keys) {
      const { data, error } = await sb
        .from(table)
        .upsert({ ...row, user_id: userId }, { onConflict: ["user_id", ...keys].join(",") })
        .select()
        .single();
      if (error) fail("Не удалось сохранить", error.message);
      return data as any;
    },
  };
}

/** Демо-хранилище: данные лежат в localStorage этого браузера. */
export function demoBackend(userId: string): Backend {
  const key = (table: string) => `vkr-demo:${table}`;
  const read = (table: string): Row[] => {
    try {
      return JSON.parse(localStorage.getItem(key(table)) ?? "[]");
    } catch {
      return [];
    }
  };
  const write = (table: string, rows: Row[]) => localStorage.setItem(key(table), JSON.stringify(rows));
  return {
    async select(table, orderBy) {
      const rows = read(table);
      if (orderBy) rows.sort((a, b) => (a[orderBy] > b[orderBy] ? 1 : a[orderBy] < b[orderBy] ? -1 : 0));
      return rows as any[];
    },
    async insert(table, row) {
      const full = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...row, user_id: userId };
      write(table, [...read(table), full]);
      return full as any;
    },
    async update(table, id, patch) {
      write(table, read(table).map((r) => (r.id === id ? { ...r, ...patch } : r)));
    },
    async remove(table, id) {
      write(table, read(table).filter((r) => r.id !== id));
    },
    async upsert(table, row, keys) {
      const rows = read(table);
      const index = rows.findIndex((r) => keys.every((k) => r[k] === row[k]));
      const full = { ...(index >= 0 ? rows[index] : {}), ...row, user_id: userId };
      if (index >= 0) rows[index] = full;
      else rows.push(full);
      write(table, rows);
      return full as any;
    },
  };
}
