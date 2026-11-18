import { Card } from "./ui";

/** Показывается, если не заданы ключи Supabase. */
export function SetupNotice() {
  return (
    <Card title="Приложение ещё не подключено к базе данных">
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-700">
        <p>
          Не заданы переменные окружения <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code> и{" "}
          <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Создайте проект в Supabase и выполните миграцию из папки supabase/migrations.</li>
          <li>
            Скопируйте адрес проекта и публичный ключ в файл <code className="rounded bg-slate-100 px-1">.env.local</code>{" "}
            (на своём компьютере) или в раздел Environment Variables в Vercel.
          </li>
          <li>Перезапустите приложение (в Vercel — сделайте Redeploy).</li>
        </ol>
        <p>Пошаговая инструкция — в файле README.md.</p>
      </div>
    </Card>
  );
}
