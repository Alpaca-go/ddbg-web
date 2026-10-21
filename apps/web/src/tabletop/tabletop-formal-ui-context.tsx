import { createContext, useContext, type ReactNode } from "react";

export type TabletopFormalUiApi = {
  readonly battleActionHost: HTMLDivElement | null;
  readonly selectRoomCard: (roomCardId: string) => void;
  readonly selectRoomNode: (roomNodeId: string) => void;
};

const TabletopFormalUiContext = createContext<TabletopFormalUiApi | null>(null);

export function TabletopFormalUiProvider({
  value,
  children,
}: {
  readonly value: TabletopFormalUiApi;
  readonly children: ReactNode;
}) {
  return (
    <TabletopFormalUiContext.Provider value={value}>{children}</TabletopFormalUiContext.Provider>
  );
}

export function useTabletopFormalUi(): TabletopFormalUiApi | null {
  return useContext(TabletopFormalUiContext);
}
