import type { ApplyResult, GameState } from "../command";
import type { DungeonState } from "../dungeon";
import { passiveStress } from "../passive";
import { resolveBattlePressure } from "../pressure";
import { triggerDungeonPassive } from "../dungeon-passive";
import { resolveDungeonPressure } from "../dungeon-pressure";
import type { MonsterCardView } from "../monster-skill";
import { ensureCoreBossScriptsRegistered } from "./ensure-core-boss-scripts";
import { getBossScript } from "./registry";
import { readActiveBossThreatScriptId } from "./threat-campaign";
import {
  beastMonsterDamageBonusFromBossThreat,
  eldritchMonsterDamageBonusFromBossThreat,
  sanitariumHealLifeDeltaFromBossThreat,
  stressOnDungeonEntryPerHeroFromBossThreat,
  stressOnHeroProvisionUseFromBossThreat,
  tavernStressRecoveryDeltaFromBossThreat,
} from "./threat-passive";
import { skipCurioDrawInCurioRoomsFromBossThreat } from "./threat-passive";
import type { BossScriptDefinition } from "./types";

export function readActiveBossThreatScript(d: DungeonState): BossScriptDefinition | undefined {
  const scriptId = readActiveBossThreatScriptId(d);
  if (!scriptId) return undefined;
  ensureCoreBossScriptsRegistered();
  const script = getBossScript(scriptId);
  return script?.id === scriptId ? script : undefined;
}

/** 怪物类型标签 + 当前威胁 → 对英雄攻击的 flat 伤害加值（Beast / Eldritch）。 */
export function monsterThreatFlatDamageBonus(
  d: DungeonState | undefined,
  typeTags: readonly string[] | undefined,
): number {
  const script = d ? readActiveBossThreatScript(d) : undefined;
  if (!script || !typeTags?.length) return 0;
  const normalized = typeTags.map((tag) => tag.toLowerCase());
  if (normalized.includes("beast")) return beastMonsterDamageBonusFromBossThreat(script);
  if (normalized.includes("eldritch")) return eldritchMonsterDamageBonusFromBossThreat(script);
  return 0;
}

export function monsterCombatThreatDamageBonus(
  d: DungeonState | undefined,
  monster: Pick<MonsterCardView, "type_position_tags">,
): number {
  return monsterThreatFlatDamageBonus(d, monster.type_position_tags);
}

/** 酒馆减压服务有效恢复量（含 Prophet 等村庄威胁修正）。 */
export function effectiveHamletStressRecoveryAmount(
  d: DungeonState,
  building: string,
  baseAmount: number,
): number {
  const script = readActiveBossThreatScript(d);
  if (!script || building !== "tavern") return baseAmount;
  const delta = tavernStressRecoveryDeltaFromBossThreat(script);
  return Math.max(0, baseAmount + delta);
}

/** 疗养院单次治疗有效 Life（含 Hag 等村庄威胁修正）。 */
export function effectiveHamletSanitariumHealAmount(d: DungeonState, baseAmount: number): number {
  const script = readActiveBossThreatScript(d);
  if (!script) return baseAmount;
  const delta = sanitariumHealLifeDeltaFromBossThreat(script);
  return Math.max(0, baseAmount + delta);
}

function applyStressToHeroes(
  state: GameState,
  heroIds: readonly string[],
  amount: number,
  pressureSource: DungeonState["pressureSource"],
  message: string,
): ApplyResult {
  if (amount <= 0 || !heroIds.length) {
    return { state, events: [] };
  }
  let d = state.dungeon!;
  const passive = triggerDungeonPassive(d, state.seed, heroIds, { type: "stress", amount });
  if (passive.status === "refused") {
    return { state, events: [{ type: "commandRefused", message: passive.reason }] };
  }
  d = passive.dungeon;
  const events = [...passive.events, { type: "dungeonUpdated" as const, message }];
  if (d.heroes.some((h) => h.dead)) {
    return {
      state: {
        ...state,
        dungeon: {
          ...d,
          phase: "awaitingReplacement",
          pending: null,
          replacementResume: "exploration",
        },
      },
      events: [
        ...events,
        { type: "dungeonUpdated", message: "Boss 威胁压力导致死亡，等待英雄替换（R9）" },
      ],
    };
  }
  if (d.heroes.some((h) => h.stress === 10)) {
    const source = pressureSource ?? "exploration";
    return resolveDungeonPressure({
      ...state,
      dungeon: { ...d, phase: "blockedPressure", pressureSource: source },
    });
  }
  return { state: { ...state, dungeon: d }, events };
}

/** 进地牢（开局补给完成 → ready）时每名英雄额外压力。 */
export function applyBossThreatStressOnDungeonEntry(state: GameState): ApplyResult {
  const d = state.dungeon;
  if (!d) return { state, events: [] };
  const script = readActiveBossThreatScript(d);
  if (!script) return { state, events: [] };
  const perHero = stressOnDungeonEntryPerHeroFromBossThreat(script);
  return applyStressToHeroes(
    state,
    d.heroes.filter((h) => !h.dead).map((h) => h.id),
    perHero,
    "exploration",
    `迫近威胁：每名英雄进地牢压力 +${perHero}（${script.displayName}）`,
  );
}

/** 英雄消耗一颗补给（探索 / 战斗）时的额外压力。 */
export function applyBossThreatStressOnProvisionUse(state: GameState, heroId: string): ApplyResult {
  if (state.battle) return applyBossThreatStressOnBattleProvisionUse(state, heroId);
  const d = state.dungeon;
  if (!d) return { state, events: [] };
  const script = readActiveBossThreatScript(d);
  if (!script) return { state, events: [] };
  const delta = stressOnHeroProvisionUseFromBossThreat(script);
  return applyStressToHeroes(
    state,
    [heroId],
    delta,
    d.pressureSource ?? "provision",
    `迫近威胁：${heroId} 使用补给压力 +${delta}（${script.displayName}）`,
  );
}

/** 战斗内使用补给时的 Hag 等威胁压力（更新 battle.entities）。 */
export function applyBossThreatStressOnBattleProvisionUse(
  state: GameState,
  heroId: string,
): ApplyResult {
  const d = state.dungeon;
  const battle = state.battle;
  if (!d || !battle) return { state, events: [] };
  const script = readActiveBossThreatScript(d);
  if (!script) return { state, events: [] };
  const delta = stressOnHeroProvisionUseFromBossThreat(script);
  if (delta <= 0) return { state, events: [] };
  const entity = battle.entities.find((e) => e.id === heroId && e.side === "hero" && !e.dead);
  if (!entity || entity.stress === undefined) {
    return {
      state,
      events: [{ type: "commandRefused", message: "战斗补给威胁压力缺有效英雄压力" }],
    };
  }
  const next = {
    ...state,
    battle: {
      ...battle,
      entities: battle.entities.map((e) =>
        e.id === heroId
          ? {
              ...e,
              stress: Math.max(
                0,
                Math.min(10, e.stress! + passiveStress(e, delta, battle.light).amount),
              ),
            }
          : e,
      ),
    },
  };
  const pressure = resolveBattlePressure({ state: next, events: [] });
  return {
    ...pressure,
    events: [
      ...pressure.events,
      {
        type: "dungeonUpdated",
        message: `迫近威胁：${heroId} 战斗中使用补给压力 +${delta}（${script.displayName}）`,
      },
    ],
  };
}

/** Collector I 等：Curio 房间清理后不进入 Curio 抽牌流程。 */
export function shouldSkipCurioDrawInCurioRoom(d: DungeonState): boolean {
  const script = readActiveBossThreatScript(d);
  return script ? skipCurioDrawInCurioRoomsFromBossThreat(script) : false;
}

/** 跳过 Curio 房间奖励抽牌，直接清理房间并返回导航。 */
export function completeCurioRoomWithoutCurioDraw(state: GameState): ApplyResult {
  const d = state.dungeon!;
  const { curioRoom: _room, ...rest } = d;
  void _room;
  return {
    state: {
      ...state,
      dungeon: {
        ...rest,
        phase: "ready",
        pending: null,
        rooms: d.rooms.map((r) => (r.id === d.position ? { ...r, cleared: true } : r)),
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: "迫近威胁：Curio 房间不抽 Curio，房间已清理（Collector I / Taken Away I）",
      },
    ],
  };
}
