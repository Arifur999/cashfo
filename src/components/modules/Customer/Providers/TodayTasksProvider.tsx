"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { TodoList } from "@/lib/customer/api";
import { getTodayTodoListAction } from "@/lib/customer/todosActions";

interface TodayTasksContextValue {
  // Today's list, null before it loads or when there is none yet.
  list: TodoList | null;
  loaded: boolean;
  // The last load failed (an outage, a timeout): "Couldn't load today's
  // tasks" rather than "Nothing planned".
  failed: boolean;
  // Open tasks today, for the badge on the top bar and the sidebar.
  openCount: number;
  setList: (list: TodoList | null) => void;
  reload: () => Promise<void>;
}

const TodayTasksContext = createContext<TodayTasksContextValue | null>(null);

// One copy of today's to-do list for the shell: the top bar's Today button,
// the sidebar's To-do badge and the tasks panel all read and update it, so
// the count never lags behind the list.
export function TodayTasksProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<TodoList | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    const result = await getTodayTodoListAction();
    if (result.success) setList(result.data ?? null);
    setFailed(!result.success);
    setLoaded(true);
  }, []);

  // The first load, once, when the shell mounts.
  useEffect(() => {
    let cancelled = false;
    getTodayTodoListAction().then((result) => {
      if (cancelled) return;
      if (result.success) setList(result.data ?? null);
      setFailed(!result.success);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<TodayTasksContextValue>(
    () => ({ list, loaded, failed, openCount: list?.items.filter((item) => !item.completed).length ?? 0, setList, reload }),
    [list, loaded, failed, reload],
  );
  return <TodayTasksContext.Provider value={value}>{children}</TodayTasksContext.Provider>;
}

const fallback: TodayTasksContextValue = { list: null, loaded: false, failed: false, openCount: 0, setList: () => {}, reload: async () => {} };

export function useTodayTasks(): TodayTasksContextValue {
  return useContext(TodayTasksContext) ?? fallback;
}
