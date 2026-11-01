import { darkestBossVictoryAfterEncounter } from "./boss/darkest-content";
import { darkestMidBossCombatActive } from "./boss/darkest-mid-boss-deploy";
import { isBossQuestId } from "./boss/quest-bridge";
import { clearedBossThreatScriptIdAfterVictory } from "./boss/threat-campaign";
import { rejectBattleCommand } from "./battle";
import { createLootState } from "./loot";
import { awaitDungeonRoomCurio } from "./dungeon-curio-room";
import {
  completeCurioRoomWithoutCurioDraw,
  shouldSkipCurioDrawInCurioRoom,
} from "./boss/threat-passive-runtime";
import {
  objectiveRoomClearsOnVictory,
  objectiveRoomResolutionAfterVictory,
  readSetAsideRoomCardIds,
} from "./dungeon-objective";
import { darkestOrdinaryCombatActive } from "./darkest-ordinary-encounter-deploy";
import { darkestOrdinaryDeploymentMatches } from "./darkest-ordinary-monster-deploy";
import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";

function reject(state: GameState, message: string): ApplyResult {
  return rejectBattleCommand(state, message);
}

function syncHeroesFromBattle(d: DungeonState, state: GameState) {
  const b = state.battle!;
  return d.heroes.map((hero) => {
    const entity = b.entities.find((e) => e.id === hero.id && e.side === "hero")!;
    return {
      ...hero,
      combat: entity,
      wounds: entity.wounds,
      stress: entity.stress!,
      stance: entity.stance!,
      dead: entity.dead,
      resolveTested: entity.resolveTested,
      resolveCardId: entity.resolveCardId ?? undefined,
      diseaseId: entity.diseaseId ?? null,
      quirkIds: entity.quirkIds ?? [],
      ...(entity.deathReason ? { deathReason: entity.deathReason } : {}),
      statusStacks: entity.statusStacks ?? [],
    };
  });
}

function darkestDeckConservation(
  d: DungeonState,
  extraActiveIds: readonly string[],
): string | undefined {
  const darkest = d.darkest!;
  const base = darkest.monsterDeck;
  if (base.length !== 26 || new Set(base).size !== 26) return "最暗怪物牌堆不守恒";
  const remaining = darkest.monsterDeckRemaining ?? [];
  const discarded = darkest.monsterDeckDiscarded ?? [];
  const ids = [...remaining, ...discarded, ...extraActiveIds];
  if (ids.length !== base.length || new Set(ids).size !== base.length) return "最暗怪物牌堆不守恒";
  if (ids.some((id) => !base.includes(id))) return "最暗怪物牌堆不守恒";
  return undefined;
}

function finishOrdinaryDeck(
  d: DungeonState,
  victory: boolean,
): Pick<NonNullable<DungeonState["darkest"]>, "monsterDeckRemaining" | "monsterDeckDiscarded"> {
  const deployment = d.darkest!.ordinaryDeployment!;
  const encounterIds = deployment.monsters.map((monster) => monster.instanceId);
  const remaining = [...(d.darkest!.monsterDeckRemaining ?? [])];
  const discarded = [...(d.darkest!.monsterDeckDiscarded ?? [])];
  if (victory)
    return {
      monsterDeckRemaining: remaining,
      monsterDeckDiscarded: [...discarded, ...encounterIds],
    };
  return { monsterDeckRemaining: [...remaining, ...encounterIds], monsterDeckDiscarded: discarded };
}

/** R25/R36：最暗普通 26 堆与中途 Boss 半场 finish；不依赖 Ruins monsterPool.active。 */
export function finishDarkestDungeonBattle(state: GameState): ApplyResult {
  const d = state.dungeon;
  const b = state.battle;
  const turn = b?.encounter?.turn;
  const ordinary = darkestOrdinaryCombatActive(state);
  const midBoss = darkestMidBossCombatActive(state);
  const wipedOut = turn?.type === "halted" && turn.reason === "heroesDefeated";
  if (!d?.darkest || (!ordinary && !midBoss))
    return reject(state, "最暗战后回传需要已登记的最暗普通或中途 Boss 半场（R36）");
  const loot = b?.loot ?? b?.lootPool ?? createLootState();
  if (
    !b ||
    d.phase !== "inBattle" ||
    d.roomCards?.active?.roomId !== d.position ||
    (turn?.type !== "finished" && !wipedOut) ||
    b.pending ||
    b.shuffleIntents.length ||
    b.shuffleContinuation ||
    loot.placed.length
  )
    return reject(state, "战斗尚未完成或仍有待选 / 全灭停点，不能回传奖励（R25、Q-52）");
  if (wipedOut) return reject(state, "最暗任务英雄全灭交接待确认，保持停点（R25、R-048）");
  if (
    !Number.isSafeInteger(b.rngCursor) ||
    b.rngCursor < d.cursor ||
    d.heroes.some(
      (hero) =>
        !b.entities.some(
          (entity) =>
            entity.id === hero.id &&
            entity.side === "hero" &&
            entity.life === hero.life &&
            entity.stance &&
            entity.stress !== undefined,
        ),
    )
  )
    return reject(state, "战后英雄 / RNG 交接不一致，保持原状态");
  if (
    turn.type === "finished" &&
    b.entities.every((entity) => entity.side !== "hero" || entity.dead)
  )
    return reject(state, "英雄全灭不能伪装成胜利或第四轮撤退；保持全灭停点（R25/R-068）");
  if (ordinary) {
    if (!darkestOrdinaryDeploymentMatches(d))
      return reject(state, "最暗普通部署与当前房间不一致，不能回传（R36）");
    const conservation = darkestDeckConservation(
      d,
      d.darkest!.ordinaryDeployment!.monsters.map((monster) => monster.instanceId),
    );
    if (conservation) return reject(state, conservation);
  }
  if (midBoss) {
    const deck = d.darkest!.monsterDeck;
    if (deck.length !== 26 || new Set(deck).size !== 26)
      return reject(state, "最暗 26 张牌堆缺失，不能回传");
  }

  const victory = turn.type === "finished" && turn.outcome === "victory";
  if (midBoss && victory && !darkestBossVictoryAfterEncounter(state))
    return reject(state, "最暗目标 Boss 未全部确认击败，不能清理任务目标或记录胜利（R36 / R-122）");
  const questId = d.questDistribution?.questId;
  const clearedThreatId = clearedBossThreatScriptIdAfterVictory(state);
  const bossQuestVictory =
    victory && questId && isBossQuestId(questId) && darkestBossVictoryAfterEncounter(state)
      ? (true as const)
      : undefined;
  const heroes = syncHeroesFromBattle(d, state);
  const kind = d.rooms.find((room) => room.id === d.position)?.kind;
  const curioReward = victory && kind === "curio";
  const objectiveRecovery =
    victory && kind === "objective"
      ? objectiveRoomResolutionAfterVictory(d, d.position)
      : undefined;
  const clearsRoom = victory && objectiveRoomClearsOnVictory(d, kind);
  const bonus = victory ? (kind === "treasure" ? 20 : 0) : 0;
  const activeCardId = d.roomCards!.active!.cardId;
  const setAside = readSetAsideRoomCardIds(d);
  const { curioRoom: previousCurio, ...returnedDungeon } = d;
  const { battle: _finished, ...outside } = state;
  void _finished;

  const deckBefore = midBoss ? [...d.darkest!.monsterDeck] : undefined;
  const ordinaryDeck = ordinary ? finishOrdinaryDeck(d, victory) : undefined;
  const { ordinaryDeployment: _ordinary, bossDeployment: _boss, ...darkestRest } = d.darkest!;
  void _ordinary;
  void _boss;

  const result: ApplyResult = {
    state: {
      ...outside,
      dungeon: {
        ...returnedDungeon,
        heroes,
        phase: heroes.some((hero) => hero.dead)
          ? "awaitingReplacement"
          : curioReward || objectiveRecovery
            ? "awaitingRoom"
            : "ready",
        ...(curioReward ? { curioRoom: { ...previousCurio!, stage: "reward" } } : {}),
        ...(heroes.some((hero) => hero.dead)
          ? { replacementResume: curioReward ? ("roomCurio" as const) : ("ready" as const) }
          : {}),
        cursor: b.rngCursor,
        decision: b.choiceCursor,
        gold: loot.gold + bonus,
        lootPool: { ...loot, gold: loot.gold + bonus },
        resolveDecks: b.resolveDecks ?? d.resolveDecks,
        ...(b.conditions ? { conditions: b.conditions } : {}),
        ...(b.trinkets ? { trinkets: b.trinkets } : {}),
        scoutBonus: false,
        mustLeaveRoomId: victory ? undefined : d.position,
        explorationSetup: {
          ...d.explorationSetup!,
          light: b.light,
          provisions: b.provisions ?? [],
        },
        roomCards: {
          ...d.roomCards!,
          active: null,
          discard: setAside.includes(activeCardId)
            ? (d.roomCards!.discard ?? [])
            : [...(d.roomCards!.discard ?? []), activeCardId],
        },
        darkest: {
          ...darkestRest,
          ...(ordinaryDeck ?? {}),
        },
        ...(objectiveRecovery ? { roomResolution: objectiveRecovery } : {}),
        ...(bossQuestVictory ? { bossQuestVictory } : {}),
        rooms: d.rooms.map((room) =>
          room.id === d.position && clearsRoom ? { ...room, cleared: true } : room,
        ),
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: victory
          ? objectiveRecovery
            ? `最暗胜利返回地图：须再花费行动拾取任务目标后目标房才算清理（R15、QUEST p4）`
            : `最暗胜利返回地图：${ordinary ? "26 堆遭遇牌入弃" : "中途 Boss 半场结束"}${bonus ? `，宝藏奖励 +${bonus} 金币` : ""}；房间牌弃置（R15、R25）${bossQuestVictory ? "；目标 Boss 击败边界已记录" : ""}`
          : `最暗第四轮撤退返回地图：房间未清理，必须先离开；${ordinary ? "26 堆遭遇牌回到余牌" : "Boss 部署已清除"}（R25）`,
      },
    ],
  };

  if (midBoss && deckBefore) {
    const after = result.state.dungeon!.darkest!.monsterDeck;
    if (
      after.length !== deckBefore.length ||
      after.some((id, index) => id !== deckBefore[index]) ||
      result.state.dungeon!.darkest!.monsterDeckRemaining !== d.darkest!.monsterDeckRemaining ||
      result.state.dungeon!.darkest!.monsterDeckDiscarded !== d.darkest!.monsterDeckDiscarded
    )
      return reject(state, "中途 Boss 战后不能改写 26 张牌堆（R36）");
  }
  if (ordinary) {
    const conservation = darkestDeckConservation(result.state.dungeon!, []);
    if (conservation) return reject(state, conservation);
  }

  if (!curioReward || heroes.some((hero) => hero.dead)) return result;
  if (shouldSkipCurioDrawInCurioRoom(result.state.dungeon!)) {
    const skipped = completeCurioRoomWithoutCurioDraw(result.state);
    return { ...skipped, events: [...result.events, ...skipped.events] };
  }
  const reward = awaitDungeonRoomCurio(result.state);
  return { ...reward, events: [...result.events, ...reward.events] };
}
