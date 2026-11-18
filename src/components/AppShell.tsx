"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { ProfileProvider, useErrorMessages } from "@/lib/hooks";
import { Button, Loading, cx } from "./ui";

export const NAV: { href: string; label: string }[] = [
  { href: "/dashboard", label: "Сроки" },
  { href: "/profile", label: "Профиль ВКР" },
  { href: "/schedule", label: "План-график" },
  { href: "/checklists", label: "Требования" },
  { href: "/bibliography", label: "Список литературы" },
  { href: "/figures", label: "Рисунки и таблицы" },
  { href: "/assumptions", label: "Допущения и риски" },
  { href: "/ai-log", label: "Журнал ИИ" },
  { href: "/data", label: "Папка «Данные»" },
  { href: "/template", label: "Шаблон Word" },
  { href: "/submission", label: "Сдача ВКР" },
  { href: "/defence", label: "Защита" },
];

/** Раздел для версии, где данные хранятся в браузере. */
const BACKUP_LINK = { href: "/backup", label: "Резервная копия" };

const LOCAL_NOTE = "Данные хранятся только в этом браузере и никуда не отправляются. Время от времени скачивайте резервную копию.";

function Errors() {
  const { messages, dismiss } = useErrorMessages();
  if (!messages.length) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-xl flex-col gap-2" role="alert">
      {messages.map((message, i) => (
        <div
          key={`${i}-${message}`}
          className="flex items-start justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-[14.5px] text-red-900 shadow-lg"
        >
          <span>{message}</span>
          <button type="button" className="font-medium underline" onClick={() => dismiss(i)}>
            Закрыть
          </button>
        </div>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { mode, user, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const local = mode === "local";
  const links = local ? [...NAV, BACKUP_LINK] : NAV;
  if (loading || !user) return <Loading />;

  const nav = (
    <nav aria-label="Разделы" className="flex flex-col gap-0.5">
      {links.map((item) => {
        const active = pathname === item.href || pathname === `${item.href}/`;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
            className={cx(
              "rounded-lg px-3 py-2 text-[15px] transition",
              active ? "bg-brand-600 font-medium text-white" : "text-slate-700 hover:bg-brand-50 hover:text-brand-800",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <ProfileProvider>
      <div className="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col lg:flex-row">
        {/* Шапка на телефоне */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/95 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/dashboard" className="text-lg font-semibold text-brand-800">
            Помощник по ВКР
          </Link>
          <Button small aria-expanded={menuOpen} aria-controls="mobile-nav" onClick={() => setMenuOpen((o) => !o)}>
            {menuOpen ? "Закрыть" : "Разделы"}
          </Button>
        </div>
        {menuOpen && (
          <div id="mobile-nav" className="border-b border-line bg-white px-3 py-3 lg:hidden">
            {nav}
            {local ? (
              <p className="mt-3 border-t border-line pt-3 text-[13px] leading-snug text-slate-600">{LOCAL_NOTE}</p>
            ) : (
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-sm text-slate-600">
                <span className="truncate">{user.email}</span>
                <Button small onClick={signOut}>
                  Выйти
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Боковая панель */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-line px-3 py-5 lg:flex">
          <Link href="/dashboard" className="mb-1 px-3 text-xl font-semibold tracking-tight text-brand-800">
            Помощник по ВКР
          </Link>
          <p className="mb-4 px-3 text-[13px] leading-snug text-slate-500">ВШБ МГУ · Программа ГИА 2026-2027</p>
          {nav}
          <div className="mt-auto px-3 pt-6 text-sm text-slate-600">
            {local ? (
              <p className="rounded-lg bg-brand-50 px-2.5 py-2 text-[13px] leading-snug text-brand-900">{LOCAL_NOTE}</p>
            ) : (
              <>
                <p className="truncate" title={user.email}>
                  {user.email}
                </p>
                <Button small className="mt-2" onClick={signOut}>
                  Выйти
                </Button>
              </>
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">{children}</main>
      </div>
      <Errors />
    </ProfileProvider>
  );
}
