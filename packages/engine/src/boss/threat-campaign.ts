import type { GameState } from "../command";
import type { DungeonState } from "../dungeon";
import type { HamletEventState } from "../hamlet-event";
import { combatCardIdForPoolInstance } from "../monster-pool-runtime";
import { readBossCombatEntry } from "./combat-entry";
import { ensureCoreBossScriptsRegistered } from "./necromancer-i";
import { getBossScript } from "./registry";
import {
  cardIdsPermanentlyRemovedAfterBattle,
  hamletBuildingsBlockedByBossThreat,
} from "./threat-passive";
import type { BossScriptId } from "./types";

/** 村庄侧威胁可能封锁的建筑（当前核心盒核实项；新 Boss 落地后扩展）。 */
const KNOWN_BOSS_THREAT_BLOCKED_BUILDINGS = ["graveyard"] as const;

export function readActiveBossThreatScriptId(d: DungeonState): BossScriptId | undefined {
  return d.activeBossThreatScriptId;
}

export function bossThreatHamletBlockedBuildings(d: DungeonState): readonly string[] {
  ensureCoreBossScriptsRegistered();
  const scriptId = readActiveBossThreatScriptId(d);
  if (!scriptId) return [];
  return hamletBuildingsBlockedByBossThreat(scriptId, getBossScript(scriptId));
}

function stripKnownBossThreatBlocks(blocked: readonly string[]): readonly string[] {
  return blocked.filter(
    (building) =>
      !KNOWN_BOSS_THREAT_BLOCKED_BUILDINGS.includes(
        building as (typeof KNOWN_BOSS_THREAT_BLOCKED_BUILDINGS)[number],
      ),
  );
}

/** 在现有看守人 / 周封锁之上合并当前 Boss 威胁封锁。 */
export function syncHamletBlockedBuildingsForBossThreat(
  d: DungeonState,
  hamlet: HamletEventState,
): HamletEventState {
  const threat = bossThreatHamletBlockedBuildings(d);
  const base = stripKnownBossThreatBlocks(hamlet.blockedBuildings);
  return {
    ...hamlet,
    blockedBuildings: [...new Set([...base, ...threat])],
  };
}

export function mergeHamletCaretakerBlockedWithBossThreat(
  d: DungeonState,
  caretakerBlocked: readonly string[],
): readonly string[] {
  return [
    ...new Set([
      ...caretakerBlocked,
      ...(d.hamlet?.weekBlockedBuildings ?? []),
      ...bossThreatHamletBlockedBuildings(d),
    ]),
  ];
}

export type BossThreatPoolPatch = {
  readonly pool: NonNullable<DungeonState["monsterPool"]>;
  readonly instanceIds: readonly string[];
  readonly removedCombatCardIds: readonly string[];
};

/** 战斗交接后应用地牢侧威胁：永久移出本场非 Unholy 怪物（规则书 §2.3 R11）。 */
export function applyBossThreatAfterBattleToPool(
  d: DungeonState,
  pool: NonNullable<DungeonState["monsterPool"]>,
  activeMonsters: readonly { readonly cardId: string }[],
  instanceIdsToShuffle: readonly string[],
): BossThreatPoolPatch {
  const scriptId = readActiveBossThreatScriptId(d);
  if (!scriptId || !d.battleCatalog) {
    return { pool, instanceIds: instanceIdsToShuffle, removedCombatCardIds: [] };
  }
  ensureCoreBossScriptsRegistered();
  const script = getBossScript(scriptId);
  if (!script) return { pool, instanceIds: instanceIdsToShuffle, removedCombatCardIds: [] };

  const battleMonsters = activeMonsters.map((spawn) => {
    const view = d.battleCatalog!.monsters.find((monster) => monster.id === spawn.cardId);
    return {
      cardId: spawn.cardId,
      typeTags: view?.type_position_tags ?? [],
    };
  });
  const removedCombatCardIds = cardIdsPermanentlyRemovedAfterBattle(script, battleMonsters);
  if (!removedCombatCardIds.length) {
    return { pool, instanceIds: instanceIdsToShuffle, removedCombatCardIds: [] };
  }

  const permanent = new Set([
    ...(pool.permanentlyRemovedCombatCardIds ?? []),
    ...removedCombatCardIds,
  ]);
  const filteredIds = instanceIdsToShuffle.filter((instanceId) => {
    const combatId = combatCardIdForPoolInstance(pool, instanceId);
    return combatId !== undefined && !permanent.has(combatId);
  });
  return {
    pool: { ...pool, permanentlyRemovedCombatCardIds: [...permanent] },
    instanceIds: filteredIds,
    removedCombatCardIds,
  };
}

/**
 * Boss 被击败后清除迫近威胁（spec §2.3：威胁在 Boss 被击败前持续生效）。
 * 升幕抽下一张威胁、Face the Threat 完整流程仍 hold。
 */
export function clearedBossThreatScriptIdAfterVictory(state: GameState): BossScriptId | undefined {
  const d = state.dungeon;
  const scriptId = d?.activeBossThreatScriptId;
  const battle = state.battle;
  if (!d || !scriptId || !battle) return undefined;
  ensureCoreBossScriptsRegistered();
  const bossCardId = readBossCombatEntry(getBossScript(scriptId))?.combatMonsterCardId;
  if (!bossCardId) return undefined;
  const turn = battle.encounter?.turn;
  if (turn?.type !== "finished" || turn.outcome !== "victory") return undefined;
  const bossEntities = battle.entities.filter(
    (entity) => entity.side === "monster" && entity.monsterCardId === bossCardId,
  );
  if (!bossEntities.length) return undefined;
  if (!bossEntities.every((entity) => entity.dead)) return undefined;
  return scriptId;
}

/** 待确认：非 Boss 战胜利 / 任务卡定义的其它清除威胁入口（定威胁、升幕抽牌）。 */
export function bossThreatClearHoldReason(): string {
  return "定威胁 / 升幕 Imminent Threat / faceTheThreatEmbark 未接线；仅 Boss 战胜利且本场含对应战斗卡时清除 activeBossThreatScriptId";
}
