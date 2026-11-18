/**
 * Настройки подключения. Значения берутся только из переменных окружения
 * (файл .env.local на своём компьютере, раздел Environment Variables в Vercel).
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Демо-режим для знакомства с приложением без базы данных: данные хранятся
 * только в этом браузере. Включается переменной NEXT_PUBLIC_DEMO_MODE=1
 * и только если ключи Supabase не заданы.
 */
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

export type AppMode = "supabase" | "demo" | "unconfigured";

export const APP_MODE: AppMode = SUPABASE_URL && SUPABASE_ANON_KEY ? "supabase" : DEMO ? "demo" : "unconfigured";
