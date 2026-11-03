import type { ApplyResult, GameState } from "../command";
import { rejectBattleCommand } from "../battle";
import { NECROMANCER_I_SCRIPT_ID, NECROMANCER_I_COMBAT_MONSTER_CARD_ID } from "./necromancer-i";
import { clearedBossThreatScriptIdAfterVictory } from "./threat-campaign";
import { recordRuinsBossDefeatOnThreatCleared } from "./establish-imminent-threat";

/** 仅识别R-172新增真实部署；旧普通遭遇与其它Boss仍走原入口。 */
export function necromancerIRealCombatActive(state: GameState): boolean {
  return (
    state.battle !== undefined &&
    state.dungeon?.phase === "inBattle" &&
    state.dungeon.roomCards?.active?.cardId === "room:p010" &&
    state.dungeon.roomCards.active.tileId === "room_tile:p006:back"
  );
}

/** R30/R38：Boss胜利交接不借用普通怪物牌池，也不重洗九张普通房间牌。 */
export function finishNecromancerIVictory(state: GameState): ApplyResult {
  const d = state.dungeon;
  const b = state.battle;
  const active = d?.roomCards?.active;
  const room = d?.rooms.find((r) => r.id === d.position);
  const plan = d?.faceTheThreatEmbarkPlan;
  const turn = b?.encounter?.turn;
  const loot = b?.loot ?? b?.lootPool;
  const refuse = (message: string) => rejectBattleCommand(state, message);
  if (
    !d ||
    !b ||
    !necromancerIRealCombatActive(state) ||
    d.campaignLevel !== 1 ||
    d.questDistribution?.questId !== "quest:p019" ||
    d.activeBossThreatScriptId !== NECROMANCER_I_SCRIPT_ID ||
    d.bossCombatThreatCeased !== NECROMANCER_I_SCRIPT_ID ||
    d.imminentThreatDescriptionCardId !== "boss_ability:p001" ||
    plan?.resolvedScriptId !== NECROMANCER_I_SCRIPT_ID ||
    plan.roomPlacement !== "edgeRoomsR30" ||
    plan.combatEntry.combatMonsterCardId !== NECROMANCER_I_COMBAT_MONSTER_CARD_ID ||
    active?.roomId !== d.position ||
    room?.kind !== "objective" ||
    room.cleared ||
    !room.revealed ||
    d.monsterPool?.active ||
    !d.explorationSetup ||
    d.explorationSetup.dungeonLevel !== 1 ||
    turn?.type !== "finished" ||
    turn.outcome !== "victory" ||
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
      "需要R-172真实部署的Necromancer I已完成胜利、无待选及未处置战利品；失败/全灭交接仍保留停点（R30/R38）",
    );
  const bosses = b.entities.filter(
    (e) => e.side === "monster" && e.monsterCardId === NECROMANCER_I_COMBAT_MONSTER_CARD_ID,
  );
  const heroes = b.entities.filter((e) => e.side === "hero");
  if (
    bosses.length !== 1 ||
    bosses[0]!.id !== "boss:necromancer:1" ||
    !bosses[0]!.dead ||
    b.entities.some((e) => e.side === "monster" && !e.dead) ||
    !heroes.some((e) => !e.dead) ||
    clearedBossThreatScriptIdAfterVictory(state) !== NECROMANCER_I_SCRIPT_ID ||
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
      "Necromancer I胜利事实、英雄或RNG交接不一致，不清理房间、不记录奖励（R30/R38、R-048）",
    );
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
  const base = recordRuinsBossDefeatOnThreatCleared(rest, NECROMANCER_I_SCRIPT_ID);
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
        message:
          "Necromancer I胜利返回地图：清理目标房、清除迫近威胁并记录Boss击败；保留普通房间/怪物牌池，不额外洗牌或发XP（R30/R38、R-122）",
      },
    ],
  };
}
