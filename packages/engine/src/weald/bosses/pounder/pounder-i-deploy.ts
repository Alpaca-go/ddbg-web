import type { ApplyResult, GameState } from "../../../shared/core/command";
import { createBattleState, rejectBattleCommand } from "../../../shared/battle/battle";
import { buildBossHeroEntities } from "../../../core/bosses/deploy-heroes";
import { resolveBossScriptIdForQuest } from "../../../core/bosses/quest-bridge";
import { getBossScript } from "../../../core/bosses/registry";
import { createLootState } from "../../../shared/trinkets/loot";
import {
  dungeonMonsterPoolCatalogValid,
  restingMonsterPoolValid,
} from "../../../shared/core/monster-pool-validation";
import { dungeonCurioCatalogValid } from "../../../shared/dungeon/dungeon-curio-catalog";
import { ensurePounderIBossScriptRegistered } from "./pounder-i";
import { pounderDeploymentContext } from "./pounder-deployment-context";
import { ensureCampaignBossScriptsRegistered } from "../../../shared/core/registry";
import { WEALD_POUNDER_I_CONTENT } from "./pounder-i-content";
import { isCampaignExpeditionMode } from "../../../shared/hamlet/campaign-expedition-mode";

/** R30／W4／R-258：Boss 房使用独立核准目录，不占普通房间牌堆。 */
export function preparePounderIObjectiveRoom(state: GameState): ApplyResult {
  return preparePounderObjectiveRoom(state, 1);
}
export function preparePounderHigherObjectiveRoom(state: GameState): ApplyResult {
  const level = state.dungeon?.campaignLevel;
  if ((level !== 2 && level !== 3) || !state.dungeon?.wealdHigherBosses)
    return rejectBattleCommand(state, "R-268：高等级Pounder需要显式版本与II／III级");
  return preparePounderObjectiveRoom(state, level);
}
function preparePounderObjectiveRoom(state: GameState, level: 1 | 2 | 3): ApplyResult {
  const binding = pounderDeploymentContext(level);
  const d = state.dungeon;
  const room = d?.rooms.find((r) => r.id === d.position);
  const plan = d?.faceTheThreatEmbarkPlan;
  if (d?.pounderDungeonThreats && d.pounderHamletThreats && d.contentPacks?.includes("weald"))
    ensurePounderIBossScriptRegistered();
  if (level !== 1 && d?.contentPacks) ensureCampaignBossScriptsRegistered(d.contentPacks);
  const entry = getBossScript(binding.scriptId)?.combatEntry;
  if (
    !d ||
    state.battle ||
    d.phase !== "awaitingRoom" ||
    d.pending ||
    !d.contentPacks?.includes("weald") ||
    !d.pounderDungeonThreats ||
    !d.pounderHamletThreats ||
    !d.bossLocationSources ||
    d.bossExpeditionRegion !== "weald" ||
    !dungeonMonsterPoolCatalogValid(d) ||
    !restingMonsterPoolValid(d) ||
    !dungeonCurioCatalogValid(d) ||
    !isCampaignExpeditionMode(d.mode) ||
    d.campaignLevel !== level ||
    d.activeBossThreatScriptId !== binding.scriptId ||
    d.imminentThreatDescriptionCardId !== binding.description ||
    room?.kind !== "objective" ||
    !room.revealed ||
    room.cleared ||
    d.mustLeaveRoomId === d.position ||
    !d.roomCards ||
    d.roomCards.active ||
    d.questDistribution?.questId !== "quest:p019" ||
    plan?.questId !== "quest:p019" ||
    plan.roomPlacement !== "edgeRoomsR30" ||
    plan.resolvedScriptId !== binding.scriptId ||
    resolveBossScriptIdForQuest("quest:p019", d) !== binding.scriptId ||
    !entry ||
    (Object.keys(entry) as (keyof typeof entry)[]).some(
      (key) => entry[key] !== plan.combatEntry[key],
    )
  )
    return rejectBattleCommand(
      state,
      "R-258：需要 Weald I 级 Pounder 实际威胁、出征计划和未清目标房",
    );
  const message =
    level === 1
      ? "Pounder 专属房已绑定；下一步 deployPounderI，保留普通房间牌堆（W4／R-258）"
      : "Pounder高等级房已绑定；下一步deployPounderHigher（R-268）";
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        roomCards: {
          ...d.roomCards,
          active: {
            roomId: room.id,
            cardId: WEALD_POUNDER_I_CONTENT.tile.roomId,
            blockedReason: message,
          },
        },
      },
    },
    events: [{ type: "dungeonUpdated", message }],
  };
}

/** 只部署核准 I 级，保留显式 startBattle 先攻步骤；高等级／Stygian 随后接。 */
export function deployPounderI(state: GameState): ApplyResult {
  return deployPounder(state, 1);
}
export function deployPounderHigher(state: GameState): ApplyResult {
  const level = state.dungeon?.campaignLevel;
  if ((level !== 2 && level !== 3) || !state.dungeon?.wealdHigherBosses)
    return rejectBattleCommand(state, "R-268：高等级Pounder需要显式版本与II／III级");
  return deployPounder(state, level);
}
function deployPounder(state: GameState, level: 1 | 2 | 3): ApplyResult {
  const binding = pounderDeploymentContext(level);
  const d = state.dungeon;
  const active = d?.roomCards?.active;
  const room = d?.rooms.find((r) => r.id === d.position);
  const tile = WEALD_POUNDER_I_CONTENT.tile;
  const refuse = (message: string) => rejectBattleCommand(state, message);
  if (
    !d ||
    state.battle ||
    d.phase !== "awaitingRoom" ||
    d.pending ||
    !isCampaignExpeditionMode(d.mode) ||
    d.campaignLevel !== level ||
    !d.battleCatalog ||
    !d.explorationSetup ||
    d.explorationSetup.dungeonLevel !== level ||
    d.monsterPool?.active ||
    active?.cardId !== tile.roomId ||
    active.tileId !== undefined ||
    active.roomId !== d.position ||
    room?.kind !== "objective" ||
    !room.revealed ||
    room.cleared ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0 ||
    !Number.isSafeInteger(d.decision) ||
    d.decision < 0 ||
    d.heroes.length !== 4 ||
    (level === 1 && d.heroes.some((h) => h.level !== 1)) ||
    new Set(d.heroes.map((h) => h.id)).size !== 4 ||
    new Set(d.heroes.map((h) => h.stance)).size !== 4
  )
    return refuse("R-258：需要核准 Pounder I 目标房、四英雄与有效地牢上下文");
  // 用同一入口复核实际威胁和计划；不修改输入，也不再次绑定房间。
  const probe = preparePounderObjectiveRoom(
    {
      ...state,
      dungeon: { ...d, roomCards: { ...d.roomCards!, active: null } },
    },
    level,
  );
  if (probe.events.some((e) => e.type === "commandRefused"))
    return refuse("R-258：Pounder I 威胁或出征计划不一致");
  const heroes = buildBossHeroEntities(state, refuse, tile.deployment.heroes, "Pounder I");
  if (!Array.isArray(heroes)) return heroes;
  const deployment = binding.deployment;
  try {
    const battle = createBattleState(state.seed, {
      ...deployment,
      roomName: "Pounder",
      entities: [...heroes, ...deployment.entities],
      heroStats: d.battleCatalog.heroStats,
      skills: d.battleCatalog.skills,
      light: d.explorationSetup.light,
      provisions: d.explorationSetup.provisions,
      resolveCards: d.resolveCards,
      ...(d.conditions ? { conditions: d.conditions } : {}),
      ...(d.trinkets ? { trinkets: d.trinkets } : {}),
      lootPool: { ...(d.lootPool ?? createLootState()), gold: d.gold },
      provisionWindows: true,
    }).battle!;
    const message =
      level === 1
        ? "Pounder I 已按 W4／R-258 部署；等待 startBattle 洗先攻"
        : `Pounder ${level === 2 ? "II" : "III"}已部署；等待startBattle（R-268）`;
    return {
      state: {
        ...state,
        dungeon: {
          ...d,
          phase: "inBattle",
          roomCards: {
            ...d.roomCards!,
            active: { ...active, tileId: tile.id, blockedReason: message },
          },
        },
        battle: {
          ...battle,
          rngCursor: d.cursor,
          choiceCursor: d.decision,
          resolveDecks: d.resolveDecks,
        },
      },
      events: [{ type: "dungeonUpdated", message }],
    };
  } catch (error) {
    return refuse(`Pounder I 部署无效：${error instanceof Error ? error.message : String(error)}`);
  }
}
