import { DungeonSandbox, DungeonQuest } from "./dungeon-sandbox";
import { BattleView } from "./battle-view";
import { useBattleStore } from "./battle-store";
import { TabletopView } from "./tabletop";

export function App() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("view") === "tabletop") return <TabletopView />;
  if (params.get("view") === "battle" || params.get("phase") === "2") return <BattleSandbox />;
  if (params.get("phase") === "3" && params.get("play") === "1") return <DungeonQuest />;
  return params.get("phase") === "3" ? <DungeonSandbox /> : <DungeonQuest />;
}
function BattleSandbox() {
  const props = useBattleStore();
  return <BattleView {...props} />;
}
