import type { ApplyResult, GameState } from "../command";
import { rejectBattleCommand } from "../battle";
const realBossDefinitions = {
  necromancer: {
    script: "boss:ruins:necromancer:1",
    card: "monster_medium:p089",
    description: "boss_ability:p001",
    room: "room:p010",
    tile: "room_tile:p006:back",
    entity: "boss:necromancer:1",
    label: "Necromancer I",
    ruling: "R-172",
  },
  prophet: {
    script: "boss:ruins:prophet:1",
    card: "monster_large:p005",
    description: "boss_ability:p007",
    room: "room:p011",
    tile: "room_tile:p006:front",
    entity: "boss:prophet:1",
    label: "Prophet I",
    ruling: "R-173",
  },
  collector: {
    script: "boss:ruins:collector:1",
    card: "monster_medium:p092",
    description: "boss_ability:p013",
    room: "room:p012",
    tile: "room_tile:p007:back",
    entity: "boss:collector:1",
    label: "Collector I",
    ruling: "R-175",
  },
} as const;
type Identity = keyof typeof realBossDefinitions;
import { clearedBossThreatScriptIdAfterVictory } from "./threat-campaign";
import { recordRuinsBossDefeatOnThreatCleared } from "./establish-imminent-threat";

/** 仅识别有专用部署的遗迹 I 级 Boss 房。 */
export function ruinsIRealCombatActive(state: GameState, identity: Identity): boolean {
  const boss = realBossDefinitions[identity];
  return (
    state.battle !== undefined &&
    state.dungeon?.phase === "inBattle" &&
    state.dungeon.roomCards?.active?.cardId === boss.room &&
    state.dungeon.roomCards.active.tileId === boss.tile
  );
}

/** R-044/R30/R38：Boss胜负交接不借用普通怪物牌池，也不重洗九张普通房间牌。 */
export function finishRuinsIBattle(state: GameState, identity: Identity): ApplyResult {
  const boss = realBossDefinitions[identity];
  const d = state.dungeon;
  const b = state.battle;
  const active = d?.roomCards?.active;
  const room = d?.rooms.find((r) => r.id === d.position);
  const plan = d?.faceTheThreatEmbarkPlan;
  const turn = b?.encounter?.turn;
  const loot = b?.loot ?? b?.lootPool;
  const wipedOut = turn?.type === "halted" && turn.reason === "heroesDefeated";
  const refuse = (message: string) => rejectBattleCommand(state, message);
  if (
    !d ||
    !b ||
    !ruinsIRealCombatActive(state, identity) ||
    d.campaignLevel !== 1 ||
    d.questDistribution?.questId !== "quest:p019" ||
    d.activeBossThreatScriptId !== boss.script ||
    d.bossCombatThreatCeased !== boss.script ||
    d.imminentThreatDescriptionCardId !== boss.description ||
    plan?.resolvedScriptId !== boss.script ||
    plan.roomPlacement !== "edgeRoomsR30" ||
    plan.combatEntry.combatMonsterCardId !== boss.card ||
    active?.roomId !== d.position ||
    room?.kind !== "objective" ||
    room.cleared ||
    !room.revealed ||
    d.monsterPool?.active ||
    !d.explorationSetup ||
    d.explorationSetup.dungeonLevel !== 1 ||
    (!wipedOut && (turn?.type !== "finished" || turn.outcome !== "victory")) ||
    d.pending ||
    b.pending ||
    state.trinketChoice ||
    b.shuffleIntents.length ||
    b.shuffleContinuation ||
    !loot ||
    loot.placed.length ||
    !Number.isSafeInteger(loot.gold) ||
    loot.gold < 0
  )
    return refuse(
      `需要${boss.ruling}真实部署的${boss.label}胜利或英雄全灭、无待选及未处置战利品（R-044/R30/R38）`,
    );
  const bosses = b.entities.filter((e) => e.side === "monster" && e.monsterCardId === boss.card);
  const heroes = b.entities.filter((e) => e.side === "hero");
  if (
    bosses.length !== 1 ||
    bosses[0]!.id !== boss.entity ||
    heroes.length !== 4 ||
    d.heroes.length !== 4 ||
    new Set(heroes.map((h) => h.id)).size !== 4 ||
    !Number.isSafeInteger(b.rngCursor) ||
    b.rngCursor < d.cursor ||
    !Number.isSafeInteger(b.choiceCursor) ||
    b.choiceCursor < d.decision ||
    d.heroes.some(
      (h) =>
        !heroes.some(
          (e) =>
            e.id === h.id &&
            e.heroStatId === h.heroStatId &&
            e.life === h.life &&
            e.stance &&
            Number.isSafeInteger(e.stress) &&
            e.stress! >= 0 &&
            e.stress! <= 10,
        ),
    )
  )
    return refuse(
      `${boss.label}身份、英雄或RNG交接不一致，不清理房间、不记录奖励（R30/R38、R-048）`,
    );
  if (wipedOut) {
    if (
      heroes.some((e) => !e.dead) ||
      !b.entities.some((e) => e.side === "monster" && !e.dead) ||
      turn.monstersDefeated === true ||
      d.bossQuestVictory
    )
      return refuse("英雄全灭事实不一致；双方全灭保留停点，不推定战役失败（R-044/R-068）");
    return {
      state: { ...state, dungeon: { ...d, campaignFailure: "bossQuestHeroesDefeated" } },
      events: [
        {
          type: "dungeonUpdated",
          message: `${boss.label}战斗英雄全灭，战役失败；保留战场，不消耗替补、不清房、不发奖励（R-044）`,
        },
      ],
    };
  }
  if (
    !bosses[0]!.dead ||
    b.entities.some((e) => e.side === "monster" && !e.dead) ||
    !heroes.some((e) => !e.dead) ||
    clearedBossThreatScriptIdAfterVictory(state) !== boss.script
  )
    return refuse(`${boss.label}胜利事实不一致，不清理房间、不记录奖励（R30/R38）`);
  const returned = d.heroes.map((hero) => {
    const e = heroes.find((h) => h.id === hero.id)!;
    return {
      ...hero,
      combat: e,
      wounds: e.wounds,
      stress: e.stress!,
      stance: e.stance!,
      dead: e.dead,
      resolveTested: e.resolveTested,
      resolveCardId: e.resolveCardId ?? undefined,
      diseaseId: e.diseaseId ?? null,
      quirkIds: e.quirkIds ?? [],
      ...(e.deathReason ? { deathReason: e.deathReason } : {}),
      statusStacks: e.statusStacks ?? [],
    };
  });
  const { activeBossThreatScriptId: _threat, ...rest } = d;
  void _threat;
  const base = recordRuinsBossDefeatOnThreatCleared(rest, boss.script);
  const { battle: _battle, ...outside } = state;
  void _battle;
  return {
    state: {
      ...outside,
      dungeon: {
        ...base,
        heroes: returned,
        phase: returned.some((h) => h.dead) ? "awaitingReplacement" : "ready",
        ...(returned.some((h) => h.dead) ? { replacementResume: "ready" as const } : {}),
        cursor: b.rngCursor,
        decision: b.choiceCursor,
        gold: loot.gold,
        lootPool: loot,
        resolveDecks: b.resolveDecks ?? d.resolveDecks,
        ...(b.conditions ? { conditions: b.conditions } : {}),
        ...(b.trinkets ? { trinkets: b.trinkets } : {}),
        explorationSetup: { ...d.explorationSetup, light: b.light, provisions: b.provisions ?? [] },
        scoutBonus: false,
        mustLeaveRoomId: undefined,
        // 专属Boss房卡与召唤物不属于普通九房/怪物实例牌池，两个牌池保持原样。
        roomCards: { ...d.roomCards!, active: null },
        rooms: d.rooms.map((r) => (r.id === d.position ? { ...r, cleared: true } : r)),
        bossQuestVictory: true,
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `${boss.label}胜利返回地图：清理目标房、清除迫近威胁并记录Boss击败；保留普通房间/怪物牌池，不额外洗牌或发XP（R30/R38、R-122）`,
      },
    ],
  };
}
