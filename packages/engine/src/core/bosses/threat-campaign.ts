import type { GameState } from "../../command";
import type { DungeonState } from "../../dungeon";
import type { HamletEventState } from "../../hamlet-event";
import { combatCardIdForPoolInstance } from "../../monster-pool-runtime";
import { readExpeditionRoomRegion } from "../../expedition-room-catalog";
import { readBossCombatEntry } from "./combat-entry";
import { ensureCampaignBossScriptsRegistered } from "../../registry";
import { bossEnabledForPacks } from "../../../../data/src/content-packs";
import { getBossScript } from "./registry";
import {
  cardIdsPermanentlyRemovedAfterBattle,
  hamletBuildingsBlockedByBossThreat,
} from "./threat-passive";
import type { BossScriptId } from "./types";

const KNOWN_BOSS_THREAT_BLOCKED_BUILDINGS = [
  "graveyard",
  "survivalist",
  "nomadWagon",
  "abbey",
] as const;

export function readActiveBossThreatScriptId(d: DungeonState): BossScriptId | undefined {
  const id = d.activeBossThreatScriptId;
  return id && bossEnabledForPacks(d.contentPacks, id) ? id : undefined;
}

/** R30：威胁面生效身份；与保留作胜利清场的 Boss 身份分开。 */
export function readEffectiveBossThreatScriptId(d: DungeonState): BossScriptId | undefined {
  return d.activeBossThreatScriptId === d.bossCombatThreatCeased
    ? undefined
    : readActiveBossThreatScriptId(d);
}

/** R-273：Boss 脚本身份自带地点；未知地点不套用跨地点判断。 */
export function bossScriptLocation(scriptId: BossScriptId): "ruins" | "weald" | undefined {
  if (scriptId.startsWith("boss:weald:")) return "weald";
  if (scriptId.startsWith("boss:ruins:")) return "ruins";
  return undefined;
}

/**
 * R-273（Kyries 2026-11-18）：地牢侧威胁能力只在 Boss 所属地点的地牢生效。
 * 跨地点任务不应用该 Boss 的地牢侧能力；村庄侧能力不受影响。
 * 尚未接入地点制的旧脚本（如 Warrens／Cove 试验）保持原行为。
 */
export function activeBossThreatMatchesDungeonLocation(d: DungeonState): boolean {
  const scriptId = readEffectiveBossThreatScriptId(d);
  if (!scriptId) return false;
  const location = bossScriptLocation(scriptId);
  if (!location) return true;
  const dungeonLocation =
    d.bossExpeditionRegion === "weald" ? "weald" : readExpeditionRoomRegion(d);
  return location === dungeonLocation;
}

export function bossThreatHamletBlockedBuildings(d: DungeonState): readonly string[] {
  ensureCampaignBossScriptsRegistered(d.contentPacks);
  const scriptId = readEffectiveBossThreatScriptId(d);
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
  const withCaretaker = hamlet.caretaker ? [...new Set([...base, hamlet.caretaker])] : base;
  return {
    ...hamlet,
    blockedBuildings: [...new Set([...withCaretaker, ...threat])],
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
  const scriptId = activeBossThreatMatchesDungeonLocation(d)
    ? readActiveBossThreatScriptId(d)
    : undefined;
  if (!scriptId || !d.battleCatalog) {
    return { pool, instanceIds: instanceIdsToShuffle, removedCombatCardIds: [] };
  }
  ensureCampaignBossScriptsRegistered(d.contentPacks);
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
 * 升幕抽下一张威胁、Face the Threat 出征由 `drawImminentThreatAfterActAdvance` / `chooseNextQuest` 接管；边缘房与 R-121 布局已接线。
 */
export function clearedBossThreatScriptIdAfterVictory(state: GameState): BossScriptId | undefined {
  const d = state.dungeon;
  const scriptId = d ? readActiveBossThreatScriptId(d) : undefined;
  const battle = state.battle;
  if (!d || !scriptId || !battle) return undefined;
  ensureCampaignBossScriptsRegistered(d.contentPacks);
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

/** 清除威胁后未自动抽下一张时的事件说明（升幕 §2.2 其余步骤见对应命令）。 */
export function bossThreatClearHoldReason(): string {
  return "升幕抽下一张迫近威胁请用 drawImminentThreatAfterActAdvance；Face the Threat 出征见 chooseNextQuest / faceTheThreatEmbarkPlan；边缘房与 R-121 布局已接线";
}
