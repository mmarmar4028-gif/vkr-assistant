"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { Button, Field, Input, Notice } from "./ui";
import { SetupNotice } from "./SetupNotice";

function Frame({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-1 text-center text-2xl font-semibold tracking-tight text-brand-800">
        Помощник по ВКР
      </Link>
      <p className="mb-6 text-center text-sm text-slate-500">ВШБ МГУ · Программа ГИА 2026-2027</p>
      <div className="rounded-2xl border border-line bg-white p-5 shadow-xs sm:p-6">
        <h1 className="mb-4 text-xl font-semibold">{title}</h1>
        {children}
      </div>
      {footer && <div className="mt-4 text-center text-[15px] text-slate-600">{footer}</div>}
    </main>
  );
}

const link = "font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900";

export function AuthForm({ kind }: { kind: "login" | "register" }) {
  const { mode, user, loading, signIn, signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  if (mode === "unconfigured") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <SetupNotice />
      </main>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (kind === "register") {
      if (password.length < 8) return setError("Пароль должен быть не короче 8 символов.");
      if (password !== repeat) return setError("Пароли не совпадают.");
    }
    setBusy(true);
    try {
      if (kind === "login") {
        const err = await signIn(email.trim(), password);
        if (err) setError(err);
      } else {
        const res = await signUp(email.trim(), password);
        if (res.error) setError(res.error);
        else if (res.needsConfirmation) setSent(true);
      }
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Frame title="Подтвердите почту">
        <Notice kind="ok">
          Мы отправили письмо на {email}. Перейдите по ссылке из письма, чтобы завершить регистрацию, затем войдите.
        </Notice>
        <p className="mt-4 text-center">
          <Link className={link} href="/login">
            Перейти ко входу
          </Link>
        </p>
      </Frame>
    );
  }

  const isLogin = kind === "login";
  return (
    <Frame
      title={isLogin ? "Вход" : "Регистрация"}
      footer={
        isLogin ? (
          <>
            Нет аккаунта?{" "}
            <Link className={link} href="/register">
              Зарегистрироваться
            </Link>
          </>
        ) : (
          <>
            Уже есть аккаунт?{" "}
            <Link className={link} href="/login">
              Войти
            </Link>
          </>
        )
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate={false}>
        {mode === "demo" && (
          <Notice kind="warn">
            Демо-режим: база данных не подключена. Введите любую почту — данные сохранятся только в этом браузере.
          </Notice>
        )}
        <Field label="Электронная почта" required>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
        </Field>
        {mode !== "demo" && (
          <Field label="Пароль" required hint={isLogin ? undefined : "Не короче 8 символов."}>
            <Input
              type="password"
              name="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        )}
        {!isLogin && mode !== "demo" && (
          <Field label="Пароль ещё раз" required>
            <Input
              type="password"
              name="password-repeat"
              autoComplete="new-password"
              required
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
            />
          </Field>
        )}
        {error && <Notice kind="error">{error}</Notice>}
        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy ? "Подождите…" : isLogin ? "Войти" : "Создать аккаунт"}
        </Button>
        {isLogin && mode !== "demo" && (
          <p className="text-center text-sm">
            <Link className={link} href="/reset">
              Забыли пароль?
            </Link>
          </p>
        )}
      </form>
    </Frame>
  );
}

export function ResetForm() {
  const { mode, user, recovery, requestReset, updatePassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (mode === "unconfigured") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <SetupNotice />
      </main>
    );
  }

  // Пользователь пришёл по ссылке из письма: задаёт новый пароль.
  if (recovery && user) {
    return (
      <Frame title="Новый пароль">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (password.length < 8) return setMessage({ kind: "error", text: "Пароль должен быть не короче 8 символов." });
            setBusy(true);
            const err = await updatePassword(password);
            setBusy(false);
            if (err) setMessage({ kind: "error", text: err });
            else router.replace("/dashboard");
          }}
        >
          <Field label="Новый пароль" required hint="Не короче 8 символов.">
            <Input
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {message && <Notice kind={message.kind}>{message.text}</Notice>}
          <Button type="submit" variant="primary" className="w-full" disabled={busy}>
            Сохранить пароль
          </Button>
        </form>
      </Frame>
    );
  }

  return (
    <Frame
      title="Восстановление пароля"
      footer={
        <Link className={link} href="/login">
          Вернуться ко входу
        </Link>
      }
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const err = await requestReset(email.trim());
          setBusy(false);
          setMessage(
            err
              ? { kind: "error", text: err }
              : { kind: "ok", text: `Письмо со ссылкой для смены пароля отправлено на ${email.trim()}.` },
          );
        }}
      >
        <Field label="Электронная почта" required hint="На этот адрес придёт ссылка для смены пароля.">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {message && <Notice kind={message.kind}>{message.text}</Notice>}
        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          Отправить ссылку
        </Button>
      </form>
    </Frame>
  );
}
