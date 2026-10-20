import type { DungeonLayout } from "../../../../../packages/data/src/dungeon-layout";
import type { Fixture } from "../fixture-types";

export function fixtureDescription(fixture: Fixture, preview: DungeonLayout | null): string {
  if (fixture === "navigationProvisions") {
    return "测试注入：hero-0有3伤口、3压力、流血与腐蚀，用于检查探索间补给。";
  }
  if (fixture === "startingProvisions") {
    return "入口演示：空补给池，按种子完成开局补给后探索；地图标注仍待批准。";
  }
  if (fixture === "fundraiserRewards") {
    return "测试注入：已清理一间巢穴与60金币，仅检查退出捐献，不代表实战获得。";
  }
  if (fixture === "roomInvocation") {
    return "房间测试：固定D为巢穴；种子2按完整九房／42怪池自然抽到Invocation Chamber，不代表完整任务验收。";
  }
  if (fixture === "roomSpiked") {
    return "房间测试：固定D为巢穴；种子9按完整九房／42怪池自然抽到Spiked Pit，不代表完整任务验收。";
  }
  if (preview) {
    return "16 槽地图仅预览，未解释标记保留，未开启 Boss 规则。";
  }
  return "测试注入：导航就绪英雄与六个补给；从选路开始，逐骰结算后进入目标节点。";
}
