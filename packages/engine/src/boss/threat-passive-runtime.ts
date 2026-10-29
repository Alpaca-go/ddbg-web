import type { ApplyResult, GameState } from "../command";
import type { DungeonState } from "../dungeon";
import { nextBattleRoll } from "../battle-roll";
import { passiveStress } from "../passive";
import { resolveHeroHealth } from "../hero-health";
import { resolveBattlePressure } from "../pressure";
import { triggerDungeonPassive } from "../dungeon-passive";
import { resolveDungeonPressure } from "../dungeon-pressure";
import type { MonsterCardView } from "../monster-skill";
import { readHeroPassiveDefence } from "../battle-skill-status";
import { addStatusStack, STATUS_KINDS, statusProjection } from "../status";
import type { StatusKind, StatusStack } from "../status";
import { ensureCoreBossScriptsRegistered } from "./ensure-core-boss-scripts";
import { getBossScript } from "./registry";
import { readActiveBossThreatScriptId } from "./threat-campaign";
import {
  beastMonsterDamageBonusFromBossThreat,
  blackSheepStressDeltaFromBossThreat,
  creepingSicknessWoundsPerUnvisitedBuildingFromBossThreat,
  eldritchMonsterDamageBonusFromBossThreat,
  guardTurnsOnLargeMonsterSpawnFromBossThreat,
  markTurnsOnBattleStartFromBossThreat,
  sanitariumHealLifeDeltaFromBossThreat,
  stressOnDungeonEntryPerHeroFromBossThreat,
  stressOnHeroProvisionUseFromBossThreat,
  tavernStressRecoveryDeltaFromBossThreat,
} from "./threat-passive";
import { skipCurioDrawInCurioRoomsFromBossThreat } from "./threat-passive";
import type { BossScriptDefinition } from "./types";

const HAMLET_HERO_STANCES = ["aggressive", "defensive", "ranged", "support"] as const;

/** 与看守人 d10 表一致的唯一建筑 id（Creeping Sickness I）。 */
export const CREEPING_SICKNESS_HAMLET_BUILDINGS = [
  "survivalist",
  "tavern",
  "sanitarium",
  "abbey",
  "graveyard",
  "guild",
  "blacksmith",
  "nomadWagon",
] as const;

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

/** Fanatic I · The Black Sheep：揭示村庄事件前全体 d10，最低者承受威胁压力。 */
export function applyBossThreatBlackSheepBeforeHamletEvent(state: GameState): ApplyResult {
  const d = state.dungeon;
  if (!d || d.heroes.some((hero) => hero.dead)) return { state, events: [] };
  const script = readActiveBossThreatScript(d);
  if (!script) return { state, events: [] };
  const stressDelta = blackSheepStressDeltaFromBossThreat(script);
  if (stressDelta <= 0) return { state, events: [] };

  const order = [...d.heroes].sort(
    (a, b) =>
      HAMLET_HERO_STANCES.indexOf(a.stance as (typeof HAMLET_HERO_STANCES)[number]) -
      HAMLET_HERO_STANCES.indexOf(b.stance as (typeof HAMLET_HERO_STANCES)[number]),
  );
  let cursor = d.cursor;
  const rolls = order.map((hero) => {
    const roll = nextBattleRoll(state.seed, cursor++);
    return { heroId: hero.id, roll };
  });
  const lowest = Math.min(...rolls.map((entry) => entry.roll));
  const losers = rolls.filter((entry) => entry.roll === lowest).map((entry) => entry.heroId);
  const rollSummary = rolls.map((entry) => `${entry.heroId}:${entry.roll}`).join("、");

  const stressed = applyStressToHeroes(
    { ...state, dungeon: { ...d, cursor } },
    losers,
    stressDelta,
    "exploration",
    `迫近威胁 · The Black Sheep：d10 ${rollSummary}，最低 ${lowest} 压力 +${stressDelta}（${script.displayName}）`,
  );
  return stressed;
}

/** Flesh I · Creeping Sickness：每日末未访建筑放伤口；Hamlet 阶段结束清建筑代币。 */
export function applyBossThreatCreepingSicknessEndOfHamletDay(state: GameState): ApplyResult {
  const d = state.dungeon;
  const h = d?.hamlet;
  if (!d || !h) return { state, events: [] };
  const script = readActiveBossThreatScript(d);
  const perBuilding = script ? creepingSicknessWoundsPerUnvisitedBuildingFromBossThreat(script) : 0;
  if (perBuilding <= 0) return { state, events: [] };

  const visited = new Set(h.visitedBuildings ?? []);
  let buildingWounds: Partial<Record<string, number>> = { ...(h.buildingWounds ?? {}) };
  const added: string[] = [];
  for (const building of CREEPING_SICKNESS_HAMLET_BUILDINGS) {
    if (visited.has(building)) continue;
    const next = (buildingWounds[building] ?? 0) + perBuilding;
    buildingWounds[building] = next;
    added.push(`${building}+${perBuilding}`);
  }
  const prepComplete = h.phase === "preparationComplete";
  if (prepComplete) buildingWounds = {};

  const messages: string[] = [];
  if (added.length) {
    messages.push(
      `迫近威胁 · Creeping Sickness：未访建筑累积伤口（${added.join("、")}；${script!.displayName}）`,
    );
  }
  if (prepComplete && h.buildingWounds && Object.keys(h.buildingWounds).length) {
    messages.push("Hamlet 阶段结束：清除建筑上剩余伤口代币（Creeping Sickness I）");
  }
  if (!added.length && !prepComplete) return { state, events: [] };

  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        hamlet: { ...h, buildingWounds },
      },
    },
    events: messages.length ? [{ type: "dungeonUpdated", message: messages.join("；") }] : [],
  };
}

type HamletHero = DungeonState["heroes"][number];

/** 访问建筑时把建筑上 Creeping Sickness 伤口转移给当前英雄。 */
export function transferCreepingSicknessBuildingWoundsToHero(
  d: DungeonState,
  hero: HamletHero,
  building: string,
):
  | { readonly status: "ok"; readonly dungeon: DungeonState; readonly hero: HamletHero }
  | { readonly status: "refused"; readonly reason: string } {
  const woundsOnBuilding = d.hamlet?.buildingWounds?.[building] ?? 0;
  if (woundsOnBuilding <= 0) return { status: "ok", dungeon: d, hero };
  if (!hero.attributesVerified || hero.life === undefined || hero.wounds === undefined || hero.dead)
    return { status: "refused", reason: "Creeping Sickness 转移伤口缺已核实 Life / 伤口（R-048）" };

  const health = resolveHeroHealth(
    { life: hero.life, wounds: hero.wounds, dead: false },
    { type: "wounds", amounts: Array.from({ length: woundsOnBuilding }, () => 1) },
  );
  if (health.status !== "resolved") {
    return {
      status: "refused",
      reason:
        health.status === "refused" ? health.reason : "Creeping Sickness 伤口转移需掷骰（待确认）",
    };
  }

  const buildingWounds = { ...(d.hamlet!.buildingWounds ?? {}) };
  delete buildingWounds[building];
  return {
    status: "ok",
    dungeon: {
      ...d,
      hamlet: { ...d.hamlet!, buildingWounds },
    },
    hero: { ...hero, wounds: health.state.wounds },
  };
}

type StatusDefenceIcon = { readonly key: string | null; readonly naming: string };

/** 已确认抗性 / 免疫图标 → 状态种类。未确认则拒绝，不猜（R-048）。Shuffle 抗性不是持久状态。 */
export function confirmedStatusKinds(
  icons: readonly StatusDefenceIcon[] | undefined,
): readonly StatusKind[] | null {
  if (!icons) return null;
  const kinds: StatusKind[] = [];
  for (const icon of icons) {
    if (
      icon.key === "shuffle_resist" &&
      (icon.naming === "confirmed" || icon.naming === "confirmed_rulebook")
    )
      continue;
    const kind = STATUS_KINDS.find((entry) => icon.key === entry || icon.key === `${entry}_resist`);
    if (!kind || (icon.naming !== "confirmed" && icon.naming !== "confirmed_rulebook")) return null;
    kinds.push(kind);
  }
  return kinds;
}

function legacyStatusWithoutStacks(entity: {
  readonly statusStacks?: readonly StatusStack[];
  readonly bleed: readonly string[];
  readonly blight: readonly string[];
  readonly buffStacks?: number;
  readonly debuffStacks?: number;
  readonly markStacks?: number;
  readonly guard: boolean;
  readonly riposte?: boolean;
  readonly protection?: boolean;
  readonly innateProtection?: boolean;
}): boolean {
  if (entity.statusStacks !== undefined) return false;
  return (
    entity.bleed.length > 0 ||
    entity.blight.length > 0 ||
    (entity.buffStacks ?? 0) > 0 ||
    (entity.debuffStacks ?? 0) > 0 ||
    (entity.markStacks ?? 0) > 0 ||
    entity.guard ||
    entity.riposte === true ||
    (entity.protection === true && entity.innateProtection !== true)
  );
}

/**
 * Fanatic I · Marked for Death：开战时全体存活英雄掷 d10，最低者（含并列）承受 Mark。
 * 骰序与 The Black Sheep 相同（姿态 aggressive→support）。无威胁时不改状态、不消耗 RNG。
 */
export function applyBossThreatMarkedForDeathOnBattleStart(state: GameState): ApplyResult {
  const battle = state.battle;
  const d = state.dungeon;
  if (!battle || !d) return { state, events: [] };
  const script = readActiveBossThreatScript(d);
  if (!script) return { state, events: [] };
  const markTurns = markTurnsOnBattleStartFromBossThreat(script);
  if (markTurns <= 0) return { state, events: [] };

  const order = battle.entities
    .filter((entity) => entity.side === "hero" && !entity.dead)
    .sort(
      (a, b) =>
        HAMLET_HERO_STANCES.indexOf(a.stance as (typeof HAMLET_HERO_STANCES)[number]) -
        HAMLET_HERO_STANCES.indexOf(b.stance as (typeof HAMLET_HERO_STANCES)[number]),
    );
  if (order.some((entity) => !entity.stance || HAMLET_HERO_STANCES.indexOf(entity.stance) < 0)) {
    return {
      state,
      events: [
        { type: "commandRefused", message: "Marked for Death 缺英雄姿态，不能猜掷骰顺序（R-048）" },
      ],
    };
  }

  let cursor = battle.rngCursor;
  const rolls = order.map((hero) => {
    const roll = nextBattleRoll(state.seed, cursor++);
    return { heroId: hero.id, roll };
  });
  const lowest = Math.min(...rolls.map((entry) => entry.roll));
  const losers = new Set(
    rolls.filter((entry) => entry.roll === lowest).map((entry) => entry.heroId),
  );

  let entities = battle.entities;
  const applied: string[] = [];
  for (const heroId of losers) {
    const entity = entities.find((entry) => entry.id === heroId)!;
    const defence = readHeroPassiveDefence(battle, entity);
    if (!defence) {
      return {
        state,
        events: [
          {
            type: "commandRefused",
            message: `Marked for Death：${heroId} 缺已核实条件防御，不能猜 Mark 抗性（R-048）`,
          },
        ],
      };
    }
    if (legacyStatusWithoutStacks(entity)) {
      return {
        state,
        events: [
          {
            type: "commandRefused",
            message: `Marked for Death：${heroId} 已有状态缺少 duration，不能伪造堆叠（R-048）`,
          },
        ],
      };
    }
    const added = addStatusStack(
      entity.statusStacks ?? [],
      { kind: "mark", duration: markTurns },
      "target",
      defence,
    );
    if (added.status === "refused") {
      return { state, events: [{ type: "commandRefused", message: added.reason }] };
    }
    const gained = added.stacks.length > (entity.statusStacks?.length ?? 0);
    const remaining = gained ? added.stacks[added.stacks.length - 1]!.remaining : 0;
    entities = entities.map((entry) =>
      entry.id === heroId
        ? {
            ...entry,
            statusStacks: added.stacks,
            ...statusProjection(added.stacks, entry.innateProtection),
          }
        : entry,
    );
    applied.push(gained ? `${heroId} Mark ${remaining}t` : `${heroId} Mark 免疫`);
  }

  const rollSummary = rolls.map((entry) => `${entry.heroId}:${entry.roll}`).join("、");
  return {
    state: {
      ...state,
      battle: { ...battle, entities, rngCursor: cursor },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `迫近威胁 · Marked for Death：d10 ${rollSummary}，最低 ${lowest}（${applied.join("、")}；${script.displayName}）`,
      },
    ],
  };
}

type SpawnGuardEntity = {
  readonly stanceSlots?: 1 | 2;
  readonly statusStacks?: readonly StatusStack[];
  readonly guard: boolean;
  readonly innateProtection?: boolean;
  readonly bleed: readonly string[];
  readonly blight: readonly string[];
};

/**
 * Flesh I · Big Troubles：遭遇生成写入战斗实体时，Large（占 2 格）获得 Guard。
 * 抗性 / 免疫按已确认图标缩短或取消（R-018）。非 Large 或无此威胁时原样返回。
 */
export function withLargeMonsterSpawnGuard<E extends SpawnGuardEntity>(
  dungeon: DungeonState | undefined,
  entity: E,
  card: {
    readonly resistances?: readonly StatusDefenceIcon[];
    readonly immunities?: readonly StatusDefenceIcon[];
  },
):
  | { readonly status: "ok"; readonly entity: E }
  | { readonly status: "refused"; readonly reason: string } {
  if (!dungeon || entity.stanceSlots !== 2) return { status: "ok", entity };
  const script = readActiveBossThreatScript(dungeon);
  if (!script) return { status: "ok", entity };
  const guardTurns = guardTurnsOnLargeMonsterSpawnFromBossThreat(script);
  if (guardTurns <= 0) return { status: "ok", entity };
  const resistances = confirmedStatusKinds(card.resistances);
  const immunities = confirmedStatusKinds(card.immunities);
  if (!resistances || !immunities) {
    return { status: "refused", reason: "Large 生成 Guard 缺已确认抗性 / 免疫，不能猜（R-048）" };
  }
  const added = addStatusStack(
    entity.statusStacks ?? [],
    { kind: "guard", duration: guardTurns },
    "target",
    { resistances, immunities },
  );
  if (added.status === "refused") return { status: "refused", reason: added.reason };
  if (added.stacks.length === (entity.statusStacks?.length ?? 0)) return { status: "ok", entity };
  return {
    status: "ok",
    entity: {
      ...entity,
      statusStacks: added.stacks,
      ...statusProjection(added.stacks, entity.innateProtection),
    },
  };
}
