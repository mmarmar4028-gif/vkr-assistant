"use client";

import { Card, ChecklistRow, Empty, Loading, Notice, PageHeader, Progress, cx } from "@/components/ui";
import { useChecklist, useProfile } from "@/lib/hooks";
import { DATA_FOLDER } from "@/requirements";

export default function DataFolderPage() {
  const { profile, saveSettings, loading } = useProfile();
  const list = useChecklist("data");

  if (loading || list.loading) return <Loading />;

  const business = profile.format === "business";
  const chosen = new Set(profile.settings.research ?? []);
  // Для бизнес-проекта финансовая модель в Excel обязательна (п. 2.3).
  if (business) chosen.add("calc");

  const toggle = (key: string, on: boolean) => {
    const next = new Set(profile.settings.research ?? []);
    if (on) next.add(key);
    else next.delete(key);
    saveSettings({ research: [...next] });
  };

  const visible = DATA_FOLDER.researchTypes.filter((t) => chosen.has(t.key));
  const keys = visible.flatMap((t) => t.items.map((i) => i.key));

  return (
    <>
      <PageHeader
        title="Папка «Данные»"
        clause={DATA_FOLDER.clause}
        lead={`${DATA_FOLDER.intro} Файлы в приложение не загружаются — здесь только отметки о готовности.`}
      />

      <Card title="Какие исследования и расчёты есть в вашей ВКР">
        <div className="grid gap-2 sm:grid-cols-3">
          {DATA_FOLDER.researchTypes.map((t) => {
            const locked = business && t.key === "calc";
            const on = chosen.has(t.key);
            return (
              <label
                key={t.key}
                className={cx(
                  "flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-[15px] transition",
                  on ? "border-brand-400 bg-brand-50" : "border-line bg-white hover:bg-slate-50",
                )}
              >
                <input
                  type="checkbox"
                  className="size-4.5"
                  checked={on}
                  disabled={locked}
                  onChange={(e) => toggle(t.key, e.target.checked)}
                />
                {t.label}
              </label>
            );
          })}
        </div>
        {business && (
          <Notice className="mt-3" clause={DATA_FOLDER.businessNote.clause}>
            {DATA_FOLDER.businessNote.text}
          </Notice>
        )}
      </Card>

      <Card className="mt-4" title="Что должно лежать в папке «Данные» на электронном носителе">
        {visible.length === 0 ? (
          <Empty>Отметьте выше виды исследований — появится перечень файлов.</Empty>
        ) : (
          <>
            <Progress done={list.doneCount(keys)} total={keys.length} />
            {visible.map((t) => (
              <div key={t.key} className="mt-4">
                <h3 className="text-[15px] font-semibold text-slate-700">{t.label}</h3>
                <ul>
                  {t.items.map((item) => (
                    <ChecklistRow
                      key={item.key}
                      text={item.text}
                      clause={item.clause}
                      withChapter={false}
                      value={list.get(item.key)}
                      onChange={(changes) => list.save(item.key, changes)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
      </Card>
    </>
  );
}
