import { type ComponentChildren, createContext } from "preact";
import type { Dispatch } from "preact/hooks";
import { useContext, useMemo, useReducer } from "preact/hooks";
import type { AppAction } from "../state/app-actions.types";
import { initialState } from "../state/app-initial-state";
import { appReducer } from "../state/app-reducer";
import type { AppState } from "../state/app-state.types";

type AppStoreContextValue = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
};

const AppStoreContext = createContext<AppStoreContextValue | undefined>(undefined);

type AppStoreProviderProps = {
  children: ComponentChildren;
};

export function AppStoreProvider({ children }: AppStoreProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const value = useMemo<AppStoreContextValue>(() => ({ state, dispatch }), [state]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreContextValue {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error("useAppStore must be used within AppStoreProvider");
  }

  return context;
}
