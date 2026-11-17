import { wealdSuppliesLootFixture } from "../../../../packages/engine/src/test-helpers/weald-task-battle";
import { createLootState } from "../../../../packages/engine/src/loot";
import type { GameState } from "../../../../packages/engine/src/command";
/** 受控普通战斗页面检查点，核对旧版本进入新口径，不是自然养成日志。 */
export function shriekerSkipRollsUiFixture(): GameState {
  const source = wealdSuppliesLootFixture(),
    b = source.battle!,
    loot = createLootState();
  const token = loot.available.find((t) => t.kind === "rollProvision")!;
  return {
    ...source,
    dungeon: {
      ...source.dungeon!,
      campaignLevel: 2,
      wealdHigherBosses: true,
      shriekerBossBattles: true,
      activeBossThreatScriptId: "boss:weald:shrieker:2",
      imminentThreatDescriptionCardId: "boss_ability:weald:p002",
      questDistribution: { ...source.dungeon!.questDistribution!, questId: "quest:weald:p006" },
    },
    battle: {
      ...b,
      loot: {
        ...loot,
        available: loot.available.filter((t) => t.id !== token.id),
        placed: [{ ...token, areaId: b.entities[0]!.areaId, revealed: false }],
      },
    },
  };
}
