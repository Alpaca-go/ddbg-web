import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";

export const DUNGEON_HERO_STANCES = ["aggressive", "defensive", "ranged", "support"] as const;
export type SetDungeonStancesCommand = {
  readonly type: "setDungeonStances";
  /** 进攻→防御→远程→支援的一次完整排列，避免逐人改姿态产生重复空档。 */
  readonly heroIds: readonly string[];
};

/** R14、R-039：本入口接导航就绪/掷骰前；未定义的结算中换位不擅自接入。 */
export function canSetDungeonStances(state: GameState): boolean {
  const d = state.dungeon;
  return !!(
    d &&
    !state.battle &&
    !d.pending &&
    !d.hamletReturn &&
    !d.deathTrinketChoice &&
    !d.replacementPreparation &&
    !d.preparedReplacements?.length &&
    !d.replacementResume &&
    !d.campaignFailure &&
    !d.conditions?.incomingQuirk &&
    !d.trinkets?.incoming &&
    !d.curio?.active &&
    !d.pendingCurioDraw &&
    !d.roomCards?.active &&
    !d.monsterPool?.active &&
    !d.backtracking &&
    (!d.roomResolution || d.roomResolution.completed) &&
    ((d.phase === "ready" && !d.exploration?.rolls?.some((r) => !r.resolved)) ||
      (d.phase === "awaitingHazards" &&
        d.exploration?.from === d.position &&
        !d.exploration.rolls)) &&
    d.heroes.length === 4 &&
    new Set(d.heroes.map((h) => h.id)).size === 4 &&
    new Set(d.heroes.map((h) => h.stance)).size === 4 &&
    d.heroes.every(
      (h) =>
        !!h.id &&
        !h.dead &&
        !h.combat?.dead &&
        Number.isSafeInteger(h.stress) &&
        h.stress >= 0 &&
        h.stress < 10 &&
        DUNGEON_HERO_STANCES.includes(h.stance!),
    )
  );
}

export function setDungeonStances(
  state: GameState,
  command: SetDungeonStancesCommand,
): ApplyResult {
  const d = state.dungeon;
  if (
    !d ||
    !canSetDungeonStances(state) ||
    !Array.isArray(command.heroIds) ||
    command.heroIds.length !== 4 ||
    new Set(command.heroIds).size !== 4 ||
    command.heroIds.some((id) => !d.heroes.some((h) => h.id === id))
  )
    return rejectBattleCommand(
      state,
      "探索姿态须在导航就绪/掷骰前，以四名存活英雄完整排列调整（R14、R-039）",
    );
  const heroes = command.heroIds.map((id, i) => {
    const hero = d.heroes.find((h) => h.id === id)!;
    const stance = DUNGEON_HERO_STANCES[i]!;
    return { ...hero, stance, ...(hero.combat ? { combat: { ...hero.combat, stance } } : {}) };
  });
  return {
    state: { ...state, dungeon: { ...d, heroes } },
    events: [
      {
        type: "dungeonUpdated",
        message: `探索姿态：${command.heroIds.join(" → ")}；未花行动/资源或RNG（R14）`,
      },
    ],
  };
}
