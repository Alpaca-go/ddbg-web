import { SHRIEKER_I_SCRIPT_ID, SHRIEKER_I_DEPLOYMENT_ENTRY } from "./shrieker-i-content";
export { SHRIEKER_I_SCRIPT_ID, SHRIEKER_I_DEPLOYMENT_ENTRY } from "./shrieker-i-content";
import { buildShriekerICombatCatalog } from "./shrieker-i-projection";
import type { ApplyResult, GameState } from "../../../command";
import { createBattleState, rejectBattleCommand } from "../../../battle";
import { buildBossHeroEntities } from "../../../boss/deploy-heroes";

import { createLootState } from "../../../loot";
import {
  dungeonMonsterPoolCatalogValid,
  restingMonsterPoolValid,
} from "../../../monster-pool-validation";
import { dungeonCurioCatalogValid } from "../../../dungeon-curio-catalog";

import { shriekerIInitialDeployment } from "./shrieker-i-deployment";
import { WEALD_SHRIEKER_I_CONTENT } from "./shrieker-i-content";

/** R30／W3／R-261：Boss 房使用独立核准目录，不占普通房间牌堆。 */
export function prepareShriekerIObjectiveRoom(state: GameState): ApplyResult {
  const d = state.dungeon;
  const room = d?.rooms.find((r) => r.id === d.position);
  const plan = d?.faceTheThreatEmbarkPlan;
  const entry = SHRIEKER_I_DEPLOYMENT_ENTRY;
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
    !["standard", "radiant"].includes(d.mode) ||
    d.campaignLevel !== 1 ||
    d.activeBossThreatScriptId !== SHRIEKER_I_SCRIPT_ID ||
    d.imminentThreatDescriptionCardId !== WEALD_SHRIEKER_I_CONTENT.abilities.descriptionCardId ||
    room?.kind !== "objective" ||
    !room.revealed ||
    room.cleared ||
    d.mustLeaveRoomId === d.position ||
    !d.roomCards ||
    d.roomCards.active ||
    d.questDistribution?.questId !== "quest:p019" ||
    plan?.questId !== "quest:p019" ||
    plan.roomPlacement !== "edgeRoomsR30" ||
    plan.resolvedScriptId !== SHRIEKER_I_SCRIPT_ID ||
    (Object.keys(entry) as (keyof typeof entry)[]).some(
      (key) => entry[key] !== plan.combatEntry[key],
    )
  )
    return rejectBattleCommand(
      state,
      "R-261：需要 Weald I 级 Shrieker 实际威胁、出征计划和未清目标房",
    );
  const message = "Shrieker 专属房已绑定；下一步 deployShriekerI，保留普通房间牌堆（W3／R-261）";
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

/** 只部署核准 I 级，保留开战停点；高等级／Stygian 随后接。 */
export function deployShriekerI(
  state: GameState,
  options: { readonly shriekerSkills?: true | undefined } = {},
): ApplyResult {
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
    !["standard", "radiant"].includes(d.mode) ||
    d.campaignLevel !== 1 ||
    !d.battleCatalog ||
    !d.explorationSetup ||
    d.explorationSetup.dungeonLevel !== 1 ||
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
    d.heroes.some((h) => h.level !== 1) ||
    new Set(d.heroes.map((h) => h.id)).size !== 4 ||
    new Set(d.heroes.map((h) => h.stance)).size !== 4
  )
    return refuse("R-261：需要核准 Shrieker I 目标房、四英雄与有效地牢上下文");
  // 用同一入口复核实际威胁和计划；不修改输入，也不再次绑定房间。
  const probe = prepareShriekerIObjectiveRoom({
    ...state,
    dungeon: { ...d, roomCards: { ...d.roomCards!, active: null } },
  });
  if (probe.events.some((e) => e.type === "commandRefused"))
    return refuse("R-261：Shrieker I 威胁或出征计划不一致");
  const heroes = buildBossHeroEntities(state, refuse, tile.deployment.heroes, "Shrieker I");
  if (!Array.isArray(heroes)) return heroes;
  const deployment = shriekerIInitialDeployment();
  try {
    const battle = createBattleState(state.seed, {
      ...deployment,
      monsters:
        options.shriekerSkills || d.shriekerBossBattles
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
    const message = d.shriekerBossBattles
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
