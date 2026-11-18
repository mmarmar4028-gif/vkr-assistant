"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth";
import type { Row } from "./store";
import { EMPTY_PROFILE, type ChecklistItem, type Profile, type Settings, type Status } from "./types";

/* ---------------- Сообщения об ошибках ---------------- */

type Listener = (message: string) => void;
const listeners = new Set<Listener>();

export function notifyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  listeners.forEach((l) => l(message));
}

export function useErrorMessages(): { messages: string[]; dismiss(index: number): void } {
  const [messages, setMessages] = useState<string[]>([]);
  useEffect(() => {
    const listener: Listener = (m) => setMessages((prev) => [...prev.slice(-2), m]);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return { messages, dismiss: (i) => setMessages((prev) => prev.filter((_, index) => index !== i)) };
}

/* ---------------- Таблицы со строками (id) ---------------- */

export function useRows<T extends { id: string }>(table: string, orderBy = "created_at") {
  const { backend } = useAuth();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!backend) return;
    let cancelled = false;
    backend
      .select<T>(table, orderBy)
      .then((loaded) => {
        if (!cancelled) setRows(loaded);
      })
      .catch(notifyError)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backend, table, orderBy, version]);

  const add = useCallback(
    async (row: Row): Promise<T | null> => {
      if (!backend) return null;
      try {
        const created = await backend.insert<T>(table, row);
        setRows((prev) => [...prev, created]);
        return created;
      } catch (e) {
        notifyError(e);
        return null;
      }
    },
    [backend, table],
  );

  const patch = useCallback(
    async (id: string, changes: Partial<T>) => {
      if (!backend) return;
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)));
      try {
        await backend.update(table, id, changes as Row);
      } catch (e) {
        notifyError(e);
        reload();
      }
    },
    [backend, table, reload],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!backend) return;
      setRows((prev) => prev.filter((r) => r.id !== id));
      try {
        await backend.remove(table, id);
      } catch (e) {
        notifyError(e);
        reload();
      }
    },
    [backend, table, reload],
  );

  return { rows, loading, add, patch, remove, reload };
}

/* ---------------- Таблицы с составным ключом ---------------- */

/**
 * Строки, которые адресуются ключом, а не id (отметки сроков, чек-листы,
 * заметки к критериям). `fixed` — общие для всех строк поля (например, scope).
 */
export function useKeyedRows<T extends Row>(table: string, keyField: string, fixed?: Row) {
  const { backend } = useAuth();
  const [map, setMap] = useState<Record<string, T>>({});
  const [loading, setLoading] = useState(true);
  const fixedJson = JSON.stringify(fixed ?? {});
  const mapRef = useRef(map);
  useEffect(() => {
    mapRef.current = map;
  }, [map]);

  useEffect(() => {
    if (!backend) return;
    let cancelled = false;
    const fixedFields: Row = JSON.parse(fixedJson);
    backend
      .select<T>(table)
      .then((rows) => {
        if (cancelled) return;
        const next: Record<string, T> = {};
        for (const row of rows) {
          if (Object.entries(fixedFields).every(([k, v]) => row[k] === v)) next[row[keyField]] = row;
        }
        setMap(next);
      })
      .catch(notifyError)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [backend, table, keyField, fixedJson]);

  const save = useCallback(
    async (key: string, changes: Partial<T>) => {
      if (!backend) return;
      const fixedFields: Row = JSON.parse(fixedJson);
      const row = { ...fixedFields, ...(mapRef.current[key] ?? {}), ...changes, [keyField]: key } as Row;
      delete row.user_id;
      // сразу обновляем и ссылку: два сохранения подряд не должны затирать друг друга
      mapRef.current = { ...mapRef.current, [key]: row as T };
      setMap((prev) => ({ ...prev, [key]: row as T }));
      try {
        await backend.upsert(table, row, [...Object.keys(fixedFields), keyField]);
      } catch (e) {
        notifyError(e);
      }
    },
    [backend, table, keyField, fixedJson],
  );

  return { map, loading, save };
}

const EMPTY_CHECK = { status: "todo" as Status, note: "", chapter_ref: "" };

/** Чек-лист одного раздела: статус, заметка и ссылка на главу для каждого пункта. */
export function useChecklist(scope: string) {
  const fixed = useMemo(() => ({ scope }), [scope]);
  const { map, loading, save } = useKeyedRows<ChecklistItem>("checklist_items", "item_key", fixed);
  const get = useCallback((key: string) => ({ ...EMPTY_CHECK, ...(map[key] ?? {}) }), [map]);
  const doneCount = useCallback((keys: string[]) => keys.filter((k) => map[k]?.status === "done").length, [map]);
  return { get, save, loading, doneCount };
}

/* ---------------- Профиль ВКР ---------------- */

interface ProfileValue {
  profile: Profile;
  loading: boolean;
  save(changes: Partial<Profile>): Promise<void>;
  saveSettings(changes: Partial<Settings>): Promise<void>;
}

const ProfileContext = createContext<ProfileValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { backend, user } = useAuth();
  const [profile, setProfile] = useState<Profile>({ ...EMPTY_PROFILE, user_id: user?.id ?? "" });
  const [loading, setLoading] = useState(true);
  const ref = useRef(profile);
  useEffect(() => {
    ref.current = profile;
  }, [profile]);

  useEffect(() => {
    if (!backend || !user) return;
    let cancelled = false;
    backend
      .select<Profile>("profiles")
      .then(async (rows) => {
        if (cancelled) return;
        if (rows.length) {
          setProfile({ ...EMPTY_PROFILE, ...rows[0], settings: rows[0].settings ?? {} });
        } else {
          const created = await backend.upsert<Profile>("profiles", { ...EMPTY_PROFILE }, []);
          if (!cancelled) setProfile({ ...EMPTY_PROFILE, ...created, settings: created.settings ?? {} });
        }
      })
      .catch(notifyError)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [backend, user]);

  const save = useCallback(
    async (changes: Partial<Profile>) => {
      if (!backend) return;
      const next = { ...ref.current, ...changes };
      ref.current = next;
      setProfile(next);
      try {
        const { user_id: _omit, ...row } = next;
        void _omit;
        await backend.upsert("profiles", { ...row, updated_at: new Date().toISOString() }, []);
      } catch (e) {
        notifyError(e);
      }
    },
    [backend],
  );

  const saveSettings = useCallback(
    (changes: Partial<Settings>) => save({ settings: { ...ref.current.settings, ...changes } }),
    [save],
  );

  return (
    <ProfileContext.Provider value={{ profile, loading, save, saveSettings }}>{children}</ProfileContext.Provider>
  );
}

export function useProfile(): ProfileValue {
  const value = useContext(ProfileContext);
  if (!value) throw new Error("useProfile: нет ProfileProvider");
  return value;
}
