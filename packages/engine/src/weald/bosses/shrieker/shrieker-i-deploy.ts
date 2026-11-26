import { shriekerDeploymentContext } from "./shrieker-deployment-context";
import { ensureCampaignBossScriptsRegistered } from "../../../shared/core/registry";
import { resolveBossScriptIdForQuest } from "../../../core/bosses/quest-bridge";
export { SHRIEKER_I_SCRIPT_ID, SHRIEKER_I_DEPLOYMENT_ENTRY } from "./shrieker-i-content";
import { buildShriekerICombatCatalog } from "./shrieker-i-projection";
import type { ApplyResult, GameState } from "../../../shared/core/command";
import { createBattleState, rejectBattleCommand } from "../../../shared/battle/battle";
import { buildBossHeroEntities } from "../../../core/bosses/deploy-heroes";

import { createLootState } from "../../../shared/trinkets/loot";
import {
  dungeonMonsterPoolCatalogValid,
  restingMonsterPoolValid,
} from "../../../shared/core/monster-pool-validation";
import { dungeonCurioCatalogValid } from "../../../shared/dungeon/dungeon-curio-catalog";

import { WEALD_SHRIEKER_I_CONTENT } from "./shrieker-i-content";
import { isCampaignExpeditionMode } from "../../../shared/hamlet/campaign-expedition-mode";

/** R30／W3／R-261：Boss 房使用独立核准目录，不占普通房间牌堆。 */
export function prepareShriekerIObjectiveRoom(state: GameState): ApplyResult {
  return prepareShriekerObjectiveRoom(state, 1);
}
export function prepareShriekerHigherObjectiveRoom(state: GameState): ApplyResult {
  const l = state.dungeon?.campaignLevel;
  if ((l !== 2 && l !== 3) || !state.dungeon?.wealdHigherBosses)
    return rejectBattleCommand(state, "Shrieker II／III 需要显式版本");
  return prepareShriekerObjectiveRoom(state, l);
}
function prepareShriekerObjectiveRoom(state: GameState, level: 1 | 2 | 3): ApplyResult {
  const binding = shriekerDeploymentContext(level);
  if (level !== 1 && state.dungeon?.contentPacks)
    ensureCampaignBossScriptsRegistered(state.dungeon.contentPacks);
  const d = state.dungeon;
  const room = d?.rooms.find((r) => r.id === d.position);
  const plan = d?.faceTheThreatEmbarkPlan;
  const entry = binding.entry;
  if (
    !d ||
    state.battle ||
    d.phase !== "awaitingRoom" ||
    d.pending ||
    !d.contentPacks?.includes("weald") ||
    !d.bossLocationSources ||
    d.bossExpeditionRegion !== "weald" ||
    !dungeonMonsterPoolCatalogValid(d) ||
    !restingMonsterPoolValid(d) ||
    !dungeonCurioCatalogValid(d) ||
    !isCampaignExpeditionMode(d.mode) ||
    d.campaignLevel !== level ||
    (level !== 1 && !d.shriekerBossBattles) ||
    d.activeBossThreatScriptId !== binding.scriptId ||
    d.imminentThreatDescriptionCardId !== binding.abilities.descriptionCardId ||
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
    (level !== 1 && resolveBossScriptIdForQuest("quest:p019", d) !== binding.scriptId) ||
    (Object.keys(entry) as (keyof typeof entry)[]).some(
      (key) => entry[key] !== plan.combatEntry[key],
    )
  )
    return rejectBattleCommand(
      state,
      "R-261：需要 Weald I 级 Shrieker 实际威胁、出征计划和未清目标房",
    );
  const message =
    level === 1
      ? "Shrieker 专属房已绑定；下一步 deployShriekerI，保留普通房间牌堆（W3／R-261）"
      : "Shrieker 高等级专属房已绑定，等待部署（W3／R-268）";
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        roomCards: {
          ...d.roomCards,
          active: {
            roomId: room.id,
            cardId: WEALD_SHRIEKER_I_CONTENT.tile.roomId,
            blockedReason: message,
          },
        },
      },
    },
    events: [{ type: "dungeonUpdated", message }],
  };
}

/** 只部署核准 I 级，保留开战停点；Stygian 沿用标准 Boss 房（R-036）。 */
export function deployShriekerI(
  state: GameState,
  options: { readonly shriekerSkills?: true | undefined } = {},
): ApplyResult {
  return deployShrieker(state, 1, options);
}
export function deployShriekerHigher(state: GameState): ApplyResult {
  const l = state.dungeon?.campaignLevel;
  if ((l !== 2 && l !== 3) || !state.dungeon?.wealdHigherBosses)
    return rejectBattleCommand(state, "Shrieker II／III 需要显式版本");
  return deployShrieker(state, l, {});
}
function deployShrieker(
  state: GameState,
  level: 1 | 2 | 3,
  options: { readonly shriekerSkills?: true | undefined },
): ApplyResult {
  const binding = shriekerDeploymentContext(level);
  const d = state.dungeon;
  const active = d?.roomCards?.active;
  const room = d?.rooms.find((r) => r.id === d.position);
  const tile = WEALD_SHRIEKER_I_CONTENT.tile;
  const refuse = (message: string) => rejectBattleCommand(state, message);
  if (
    !d ||
    state.battle ||
    d.phase !== "awaitingRoom" ||
    d.pending ||
    !isCampaignExpeditionMode(d.mode) ||
    d.campaignLevel !== level ||
    (level !== 1 && !d.shriekerBossBattles) ||
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
    return refuse("R-261：需要核准 Shrieker I 目标房、四英雄与有效地牢上下文");
  // 用同一入口复核实际威胁和计划；不修改输入，也不再次绑定房间。
  const probe = prepareShriekerObjectiveRoom(
    {
      ...state,
      dungeon: { ...d, roomCards: { ...d.roomCards!, active: null } },
    },
    level,
  );
  if (probe.events.some((e) => e.type === "commandRefused"))
    return refuse("R-261：Shrieker I 威胁或出征计划不一致");
  const heroes = buildBossHeroEntities(state, refuse, tile.deployment.heroes, "Shrieker I");
  if (!Array.isArray(heroes)) return heroes;
  const deployment = binding.deployment;
  try {
    const battle = createBattleState(state.seed, {
      ...deployment,
      monsters:
        level !== 1
          ? binding.catalog(true)
          : options.shriekerSkills || d.shriekerBossBattles
            ? buildShriekerICombatCatalog({
                nestInPlay: true,
                ...(d.shriekerBossBattles ? { nestFlightApproved: true as const } : {}),
              })
            : WEALD_SHRIEKER_I_CONTENT.faces.map((face) => ({
                id: face.rawId,
                life: face.life,
                speed: face.speed,
                dodge: face.dodge,
                verification: { unverified: true },
                skills: [],
              })),
      roomName: "Shrieker",
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
      level !== 1
        ? `Shrieker ${level === 2 ? "II" : "III"} 已部署，等待开始战斗（W3／R-268）`
        : d.shriekerBossBattles
          ? "Shrieker I 已部署，等待开始战斗（W3／R-261／R-262）"
          : "Shrieker I 已按 W3／R-261 部署；技能与威胁未完成，停在开战前";
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
          ...(!d.shriekerBossBattles ? { shriekerISetupHold: true as const } : {}),
          rngCursor: d.cursor,
          choiceCursor: d.decision,
          resolveDecks: d.resolveDecks,
        },
      },
      events: [{ type: "dungeonUpdated", message }],
    };
  } catch (error) {
    return refuse(`Shrieker I 部署无效：${error instanceof Error ? error.message : String(error)}`);
  }
}
