import { lazy, Suspense } from "react";
import { DungeonSandbox, DungeonQuest } from "./dungeon-sandbox";
import { BattleView } from "./battle-view";
import { useBattleStore } from "./battle-store";
import { TabletopView } from "./tabletop";

const HeroSkillsReviewWorkbench = lazy(() =>
  import("./review/HeroSkillsReviewWorkbench").then((m) => ({
    default: m.HeroSkillsReviewWorkbench,
  })),
);

export function App() {
  const params = new URLSearchParams(window.location.search);
  // Phase A0.5：dev-only 复核工作台；无公网隧道、不公开卡图
  if (params.get("review") === "hero-skills") {
    if (!import.meta.env.DEV) {
      return <p className="p-4 text-stone-200">复核工作台仅开发模式可用。</p>;
    }
    return (
      <Suspense fallback={<p className="p-4 text-stone-200">加载复核工作台…</p>}>
        <HeroSkillsReviewWorkbench />
      </Suspense>
    );
  }
  if (params.get("view") === "tabletop") return <TabletopView />;
  if (params.get("view") === "battle" || params.get("phase") === "2") return <BattleSandbox />;
  if (params.get("phase") === "3" && params.get("play") === "1") return <DungeonQuest />;
  return params.get("phase") === "3" ? <DungeonSandbox /> : <DungeonQuest />;
}
function BattleSandbox() {
  const props = useBattleStore();
  return <BattleView {...props} />;
}
