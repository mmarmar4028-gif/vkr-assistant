"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { APP_MODE, type AppMode } from "./config";
import { demoBackend, getSupabase, supabaseBackend, type Backend } from "./store";

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthValue {
  mode: AppMode;
  user: AuthUser | null;
  loading: boolean;
  backend: Backend | null;
  /** Пользователь пришёл по ссылке восстановления пароля. */
  recovery: boolean;
  signIn(email: string, password: string): Promise<string | null>;
  signUp(email: string, password: string): Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut(): Promise<void>;
  requestReset(email: string): Promise<string | null>;
  updatePassword(password: string): Promise<string | null>;
}

const AuthContext = createContext<AuthValue | null>(null);

const DEMO_KEY = "vkr-demo:session";

/** Сообщения Supabase Auth на русском языке. */
export function authError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Неверная почта или пароль.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Пользователь с такой почтой уже зарегистрирован.";
  if (m.includes("email not confirmed")) return "Почта не подтверждена. Перейдите по ссылке из письма.";
  if (m.includes("password should be at least") || m.includes("weak password"))
    return "Пароль слишком простой или короткий. Используйте не менее 8 символов.";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes"))
    return "Слишком много попыток. Подождите немного и попробуйте снова.";
  if (m.includes("unable to validate email") || m.includes("invalid email") || m.includes("is invalid"))
    return "Проверьте адрес электронной почты.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled"))
    return "Регистрация отключена в настройках Supabase.";
  if (m.includes("same password") || m.includes("different from the old"))
    return "Новый пароль должен отличаться от старого.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Нет связи с сервером. Проверьте интернет и адрес проекта Supabase.";
  return `Не удалось выполнить действие: ${message}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(APP_MODE !== "unconfigured");
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    if (APP_MODE === "unconfigured") return;
    if (APP_MODE === "demo") {
      Promise.resolve(localStorage.getItem(DEMO_KEY)).then((email) => {
        setUser(email ? { id: "demo", email } : null);
        setLoading(false);
      });
      return;
    }
    const sb = getSupabase();
    sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setUser(u ? { id: u.id, email: u.email ?? "" } : null);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      const u = session?.user;
      setUser(u ? { id: u.id, email: u.email ?? "" } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const backend = useMemo<Backend | null>(() => {
    if (!user) return null;
    return APP_MODE === "demo" ? demoBackend(user.id) : supabaseBackend(user.id);
  }, [user]);

  const value: AuthValue = {
    mode: APP_MODE,
    user,
    loading,
    backend,
    recovery,
    async signIn(email, password) {
      if (APP_MODE === "demo") {
        localStorage.setItem(DEMO_KEY, email);
        setUser({ id: "demo", email });
        return null;
      }
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });
      return error ? authError(error.message) : null;
    },
    async signUp(email, password) {
      if (APP_MODE === "demo") {
        localStorage.setItem(DEMO_KEY, email);
        setUser({ id: "demo", email });
        return { error: null, needsConfirmation: false };
      }
      const { data, error } = await getSupabase().auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) return { error: authError(error.message), needsConfirmation: false };
      // Если подтверждение почты включено, сессии сразу нет.
      return { error: null, needsConfirmation: !data.session };
    },
    async signOut() {
      if (APP_MODE === "demo") {
        localStorage.removeItem(DEMO_KEY);
        setUser(null);
        return;
      }
      await getSupabase().auth.signOut();
    },
    async requestReset(email) {
      if (APP_MODE === "demo") return "В демо-режиме пароль не используется.";
      const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset`,
      });
      return error ? authError(error.message) : null;
    },
    async updatePassword(password) {
      if (APP_MODE === "demo") return null;
      const { error } = await getSupabase().auth.updateUser({ password });
      if (!error) setRecovery(false);
      return error ? authError(error.message) : null;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth: нет AuthProvider");
  return value;
}
