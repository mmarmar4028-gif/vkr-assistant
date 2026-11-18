"use client";

import { useState } from "react";
import { Button, Card, CommitInput, CommitTextarea, Empty, Loading, Notice, PageHeader, Select } from "@/components/ui";
import { assumptionsDocument, fileStem, toBlob } from "@/lib/docx/exports";
import { downloadBlob } from "@/lib/format";
import { notifyError, useProfile, useRows } from "@/lib/hooks";
import type { Assumption, Risk } from "@/lib/types";
import { ASSUMPTIONS_RULES, DATA_TYPES } from "@/requirements";

const head = "px-1 pb-1 text-left text-[13px] font-medium text-slate-500";

export default function AssumptionsPage() {
  const { profile } = useProfile();
  const assumptions = useRows<Assumption>("assumptions");
  const risks = useRows<Risk>("risks");
  const [busy, setBusy] = useState(false);

  if (assumptions.loading || risks.loading) return <Loading />;

  async function exportDocx() {
    setBusy(true);
    try {
      const blob = await toBlob(assumptionsDocument(profile, assumptions.rows, risks.rows));
      downloadBlob(blob, `Допущения_и_риски_${fileStem(profile)}.docx`);
    } catch (e) {
      notifyError(e);
    } finally {
      setBusy(false);
    }
  }

  const unsupported = assumptions.rows.filter((a) => a.text.trim() && !a.basis.trim()).length;

  return (
    <>
      <PageHeader
        title="Допущения и риски"
        clause="пп. 2.3, 2.10"
        lead="Собирайте допущения и риски по ходу работы — в заключении они должны быть описаны. Обе таблицы можно выгрузить в Word."
      />

      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        {ASSUMPTIONS_RULES.map((r) => (
          <Notice key={r.key} kind={r.key === "falsification" ? "warn" : "info"} clause={r.clause}>
            {r.text}
          </Notice>
        ))}
      </div>

      <Card
        title={`Допущения (${assumptions.rows.length})`}
        actions={
          <Button variant="primary" onClick={exportDocx} disabled={busy}>
            {busy ? "Готовим файл…" : "Скачать обе таблицы .docx"}
          </Button>
        }
      >
        {unsupported > 0 && (
          <Notice kind="warn" className="mb-3" clause="п. 2.15">
            Допущений без основания: {unsupported}. Укажите источник или обоснование для каждого числа.
          </Notice>
        )}
        {assumptions.rows.length === 0 ? (
          <Empty>Допущений пока нет.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-separate border-spacing-y-1.5">
              <thead>
                <tr>
                  <th className={`${head} w-8`}>№</th>
                  <th className={head}>Допущение</th>
                  <th className={head}>Где используется (раздел, расчёт)</th>
                  <th className={head}>Основание (источник или обоснование)</th>
                  <th className={`${head} w-48`}>Тип данных</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {assumptions.rows.map((a, i) => (
                  <tr key={a.id} className="align-top">
                    <td className="px-1 pt-2 tabular-nums text-slate-500">{i + 1}</td>
                    <td className="px-1">
                      <CommitTextarea
                        rows={2}
                        aria-label={`Допущение ${i + 1}`}
                        value={a.text}
                        onCommit={(text) => assumptions.patch(a.id, { text })}
                      />
                    </td>
                    <td className="px-1">
                      <CommitTextarea
                        rows={2}
                        aria-label={`Допущение ${i + 1}: где используется`}
                        value={a.used_in}
                        onCommit={(used_in) => assumptions.patch(a.id, { used_in })}
                      />
                    </td>
                    <td className="px-1">
                      <CommitTextarea
                        rows={2}
                        aria-label={`Допущение ${i + 1}: основание`}
                        value={a.basis}
                        onCommit={(basis) => assumptions.patch(a.id, { basis })}
                      />
                    </td>
                    <td className="px-1">
                      <Select
                        aria-label={`Допущение ${i + 1}: тип данных`}
                        value={a.data_type}
                        onChange={(e) => assumptions.patch(a.id, { data_type: e.target.value as Assumption["data_type"] })}
                      >
                        {DATA_TYPES.map((d) => (
                          <option key={d.key} value={d.key}>
                            {d.label}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-1 pt-1 text-right">
                      <Button small variant="danger" onClick={() => assumptions.remove(a.id)}>
                        Удалить
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Button className="mt-3" onClick={() => assumptions.add({ text: "", used_in: "", basis: "", data_type: "source" })}>
          + Добавить допущение
        </Button>
      </Card>

      <Card className="mt-4" title={`Риски (${risks.rows.length})`}>
        {risks.rows.length === 0 ? (
          <Empty>Рисков пока нет.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-separate border-spacing-y-1.5">
              <thead>
                <tr>
                  <th className={`${head} w-8`}>№</th>
                  <th className={head}>Риск</th>
                  <th className={`${head} w-40`}>Вероятность</th>
                  <th className={`${head} w-40`}>Влияние</th>
                  <th className={head}>Реагирование</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {risks.rows.map((r, i) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-1 pt-2 tabular-nums text-slate-500">{i + 1}</td>
                    <td className="px-1">
                      <CommitTextarea rows={2} aria-label={`Риск ${i + 1}`} value={r.text} onCommit={(text) => risks.patch(r.id, { text })} />
                    </td>
                    <td className="px-1">
                      <CommitInput
                        aria-label={`Риск ${i + 1}: вероятность`}
                        value={r.probability}
                        onCommit={(probability) => risks.patch(r.id, { probability })}
                        placeholder="низкая / средняя / высокая"
                      />
                    </td>
                    <td className="px-1">
                      <CommitInput
                        aria-label={`Риск ${i + 1}: влияние`}
                        value={r.impact}
                        onCommit={(impact) => risks.patch(r.id, { impact })}
                        placeholder="низкое / среднее / высокое"
                      />
                    </td>
                    <td className="px-1">
                      <CommitTextarea
                        rows={2}
                        aria-label={`Риск ${i + 1}: реагирование`}
                        value={r.response}
                        onCommit={(response) => risks.patch(r.id, { response })}
                      />
                    </td>
                    <td className="px-1 pt-1 text-right">
                      <Button small variant="danger" onClick={() => risks.remove(r.id)}>
                        Удалить
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Button className="mt-3" onClick={() => risks.add({ text: "", probability: "", impact: "", response: "" })}>
          + Добавить риск
        </Button>
      </Card>
    </>
  );
}
