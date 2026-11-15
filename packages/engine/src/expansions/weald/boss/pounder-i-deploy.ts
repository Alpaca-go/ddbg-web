import type { ApplyResult, GameState } from "../../../command";
import { createBattleState, rejectBattleCommand } from "../../../battle";
import { buildBossHeroEntities } from "../../../boss/deploy-heroes";
import { resolveBossScriptIdForQuest } from "../../../boss/quest-bridge";
import { getBossScript } from "../../../boss/registry";
import { createLootState } from "../../../loot";
import {
  dungeonMonsterPoolCatalogValid,
  restingMonsterPoolValid,
} from "../../../monster-pool-validation";
import { dungeonCurioCatalogValid } from "../../../dungeon-curio-catalog";
import { ensurePounderIBossScriptRegistered, POUNDER_I_SCRIPT_ID } from "./pounder-i";
import { pounderIInitialDeployment } from "./pounder-i-projection";
import { WEALD_POUNDER_I_CONTENT } from "./pounder-i-content";

/** R30／W4／R-258：Boss 房使用独立核准目录，不占普通房间牌堆。 */
export function preparePounderIObjectiveRoom(state: GameState): ApplyResult {
  const d = state.dungeon;
  const room = d?.rooms.find((r) => r.id === d.position);
  const plan = d?.faceTheThreatEmbarkPlan;
  if (d?.pounderDungeonThreats && d.pounderHamletThreats && d.contentPacks?.includes("weald"))
    ensurePounderIBossScriptRegistered();
  const entry = getBossScript(POUNDER_I_SCRIPT_ID)?.combatEntry;
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
    !["standard", "radiant"].includes(d.mode) ||
    d.campaignLevel !== 1 ||
    d.activeBossThreatScriptId !== POUNDER_I_SCRIPT_ID ||
    d.imminentThreatDescriptionCardId !== WEALD_POUNDER_I_CONTENT.abilities.descriptionCardId ||
    room?.kind !== "objective" ||
    !room.revealed ||
    room.cleared ||
    d.mustLeaveRoomId === d.position ||
    !d.roomCards ||
    d.roomCards.active ||
    d.questDistribution?.questId !== "quest:p019" ||
    plan?.questId !== "quest:p019" ||
    plan.roomPlacement !== "edgeRoomsR30" ||
    plan.resolvedScriptId !== POUNDER_I_SCRIPT_ID ||
    resolveBossScriptIdForQuest("quest:p019", d) !== POUNDER_I_SCRIPT_ID ||
    !entry ||
    (Object.keys(entry) as (keyof typeof entry)[]).some(
      (key) => entry[key] !== plan.combatEntry[key],
    )
  )
    return rejectBattleCommand(
      state,
      "R-258：需要 Weald I 级 Pounder 实际威胁、出征计划和未清目标房",
    );
  const message = "Pounder 专属房已绑定；下一步 deployPounderI，保留普通房间牌堆（W4／R-258）";
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
    return refuse("R-258：需要核准 Pounder I 目标房、四英雄与有效地牢上下文");
  // 用同一入口复核实际威胁和计划；不修改输入，也不再次绑定房间。
  const probe = preparePounderIObjectiveRoom({
    ...state,
    dungeon: { ...d, roomCards: { ...d.roomCards!, active: null } },
  });
  if (probe.events.some((e) => e.type === "commandRefused"))
    return refuse("R-258：Pounder I 威胁或出征计划不一致");
  const heroes = buildBossHeroEntities(state, refuse, tile.deployment.heroes, "Pounder I");
  if (!Array.isArray(heroes)) return heroes;
  const deployment = pounderIInitialDeployment();
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
    const message = "Pounder I 已按 W4／R-258 部署；等待 startBattle 洗先攻";
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
