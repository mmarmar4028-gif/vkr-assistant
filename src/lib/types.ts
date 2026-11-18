import type { ThesisFormat } from "@/requirements";

export type Status = "todo" | "doing" | "done";

export interface PageCounts {
  main?: number | null;
  intro?: number | null;
  conclusion?: number | null;
  chapters?: number | null;
  appendices?: number | null;
  total?: number | null;
  abstractRu?: number | null;
  abstractEn?: number | null;
  abbreviations?: number | null;
}

/** Настройки, которые хранятся в profiles.settings. */
export interface Settings {
  /** Отступ первой строки, см. */
  indentCm?: number;
  /** Количество глав в шаблоне (2-4). */
  chapters?: number;
  /** Добавлять раздел «Список используемых сокращений». */
  abbreviations?: boolean;
  /** Количество страниц, введённое студентом после проверки в Word. */
  pages?: PageCounts;
  /** Выбранные виды исследований для папки «Данные». */
  research?: string[];
}

export interface Profile {
  user_id: string;
  full_name: string;
  study_group: string;
  record_book: string;
  topic_ru: string;
  topic_en: string;
  supervisor_degree: string;
  supervisor_name: string;
  format: ThesisFormat | null;
  organisation: string;
  settings: Settings;
}

export const EMPTY_PROFILE: Omit<Profile, "user_id"> = {
  full_name: "",
  study_group: "",
  record_book: "",
  topic_ru: "",
  topic_en: "",
  supervisor_degree: "",
  supervisor_name: "",
  format: null,
  organisation: "",
  settings: {},
};

export interface DeadlineState {
  stage_key: string;
  done: boolean;
  exact_date: string | null;
}

export interface ScheduleItem {
  id: string;
  position: number;
  title: string;
  due_date: string | null;
  actual_date: string | null;
  done: boolean;
  created_at?: string;
}

export interface Meeting {
  id: string;
  meeting_date: string | null;
  in_person: boolean;
  summary: string;
  created_at?: string;
}

export interface ChecklistItem {
  scope: string;
  item_key: string;
  status: Status;
  note: string;
  chapter_ref: string;
}

export interface Assumption {
  id: string;
  text: string;
  used_in: string;
  basis: string;
  data_type: "source" | "company" | "expert" | "own";
  created_at?: string;
}

export interface Risk {
  id: string;
  text: string;
  probability: string;
  impact: string;
  response: string;
  created_at?: string;
}

export interface AiEntry {
  id: string;
  used_on: string | null;
  model: string;
  purpose: string;
  created_at?: string;
}

export interface DefenceNote {
  criterion_key: string;
  notes: string;
  questions: string[];
}
