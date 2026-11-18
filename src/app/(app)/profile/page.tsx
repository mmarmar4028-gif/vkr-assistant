"use client";

import { Card, Clause, CommitInput, CommitTextarea, Field, Loading, Notice, PageHeader, cx } from "@/components/ui";
import { useProfile } from "@/lib/hooks";
import { FORMATS, TITLE_PAGE } from "@/requirements";

export default function ProfilePage() {
  const { profile, loading, save } = useProfile();
  if (loading) return <Loading />;

  return (
    <>
      <PageHeader
        title="Профиль ВКР"
        lead="Эти данные подставляются в титульный лист, заявления и план-график. Изменения сохраняются автоматически, когда вы выходите из поля."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Студент">
          <div className="grid gap-4">
            <Field label="ФИО полностью" hint="На титульном листе будут указаны фамилия и имя.">
              <CommitInput
                value={profile.full_name}
                onCommit={(full_name) => save({ full_name })}
                placeholder="Фамилия Имя Отчество"
                autoComplete="name"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Учебная группа">
                <CommitInput value={profile.study_group} onCommit={(study_group) => save({ study_group })} />
              </Field>
              <Field
                label={
                  <>
                    Номер зачётной книжки <Clause>п. 3.1.13</Clause>
                  </>
                }
                hint="Указывается на титульном листе анонимного экземпляра вместо имени."
              >
                <CommitInput
                  value={profile.record_book}
                  onCommit={(record_book) => save({ record_book })}
                  inputMode="numeric"
                />
              </Field>
            </div>
          </div>
        </Card>

        <Card title="Научный руководитель" clause={TITLE_PAGE.clause}>
          <div className="grid gap-4">
            <Field label="Учёная степень и звание">
              <CommitInput
                value={profile.supervisor_degree}
                onCommit={(supervisor_degree) => save({ supervisor_degree })}
                placeholder="к.э.н., доцент"
              />
            </Field>
            <Field label="Фамилия И.О.">
              <CommitInput
                value={profile.supervisor_name}
                onCommit={(supervisor_name) => save({ supervisor_name })}
                placeholder="Иванов И.И."
              />
            </Field>
          </div>
        </Card>

        <Card title="Тема ВКР" clause="Прил. 8, п. 2" className="xl:col-span-2">
          <p className="mb-3 text-[14.5px] text-slate-600">
            В заявлении об утверждении темы она указывается на русском и английском языках.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Тема на русском языке">
              <CommitTextarea value={profile.topic_ru} onCommit={(topic_ru) => save({ topic_ru })} rows={3} />
            </Field>
            <Field label="Тема на английском языке">
              <CommitTextarea value={profile.topic_en} onCommit={(topic_en) => save({ topic_en })} rows={3} lang="en" />
            </Field>
          </div>
        </Card>

        <Card title="Формат ВКР" clause="п. 2.3" className="xl:col-span-2">
          <div role="radiogroup" aria-label="Формат ВКР" className="grid gap-3 md:grid-cols-3">
            {FORMATS.map((f) => {
              const active = profile.format === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => save({ format: f.key })}
                  className={cx(
                    "rounded-xl border p-3.5 text-left transition",
                    active ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200" : "border-line bg-white hover:bg-slate-50",
                  )}
                >
                  <span className="block font-semibold text-ink">{f.label}</span>
                  {f.hint && <span className="mt-1 block text-[13.5px] leading-snug text-slate-600">{f.hint}</span>}
                </button>
              );
            })}
          </div>
          {!profile.format && (
            <Notice kind="warn" className="mt-3">
              Выберите формат: от него зависят чек-листы содержания и перечень документов.
            </Notice>
          )}
          {profile.format === "project" && (
            <div className="mt-4 max-w-xl">
              <Field
                label="Название организации"
                hint="Для проектно-аналитического формата название организации указывается в теме ВКР."
              >
                <CommitInput
                  value={profile.organisation}
                  onCommit={(organisation) => save({ organisation })}
                  placeholder="ООО «Название»"
                />
              </Field>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
