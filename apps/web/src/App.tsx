import { DungeonSandbox, DungeonQuest } from "./dungeon-sandbox";
import { BattleView } from "./battle-view";
import { useBattleStore } from "./battle-store";

export function App() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("phase") === "3" && params.get("play") === "1") return <DungeonQuest />;
  return params.get("phase") === "3" ? <DungeonSandbox /> : <BattleSandbox />;
}
function BattleSandbox() {
  const props = useBattleStore();
  return <BattleView {...props} />;
}
