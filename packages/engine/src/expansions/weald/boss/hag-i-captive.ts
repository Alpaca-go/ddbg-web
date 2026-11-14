import { rejectBattleCommand } from "../../../battle";
import type { ApplyResult, GameState, PendingChoice } from "../../../command";
import { resolveEncounterBossScriptId } from "../../../boss/encounter-rules";
import {
  HAG_I_SCRIPT_ID,
  HAG_I_COMBAT_MONSTER_CARD_ID,
  HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
  HAG_I_CAULDRON_FULL_MONSTER_CARD_ID,
} from "./hag-i";
import { buildHagICombatCatalog } from "./hag-i-projection";

const stances = ["aggressive", "defensive", "ranged", "support"] as const;

/** R-255 入锅命中效果的状态原语；选招、命中与 Self Pull 由技能入口先行完成。 */
export function captureHagIHero(state: GameState, heroId: string): ApplyResult {
  const b = state.battle;
  const hero = b?.entities.find((e) => e.id === heroId && e.side === "hero" && !e.dead);
  const pot = b?.entities.find(
    (e) => e.monsterCardId === HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID && !e.dead,
  );
  const turn = b?.encounter?.turn;
  if (
    !b ||
    !hero ||
    !pot ||
    b.hagCauldron ||
    b.pending ||
    resolveEncounterBossScriptId(state) !== HAG_I_SCRIPT_ID ||
    turn?.type !== "monster" ||
    !b.entities.some(
      (e) => e.id === turn.actorId && !e.dead && e.monsterCardId === HAG_I_COMBAT_MONSTER_CARD_ID,
    ) ||
    !Number.isSafeInteger(hero.life) ||
    hero.life! <= 0 ||
    hero.wounds > hero.life! ||
    !hero.stance ||
    stances.indexOf(hero.stance) < 0
  )
    return rejectBattleCommand(state, "R-255：入锅需要 Hag 回合、空锅与存活英雄，且无其它待选");
  const full = buildHagICombatCatalog().find((c) => c.id === HAG_I_CAULDRON_FULL_MONSTER_CARD_ID)!;
  const { areaId: _area, stance: _stance, ...captive } = hero;
  void _area;
  void _stance;
  const position = stances.indexOf(hero.stance);
  const deck = [...b.encounter!.deck];
  if (!b.encounter!.actedIds.includes(hero.id)) {
    const index = deck.indexOf("hero");
    if (index >= 0) deck.splice(index, 1);
  }
  return {
    state: {
      ...state,
      battle: {
        ...b,
        hagCauldron: { cauldronId: pot.id, hero: captive },
        entities: b.entities
          .filter((e) => e.id !== hero.id)
          .map((e) => {
            if (e.id === pot.id)
              return {
                ...e,
                monsterCardId: full.id,
                life: full.life,
                wounds: 0,
                dodge: full.dodge!,
                innateProtection: full.innateProtection!,
                protection: full.innateProtection!,
              };
            const at = e.stance ? stances.indexOf(e.stance) : -1;
            return e.side === "hero" && !e.dead && at > position
              ? { ...e, stance: stances[at - 1]! }
              : e;
          }),
        encounter: { ...b.encounter!, deck },
      },
    },
    events: [
      { type: "dungeonUpdated", message: `R-255：${hero.id} 离开板块入锅，后方英雄姿态前移` },
    ],
  };
}

/** 只列出已核实且有剩余容量的邻接区域；无合法区时拒绝，尚不开放正式入口。 */
export function hagIReleaseAreas(state: GameState): string[] {
  const b = state.battle;
  const pot = b?.entities.find((e) => e.id === b.hagCauldron?.cauldronId);
  if (!b || !pot) return [];
  const adjacent = b.areas.find((a) => a.id === pot.areaId)?.adjacent ?? [];
  return adjacent.filter((id) => {
    const area = b.areas.find((a) => a.id === id);
    if (!area || !Number.isSafeInteger(area.capacity) || area.capacity! <= 0) return false;
    const occupants = b.entities.filter((e) => !e.dead && e.areaId === id);
    if (occupants.some((e) => e.side === "monster" && !e.stanceSlots)) return false;
    return (
      occupants.reduce((n, e) => n + (e.side === "hero" ? 1 : e.stanceSlots!), 0) < area.capacity!
    );
  });
}

/** R-255 释放状态原语；多个合法邻区始终交给玩家，不消耗 RNG。 */
export function releaseHagIHero(state: GameState, areaId?: string): ApplyResult {
  const b = state.battle;
  const captive = b?.hagCauldron;
  const pot = b?.entities.find(
    (e) => e.id === captive?.cauldronId && e.monsterCardId === HAG_I_CAULDRON_FULL_MONSTER_CARD_ID,
  );
  if (
    !b ||
    !captive ||
    !pot ||
    !b.encounter ||
    resolveEncounterBossScriptId(state) !== HAG_I_SCRIPT_ID ||
    (b.pending && b.pending.type !== "hagRelease") ||
    b.entities.some((e) => e.id === captive.hero.id) ||
    captive.hero.dead
  )
    return rejectBattleCommand(state, "R-255：没有可释放的锅内英雄或释放上下文无效");
  const heroes = b.entities.filter((e) => e.side === "hero" && !e.dead);
  if (heroes.some((e) => !e.stance || stances.indexOf(e.stance) < 0 || e.stance === "support"))
    return rejectBattleCommand(state, "R-255：释放需要已核实且有后移空间的英雄姿态");
  const areas = hagIReleaseAreas(state);
  if (!areas.length)
    return rejectBattleCommand(state, "R-255：无已核实且有容量的邻接区域，释放尚不可交接");
  if (areaId === undefined) {
    if (b.pending?.type === "hagRelease")
      return { state, events: [], pendingChoice: b.pending.choice };
    const choice: PendingChoice = {
      id: `hag-release:${b.choiceCursor}`,
      prompt: "选择锅内英雄释放到的邻接区域",
      actorId: captive.hero.id,
      options: areas.map((id) => ({ id, label: `区域 ${id}` })),
    };
    return {
      state: {
        ...state,
        battle: { ...b, pending: { type: "hagRelease", choice }, choiceCursor: b.choiceCursor + 1 },
      },
      events: [],
      pendingChoice: choice,
    };
  }
  if (!areas.includes(areaId)) return rejectBattleCommand(state, "R-255：释放区域非合法邻接区域");
  const empty = buildHagICombatCatalog().find(
    (c) => c.id === HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
  )!;
  const { hagCauldron: _captive, ...rest } = b;
  void _captive;
  return {
    state: {
      ...state,
      battle: {
        ...rest,
        pending: null,
        entities: [
          ...b.entities.map((e) => {
            if (e.id === pot.id)
              return {
                ...e,
                monsterCardId: empty.id,
                life: empty.life,
                wounds: 0,
                dead: false,
                dodge: empty.dodge!,
                innateProtection: empty.innateProtection!,
                protection: empty.innateProtection!,
              };
            return e.side === "hero" && !e.dead
              ? { ...e, stance: stances[stances.indexOf(e.stance!) + 1]! }
              : e;
          }),
          { ...captive.hero, areaId, stance: "aggressive" },
        ],
        // 入锅时失去先攻；释放不凭空补牌，也不抢用其他英雄的剩余先攻。
        encounter: {
          ...b.encounter,
          actedIds: [...new Set([...b.encounter.actedIds, captive.hero.id])],
        },
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `R-255：${captive.hero.id} 释放到 ${areaId} 并进入 Aggressive，其余英雄姿态后移`,
      },
    ],
  };
}
