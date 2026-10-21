import { readBasicQuest } from "../../../../../packages/data/src/basic-quests";
import type { GameState } from "@ddbg/engine";
import type { DungeonLayout } from "../../../../../packages/data/src/dungeon-layout";
import type { Fixture } from "../fixture-types";

export function DungeonHeader({
  game,
  formal,
  page,
  fixture,
  preview,
}: {
  game: GameState;
  formal: boolean;
  page: number;
  fixture: Fixture;
  preview: DungeonLayout | null;
}) {
  const d = game.dungeon!;
  const quest = readBasicQuest(d.questDistribution);
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">DDBG · PHASE 3</p>
        <h1>{formal ? quest!.name : "地牢布局与侦察"}</h1>
        <p className="muted">
          QuestMap p{page} {d.layout.review === "confirmed" ? "已批准" : "标注待批准"} ·{" "}
          {quest?.name ?? "任务身份待核实"} · 固定种子 {game.seed} · 光照{" "}
          {d.explorationSetup?.light ?? "待配置"}、DL {d.explorationSetup!.dungeonLevel}
        </p>
        {!formal && (
          <>
            <p>
              {fixture === "navigationProvisions"
                ? "测试注入：hero-0有3伤口、3压力、流血与腐蚀，用于检查探索间补给。"
                : fixture === "startingProvisions"
                  ? "入口演示：空补给池，按种子完成开局补给后探索；地图标注仍待批准。"
                  : fixture === "fundraiserRewards"
                    ? "测试注入：已清理一间巢穴与60金币，仅检查退出捐献，不代表实战获得。"
                    : fixture === "roomInvocation"
                      ? "房间测试：固定D为巢穴；种子2按完整九房／42怪池自然抽到Invocation Chamber，不代表完整任务验收。"
                      : fixture === "roomSpiked"
                        ? "房间测试：固定D为巢穴；种子9按完整九房／42怪池自然抽到Spiked Pit，不代表完整任务验收。"
                        : preview
                          ? "16 槽地图仅预览，未解释标记保留，未开启 Boss 规则。"
                          : "测试注入：导航就绪英雄与六个补给；从选路开始，逐骰结算后进入目标节点。"}
            </p>
          </>
        )}
        <a href="/?view=battle">返回战斗沙盒</a>
      </div>
    </header>
  );
}
