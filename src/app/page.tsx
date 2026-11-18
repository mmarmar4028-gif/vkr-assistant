"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SetupNotice } from "@/components/SetupNotice";
import { useAuth } from "@/lib/auth";

const FEATURES = [
  "контрольные сроки и обратный отсчёт до ближайшего",
  "план-график по форме Приложения 9 с экспортом в Word",
  "чек-листы структуры, объёма и содержания по формату ВКР",
  "список литературы и ссылки в тексте в формате программы",
  "сквозная нумерация рисунков и таблиц",
  "реестр допущений и рисков, журнал использования ИИ",
  "шаблон Word с оформлением по Приложению 7 и анонимный экземпляр",
  "чек-лист сдачи и подготовка к защите",
];

export default function HomePage() {
  const { mode, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-4 py-12">
      <p className="text-sm font-medium text-brand-700">ВШБ МГУ · 38.03.02 Менеджмент · Программа ГИА 2026-2027</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Помощник по ВКР</h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-600">
        Берёт на себя рутину подготовки выпускной квалификационной работы. Текст ВКР не пишет — только помогает
        ничего не забыть и оформить всё по требованиям программы.
      </p>
      <ul className="mt-6 grid gap-x-6 gap-y-2 text-[15px] text-slate-700 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <li key={feature} className="flex gap-2">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />
            {feature}
          </li>
        ))}
      </ul>
      {mode === "unconfigured" ? (
        <div className="mt-8">
          <SetupNotice />
        </div>
      ) : (
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-[15px] font-medium text-white transition hover:bg-brand-700"
          >
            Войти
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-line bg-white px-5 py-2.5 text-[15px] font-medium text-ink transition hover:bg-slate-50"
          >
            Зарегистрироваться
          </Link>
        </div>
      )}
      <p className="mt-8 text-[13px] leading-relaxed text-slate-500">
        Рядом с каждым требованием указан номер пункта программы — сверяйте с оригиналом. Файлы ВКР на сервер не
        загружаются: хранятся только отметки и справочные данные.
      </p>
    </main>
  );
}
