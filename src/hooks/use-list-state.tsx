import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useLocation } from "@tanstack/react-router";
import { useMiniOps } from "@/features/store";

function createListState() {
  const values = new Map<string, unknown>();
  const listeners = new Set<() => void>();
  return {
    values,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(key: string, value: unknown) {
      values.set(key, value);
      listeners.forEach((listener) => listener());
    },
  };
}

const ListStateContext = createContext<ReturnType<typeof createListState> | null>(null);

export function ListStateProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createListState);
  return <ListStateContext.Provider value={store}>{children}</ListStateContext.Provider>;
}

// Keep list preferences for this app session, separately for each user, workspace and page.
export function useListState<T>(
  name: string,
  initial: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  const store = useContext(ListStateContext);
  if (!store) throw new Error("ListStateProvider missing");
  const { profile, activeWorkspace } = useMiniOps();
  const pathname = useLocation({ select: (location) => location.pathname });
  const key = JSON.stringify([profile.id, activeWorkspace.id, pathname, name]);
  const [fallback] = useState(initial);
  const value = useSyncExternalStore(
    store.subscribe,
    () => (store.values.has(key) ? (store.values.get(key) as T) : fallback),
    () => fallback,
  );
  const setValue = useCallback<Dispatch<SetStateAction<T>>>(
    (next) => {
      const current = store.values.has(key) ? (store.values.get(key) as T) : fallback;
      store.set(key, typeof next === "function" ? (next as (previous: T) => T)(current) : next);
    },
    [store, key, fallback],
  );
  return [value, setValue];
}

export function useResetPageOnFilterChange(filters: unknown[], setPage: (page: number) => void) {
  const key = JSON.stringify(filters);
  const previous = useRef(key);
  useEffect(() => {
    if (previous.current !== key) {
      previous.current = key;
      setPage(1);
    }
  }, [key, setPage]);
}
