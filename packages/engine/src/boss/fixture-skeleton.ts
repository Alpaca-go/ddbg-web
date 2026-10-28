import { registerBossScript } from "./registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "./rules";
import type { BossScriptDefinition } from "./types";

/** 测试与集成探针用；不引用印刷 Boss 名称或数值。 */
export const FIXTURE_BOSS_SCRIPT_ID = "boss:fixture:phase5-skeleton" as const;

/** 测试用 Boss 战斗卡 id；不引用印刷卡。 */
export const FIXTURE_BOSS_COMBAT_MONSTER_CARD_ID = "monster:fixture:boss-combat" as const;

export const fixtureBossSkeletonScript: BossScriptDefinition = {
  id: FIXTURE_BOSS_SCRIPT_ID,
  displayName: "Phase5 Skeleton Fixture",
  rules: DEFAULT_BOSS_BATTLE_RULES,
  notes: "仅用于单元测试；不代表任何印刷 Boss。",
  combatEntry: {
    descriptionAbilityCardId: "boss_ability:fixture:desc",
    combatAbilityCardId: "boss_ability:fixture:combat",
    combatMonsterCardId: FIXTURE_BOSS_COMBAT_MONSTER_CARD_ID,
    printedInitiativeCards: 1,
    printedActionsPerRound: 1,
  },
  hooks: {
    threatPassiveDungeon: () => ({
      status: "stub",
      message: "fixture：地牢侧威胁被动未实现",
      hold: "Boss Abilities normalized",
    }),
    threatPassiveHamlet: () => ({
      status: "stub",
      message: "fixture：村庄侧威胁被动未实现",
      hold: "升幕 / 任务卡",
    }),
    faceTheThreatEmbark: (ctx) => ({
      status: "stub",
      message: `fixture：Face the Threat 入口 quest=${ctx.questId}`,
      hold: "quest→Boss 映射待确认",
    }),
    bossSlotPlacement: (ctx) => ({
      status: "stub",
      message: `fixture：Boss 位布置 layout=${ctx.layoutId} slots=${ctx.bossSlotNodeIds.length}`,
      hold: "R-121 / 归任务卡",
    }),
    monsterTurnActionCount: () => ({ status: "ok", value: 2 }),
    summon: () => ({
      status: "stub",
      message: "fixture：召唤未实现",
      hold: "R31",
    }),
  },
};

let fixtureRegistered = false;

export function ensureFixtureBossScriptRegistered(): void {
  if (fixtureRegistered) return;
  registerBossScript(fixtureBossSkeletonScript);
  fixtureRegistered = true;
}
