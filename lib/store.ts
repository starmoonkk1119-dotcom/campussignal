"use client";

import {
  createElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { seedOpportunities, seedProfile } from "@/lib/seed";
import type {
  AppState,
  ApplicationTask,
  Opportunity,
  UserProfile,
} from "@/lib/types";

const STORAGE_KEY = "campussignal.v1";
const SEED_DATE = new Date();
SEED_DATE.setHours(0, 0, 0, 0);

function seedState(): AppState {
  return {
    profile: seedProfile(),
    opportunities: seedOpportunities(SEED_DATE),
    tasks: [],
  };
}

function isAppState(value: unknown): value is AppState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<AppState>;
  return (
    "profile" in candidate &&
    (candidate.profile === null || typeof candidate.profile === "object") &&
    Array.isArray(candidate.opportunities) &&
    Array.isArray(candidate.tasks)
  );
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadState(): AppState {
  if (typeof window === "undefined") {
    return seedState();
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored !== null) {
    try {
      const parsed: unknown = JSON.parse(stored);
      if (isAppState(parsed)) {
        return parsed;
      }
    } catch {
      // Fall through to the fresh demo state.
    }
  }

  const freshState = seedState();
  saveState(freshState);
  return freshState;
}

type AppContextValue = {
  state: AppState;
  setProfile: (profile: UserProfile) => void;
  addOpportunity: (opportunity: Opportunity) => void;
  updateOpportunity: (id: string, updates: Partial<Opportunity>) => void;
  toggleTask: (taskId: string) => void;
  updateTaskDate: (taskId: string, dueDate: string) => void;
  resetDemo: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => seedState());
  const stateRef = useRef(state);

  const commit = useCallback((nextState: AppState) => {
    stateRef.current = nextState;
    setState(nextState);
    saveState(nextState);
  }, []);

  useEffect(() => {
    const storedState = loadState();
    stateRef.current = storedState;
    // The storage contract requires replacing the server seed after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(storedState);
  }, []);

  const setProfile = useCallback(
    (profile: UserProfile) => {
      commit({
        ...stateRef.current,
        profile,
      });
    },
    [commit],
  );

  const addOpportunity = useCallback(
    (opportunity: Opportunity) => {
      commit({
        ...stateRef.current,
        opportunities: [...stateRef.current.opportunities, opportunity],
      });
    },
    [commit],
  );

  const updateOpportunity = useCallback(
    (id: string, updates: Partial<Opportunity>) => {
      commit({
        ...stateRef.current,
        opportunities: stateRef.current.opportunities.map((opportunity) =>
          opportunity.id === id
            ? { ...opportunity, ...updates }
            : opportunity,
        ),
      });
    },
    [commit],
  );

  const toggleTask = useCallback(
    (taskId: string) => {
      commit({
        ...stateRef.current,
        tasks: stateRef.current.tasks.map((task: ApplicationTask) =>
          task.id === taskId
            ? { ...task, status: task.status === "done" ? "todo" : "done" }
            : task,
        ),
      });
    },
    [commit],
  );

  const updateTaskDate = useCallback(
    (taskId: string, dueDate: string) => {
      commit({
        ...stateRef.current,
        tasks: stateRef.current.tasks.map((task) =>
          task.id === taskId ? { ...task, dueDate } : task,
        ),
      });
    },
    [commit],
  );

  const resetDemo = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    commit(seedState());
  }, [commit]);

  const contextValue = useMemo(
    () => ({
      state,
      setProfile,
      addOpportunity,
      updateOpportunity,
      toggleTask,
      updateTaskDate,
      resetDemo,
    }),
    [
      state,
      setProfile,
      addOpportunity,
      updateOpportunity,
      toggleTask,
      updateTaskDate,
      resetDemo,
    ],
  );

  // JSX is intentionally avoided here so this contract remains in lib/store.ts.
  // eslint-disable-next-line react-hooks/refs
  return createElement(AppContext.Provider, { value: contextValue }, children);
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (context === null) {
    throw new Error("useApp must be used within AppProvider.");
  }
  return context;
}
