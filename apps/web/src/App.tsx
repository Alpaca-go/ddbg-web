import { DungeonSandbox } from "./dungeon-sandbox";
import { BattleView } from "./battle-view";
import { useBattleStore } from "./battle-store";

export function App() {
  return new URLSearchParams(window.location.search).get("phase") === "3" ? (
    <DungeonSandbox />
  ) : (
    <BattleSandbox />
  );
}
function BattleSandbox() {
  const props = useBattleStore();
  return <BattleView {...props} />;
}
