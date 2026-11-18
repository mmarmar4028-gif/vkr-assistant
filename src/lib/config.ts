/**
 * Где хранятся данные.
 *
 * По умолчанию — «local»: всё, что вводит пользователь, сохраняется только
 * в его собственном браузере (localStorage). Сервер, регистрация и пароли
 * не нужны; у каждого человека, открывшего сайт, свои отдельные данные.
 *
 * Если заданы переменные NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * включается режим «supabase»: вход по почте и паролю, данные в базе Supabase,
 * доступ с любого устройства (см. README, раздел про Supabase).
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export type AppMode = "supabase" | "local";

export const APP_MODE: AppMode = SUPABASE_URL && SUPABASE_ANON_KEY ? "supabase" : "local";

/** Путь сайта на GitHub Pages (например, «/vkr-assistant»); пустой при локальном запуске. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
