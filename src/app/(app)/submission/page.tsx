"use client";

import Link from "next/link";
import { Card, ChecklistRow, Loading, Notice, PageHeader, Progress } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { useChecklist, useKeyedRows } from "@/lib/hooks";
import type { DeadlineState } from "@/lib/types";
import { DEADLINES, SUBMISSION, SUBMISSION_WARNINGS } from "@/requirements";

const link = "font-medium text-brand-700 underline underline-offset-2";

export default function SubmissionPage() {
  const list = useChecklist("submission");
  const deadlines = useKeyedRows<DeadlineState>("deadline_states", "stage_key");

  if (list.loading || deadlines.loading) return <Loading />;

  const stage = DEADLINES.find((d) => d.key === "submission")!;
  const exact = deadlines.map.submission?.exact_date;

  return (
    <>
      <PageHeader
        title="Итоговая сдача ВКР"
        clause="пп. 3.1.12-3.1.18"
        lead="Проверьте комплект перед тем, как нести работу в учебный отдел."
      />

      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        {SUBMISSION_WARNINGS.map((w) => (
          <Notice key={w.key} kind="warn" clause={w.clause}>
            <strong>{w.text}</strong>
          </Notice>
        ))}
      </div>

      <Card title="Комплект для сдачи">
        <p className="mb-3 text-[14.5px] text-slate-600">
          Срок сдачи:{" "}
          <strong className="text-ink">
            {exact ? formatDate(exact) : `${formatDate(stage.date)} – ${formatDate(stage.dateEnd)}`}
          </strong>
          {exact ? " (точная дата по Приказу декана)." : " — точная дата устанавливается Приказом декана; "}
          {!exact && (
            <Link href="/dashboard" className={link}>
              указать точную дату
            </Link>
          )}
        </p>
        <Progress done={list.doneCount(SUBMISSION.map((r) => r.key))} total={SUBMISSION.length} />
        <ul className="mt-2">
          {SUBMISSION.map((rule) => (
            <ChecklistRow
              key={rule.key}
              text={rule.text}
              hint={rule.hint}
              clause={rule.clause}
              withChapter={false}
              value={list.get(rule.key)}
              onChange={(changes) => list.save(rule.key, changes)}
            />
          ))}
        </ul>
      </Card>

      <Card className="mt-4" title="Что подготовить в приложении">
        <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-slate-700">
          <li>
            <Link href="/template" className={link}>
              Шаблон Word
            </Link>{" "}
            — экземпляр с фамилиями и анонимный экземпляр с номером зачётной книжки.
          </li>
          <li>
            <Link href="/data" className={link}>
              Папка «Данные»
            </Link>{" "}
            — перечень файлов расчётов, опросов и интервью.
          </li>
          <li>
            <Link href="/schedule" className={link}>
              План-график
            </Link>{" "}
            — оригинал с отметками и подписью руководителя, с верным числом очных встреч.
          </li>
        </ul>
      </Card>
    </>
  );
}
