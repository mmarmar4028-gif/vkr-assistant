"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, Notice, PageHeader } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import {
  TABLES,
  TABLE_LABELS,
  backupFileName,
  countRows,
  makeBackup,
  parseBackup,
  type Backup,
  type TableName,
} from "@/lib/backup";
import { downloadBlob } from "@/lib/format";
import { LOCAL_PREFIX } from "@/lib/store";

const key = (t: TableName) => `${LOCAL_PREFIX}${t}`;

function readTable(t: TableName): Record<string, unknown>[] {
  try {
    const rows = JSON.parse(localStorage.getItem(key(t)) ?? "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "дата неизвестна"
    : d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function BackupPage() {
  const { mode } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  // На этапе сборки сайта браузерного хранилища нет, поэтому данные читаются после загрузки страницы.
  const [current, setCurrent] = useState<Backup>(() => makeBackup(() => []));
  useEffect(() => {
    Promise.resolve().then(() => setCurrent(makeBackup(readTable)));
  }, []);
  const [pending, setPending] = useState<Backup | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  if (mode !== "local") {
    return (
      <>
        <PageHeader title="Резервная копия" />
        <Notice>В версии с аккаунтами данные хранятся в базе данных, резервная копия в браузере не нужна.</Notice>
      </>
    );
  }

  const total = countRows(current);

  function download() {
    const backup = makeBackup(readTable);
    setCurrent(backup);
    downloadBlob(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }), backupFileName());
    setMessage({ kind: "ok", text: "Файл резервной копии скачан. Сохраните его в надёжном месте." });
  }

  async function choose(file: File | undefined) {
    setMessage(null);
    setPending(null);
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function restore() {
    if (!pending) return;
    for (const t of TABLES) localStorage.setItem(key(t), JSON.stringify(pending.tables[t]));
    // Перезагрузка, чтобы все разделы прочитали восстановленные данные.
    window.location.reload();
  }

  function clearAll() {
    for (const t of TABLES) localStorage.removeItem(key(t));
    window.location.reload();
  }

  return (
    <>
      <PageHeader
        title="Резервная копия"
        lead="Данные этой версии хранятся только в вашем браузере на этом устройстве. Резервная копия — это один файл со всеми вашими записями: с ним данные не пропадут при очистке браузера, и их можно перенести на другое устройство."
      />

      {message && (
        <Notice kind={message.kind} className="mb-4">
          {message.text}
        </Notice>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Скачать резервную копию">
          <p className="text-[15px] leading-relaxed text-slate-700">
            Сейчас в браузере записей: <strong className="tabular-nums">{total}</strong>.
          </p>
          <ul className="mt-2 grid gap-x-6 gap-y-0.5 text-[14px] text-slate-600 sm:grid-cols-2">
            {TABLES.filter((t) => current.tables[t].length > 0).map((t) => (
              <li key={t}>
                {TABLE_LABELS[t]}: <span className="tabular-nums">{current.tables[t].length}</span>
              </li>
            ))}
          </ul>
          <Button variant="primary" className="mt-4" onClick={download}>
            Скачать резервную копию
          </Button>
          <p className="mt-3 text-[13.5px] leading-snug text-slate-500">
            Делайте копию время от времени — например, после каждой встречи с руководителем. Файл открывать не нужно, его
            понимает только это приложение.
          </p>
        </Card>

        <Card title="Загрузить из копии">
          <p className="text-[15px] leading-relaxed text-slate-700">
            Выберите файл резервной копии. Перед заменой приложение покажет, что в нём.
          </p>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            id="backup-file"
            onChange={(e) => choose(e.target.files?.[0])}
          />
          <Button className="mt-3" onClick={() => fileInput.current?.click()}>
            Выбрать файл…
          </Button>

          {pending && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3.5">
              <p className="text-[15px] font-medium text-amber-950">
                Копия от {formatStamp(pending.exported_at)}, записей: {countRows(pending)}.
              </p>
              <p className="mt-1 text-[14.5px] text-amber-950">
                Текущие данные в этом браузере (записей: {total}) будут заменены данными из копии. Отменить это нельзя —
                если сомневаетесь, сначала скачайте копию текущих данных.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="primary" onClick={restore}>
                  Заменить данные
                </Button>
                <Button onClick={() => setPending(null)}>Отмена</Button>
              </div>
            </div>
          )}
        </Card>

        <Card title="Удалить все данные из этого браузера" className="xl:col-span-2">
          <p className="text-[15px] leading-relaxed text-slate-700">
            Пригодится, если вы работали на чужом компьютере. Удаляются только данные помощника в этом браузере.
          </p>
          {confirmClear ? (
            <div className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3.5">
              <p className="text-[15px] text-red-900">
                Будут удалены все записи ({total}). Отменить это нельзя. Резервная копия, если вы её скачали, останется.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="danger" className="border border-red-300 bg-white" onClick={clearAll}>
                  Да, удалить всё
                </Button>
                <Button onClick={() => setConfirmClear(false)}>Отмена</Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" className="mt-3" onClick={() => setConfirmClear(true)} disabled={total === 0}>
              Удалить все данные…
            </Button>
          )}
        </Card>
      </div>
    </>
  );
}
