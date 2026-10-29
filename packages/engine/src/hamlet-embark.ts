import { asQuestMapPairingQuest, basicQuests } from "../../data/src/basic-quests";
import { pickEmbarkQuestMapLayout } from "../../data/src/quest-map-pairing";
import { questsForCampaignLevel } from "./campaign-quest-pool";
import type { BasicQuestId } from "../../data/src/basic-quests";
import {
  roomDistributionEmbarkBlockReason,
  roomDistributionSchema,
} from "../../data/src/dungeon-layout";
import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import type { DungeonState } from "./dungeon";
import { createLootState } from "./loot";
import { createRng } from "./rng";
import { buildingLevelsProblem } from "./hamlet-buildings";
import { conditionPoolProblem } from "./conditions";
import { trinketPoolProblem, trinketDeck, setTrinketDeck } from "./trinket-acquisition";
import { heroSkillSlotCount } from "./hero-loadout";
import { readCampaignLevel } from "./hamlet-campaign";
import { scoutAheadPlanProblem } from "./hamlet-scout-ahead";
import { expandRoomDistributionForEmbark } from "./room-distribution-expand";
import {
  resolveFaceTheThreatEmbarkForChoose,
  shouldForceFaceTheThreatOfferAtNextQuest,
} from "./boss/face-the-threat-embark-runtime";
import { FACE_THE_THREAT_QUEST_ID, isFaceTheThreatQuestId } from "./boss/quest-bridge";

type Hero = DungeonState["heroes"][number];

function shuffleIds(ids: readonly string[], seed: number, cursor: number) {
  const rng = createRng(seed),
    deck = [...ids];
  for (let i = 0; i < cursor; i++) rng.next();
  let nextCursor = cursor;
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    nextCursor++;
  }
  return { deck, cursor: nextCursor };
}

function shuffleKinds(
  kinds: readonly DungeonState["rooms"][number]["kind"][],
  seed: number,
  cursor: number,
) {
  const rng = createRng(seed),
    tokens = [...kinds];
  for (let i = 0; i < cursor; i++) rng.next();
  let nextCursor = cursor;
  for (let i = tokens.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [tokens[i], tokens[j]] = [tokens[j]!, tokens[i]!];
    nextCursor++;
  }
  return { tokens, cursor: nextCursor };
}

/** R34：出征时把原装备换成临时卡，计划保留供任务结束归还（R-080）。 */
export function applyTemporarySkillUpgrades(
  heroes: readonly Hero[],
  catalog: NonNullable<DungeonState["battleCatalog"]>,
): { readonly heroes: readonly Hero[] } | { readonly reason: string } {
  const next: Hero[] = [];
  for (const hero of heroes) {
    const plans = hero.nextQuestSkillUpgrades;
    if (plans === undefined) {
      next.push(hero);
      continue;
    }
    if (
      !Array.isArray(plans) ||
      plans.some((u) => !u) ||
      new Set(plans.map((u) => u.originalSkillId)).size !== plans.length ||
      !Array.isArray(hero.skillIds) ||
      new Set(hero.skillIds).size !== hero.skillIds.length
    )
      return { reason: "铁匠临时技能计划无效，未出征（R34）" };
    let skillIds = [...hero.skillIds];
    for (const plan of plans) {
      const original = catalog.skills.find((s) => s.id === plan.originalSkillId);
      const temporary = catalog.skills.find((s) => s.id === plan.temporarySkillId);
      const stat = catalog.heroStats.find((s) => s.id === hero.heroStatId);
      if (
        !skillIds.includes(plan.originalSkillId) ||
        !original?.name ||
        !temporary ||
        temporary.verification.unverified ||
        temporary.name !== original.name ||
        temporary.hero !== stat?.name ||
        ![2, 3].includes(temporary.level) ||
        temporary.level < original.level
      )
        return { reason: "临时技能卡缺失、未核实或与原卡不匹配，未出征（R-048/R34）" };
      skillIds = skillIds.map((id) => (id === plan.originalSkillId ? plan.temporarySkillId : id));
    }
    next.push({
      ...hero,
      skillIds,
      ...(hero.combat ? { combat: { ...hero.combat, skillIds } } : {}),
    });
  }
  return { heroes: next };
}

/** R34 / R-080：任务结束归还当前计划中的原卡（可能已是Guild永久卡），并清除计划与未掷奖励骰字段。 */
export function restoreTemporarySkillUpgrades(heroes: readonly Hero[]): readonly Hero[] {
  return heroes.map((hero) => {
    const { nextQuestSkillUpgrades: plans, nextQuestProvisionDice: _dice, ...base } = hero;
    void _dice;
    let skillIds = hero.skillIds ? [...hero.skillIds] : hero.skillIds;
    if (plans?.length && skillIds) {
      for (const plan of plans) {
        if (skillIds.includes(plan.temporarySkillId))
          skillIds = skillIds.map((id) =>
            id === plan.temporarySkillId ? plan.originalSkillId : id,
          );
      }
    }
    return {
      ...base,
      ...(skillIds ? { skillIds } : {}),
      ...(hero.combat && skillIds ? { combat: { ...hero.combat, skillIds } } : {}),
    };
  });
}

function washNomadDisplay(
  pool: NonNullable<DungeonState["trinkets"]>,
  seed: number,
  cursor: number,
) {
  if (pool.display === undefined) return { pool, cursor };
  let next = pool;
  for (const level of [pool.level, ...(pool.inactive ?? []).map((p) => p.level)]) {
    const display = pool.display.filter((id) =>
      pool.cards.some((c) => c.id === id && c.level === level),
    );
    // 保持旧I级已买空陈列的洗牌序列；非当前级无陈列不消费RNG。
    if (!display.length && (level !== pool.level || pool.level !== 1)) continue;
    const shuffled = shuffleIds([...trinketDeck(next, level)!.deck, ...display], seed, cursor);
    next = setTrinketDeck(next, level, shuffled.deck);
    cursor = shuffled.cursor;
  }
  const { display: _display, ...rest } = next;
  void _display;
  return {
    pool: { ...rest, incoming: null },
    cursor,
  };
}

function embarkProblem(state: GameState, allowPending: boolean): string | null {
  const d = state.dungeon,
    h = d?.hamlet;
  if (
    !d ||
    state.battle ||
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    !d.questSummary?.awarded ||
    h?.phase !== "preparationComplete" ||
    h.active ||
    (!allowPending && d.pending) ||
    !d.battleCatalog ||
    !d.conditions ||
    !d.trinkets ||
    !d.roomCards ||
    !d.monsterPool ||
    !d.curio ||
    !d.explorationSetup ||
    d.heroes.length !== 4 ||
    d.heroes.some((hero) => {
      const level = hero.level;
      const stat = d.battleCatalog!.heroStats.find((s) => s.id === hero.heroStatId);
      return (
        hero.dead ||
        !hero.attributesVerified ||
        !hero.heroStatId ||
        ![1, 2, 3].includes(level!) ||
        !stat?.attributesVerified ||
        stat.level !== level ||
        (hero.heroLevel !== undefined && hero.heroLevel !== level) ||
        hero.life !== stat.life ||
        !Number.isSafeInteger(hero.stress) ||
        hero.stress < 0 ||
        hero.stress > 9 ||
        !Array.isArray(hero.skillIds) ||
        hero.skillIds.length !== heroSkillSlotCount(level!)
      );
    }) ||
    ["aggressive", "defensive", "ranged", "support"].some(
      (stance) => d.heroes.filter((hero) => hero.stance === stance).length !== 1,
    ) ||
    !Number.isSafeInteger(d.gold) ||
    d.gold < 0 ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0
  )
    return "须在村庄准备完成后、无待选且四名已核实英雄（I–III，技能槽=2+HL）齐全时出征下一任务（R32/R33、R-051）";
  return (
    scoutAheadPlanProblem(d.nextQuestRoomReveals) ??
    buildingLevelsProblem(d) ??
    conditionPoolProblem(d.conditions, d.heroes) ??
    trinketPoolProblem(d.trinkets, d.heroes)
  );
}

/** R33 §4.1：准备天数用尽后抽至多两张当前战役等级已接通任务；已进行/未选永久弃掉（R-037）。 */
export function offerNextQuest(state: GameState): ApplyResult {
  const reason = embarkProblem(state, false);
  if (reason) return rejectBattleCommand(state, reason);
  const d = state.dungeon!;
  const campaignLevel = readCampaignLevel(d);
  const current = d.questSummary!.questId;
  const discarded = d.discardedQuests ?? [];
  const currentQuest = basicQuests.find((q) => q.id === current);
  if (
    !currentQuest ||
    !Array.isArray(discarded) ||
    discarded.some((id) => typeof id !== "string" || !id) ||
    new Set(discarded).size !== discarded.length ||
    // 同级内上一任务必须已记入弃置才算非法重复；跨级推进后旧任务本就在弃置中（R-037）。
    (discarded.includes(current) && currentQuest.level === campaignLevel)
  )
    return rejectBattleCommand(state, "上一任务弃置记录无效，未抽下一任务（R-037）");

  if (shouldForceFaceTheThreatOfferAtNextQuest(state)) {
    const faceQuest = basicQuests.find((q) => q.id === FACE_THE_THREAT_QUEST_ID)!;
    const offers = [FACE_THE_THREAT_QUEST_ID] as const;
    const pending = {
      id: `hamlet-next-quest:${d.decision}`,
      actorId: "party",
      prompt: "当前幕普通任务已完成：出征 Face the Threat!（spec §14.1 / R30；不抽任务卡）",
      options: [{ id: FACE_THE_THREAT_QUEST_ID, label: faceQuest.name }],
    };
    return {
      state: {
        ...state,
        dungeon: {
          ...d,
          pending,
          decision: d.decision + 1,
          nextQuestOffers: offers,
        },
      },
      events: [
        {
          type: "dungeonUpdated",
          message: `下一任务候选项：${faceQuest.name}（Face the Threat；不消耗 RNG 洗牌）`,
        },
      ],
      pendingChoice: pending,
    };
  }

  const remaining = questsForCampaignLevel(campaignLevel)
    .map((q) => q.id)
    .filter((id) => id !== current && !discarded.includes(id));
  if (!remaining.length)
    return rejectBattleCommand(
      state,
      `已无剩余已接通${["", "I", "II", "III"][campaignLevel]}级任务可出征（R-037）`,
    );
  const drawn = shuffleIds(remaining, state.seed, d.cursor);
  const offers = drawn.deck.slice(0, Math.min(2, remaining.length));
  const pending = {
    id: `hamlet-next-quest:${d.decision}`,
    actorId: "party",
    prompt:
      offers.length === 1
        ? `仅剩一张已接通${["", "I", "II", "III"][campaignLevel]}级任务：确认出征（R33、R-037）`
        : "选择下一任务：抽到的两张中保留一张，另一张永久移出（R33、R-037）",
    options: offers.map((id) => {
      const quest = basicQuests.find((q) => q.id === id)!;
      return { id, label: quest.name };
    }),
  };
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        cursor: drawn.cursor,
        pending,
        decision: d.decision + 1,
        nextQuestOffers: offers,
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `下一任务候选项：${offers
          .map((id) => basicQuests.find((q) => q.id === id)!.name)
          .join(" / ")}`,
      },
    ],
    pendingChoice: pending,
  };
}

/** 选定任务后布置新地牢：保留战役资源，应用临时技能，游商陈列洗回，进入开局补给（R12/R33/R34）。 */
export function chooseNextQuest(state: GameState, choiceId: string, optionId: string): ApplyResult {
  const reason = embarkProblem(state, true),
    d = state.dungeon!,
    pending = d.pending;
  if (
    reason ||
    !pending?.id.startsWith("hamlet-next-quest:") ||
    pending.id !== choiceId ||
    !pending.options.some((o) => o.id === optionId) ||
    !d.nextQuestOffers ||
    d.nextQuestOffers.length < 1 ||
    d.nextQuestOffers.length > 2 ||
    new Set(d.nextQuestOffers).size !== d.nextQuestOffers.length ||
    !d.nextQuestOffers.includes(optionId as BasicQuestId)
  )
    return rejectBattleCommand(state, reason ?? "下一任务选择无效或已过期");
  const quest = basicQuests.find((q) => q.id === optionId);
  const campaignLevel = readCampaignLevel(d);
  if (!quest) return rejectBattleCommand(state, "未知任务，未出征");
  const faceEmbark = resolveFaceTheThreatEmbarkForChoose(state, optionId);
  if (faceEmbark.kind === "refused") return faceEmbark.result;
  if (!isFaceTheThreatQuestId(quest.id) && quest.level !== campaignLevel)
    return rejectBattleCommand(state, "任务等级与战役等级不符，未出征（R35 / R-037）");
  if (d.trinkets!.level !== campaignLevel)
    return rejectBattleCommand(state, "地牢饰品等级须等于战役等级，未出征（R35）");
  const applied = applyTemporarySkillUpgrades(d.heroes, d.battleCatalog!);
  if ("reason" in applied) return rejectBattleCommand(state, applied.reason);
  const washed = washNomadDisplay(d.trinkets!, state.seed, d.cursor);
  if (trinketPoolProblem(washed.pool, applied.heroes))
    return rejectBattleCommand(state, trinketPoolProblem(washed.pool, applied.heroes)!);
  const parsedLayout = pickEmbarkQuestMapLayout(
    asQuestMapPairingQuest(quest),
    state.seed,
    washed.cursor,
  );
  const template = roomDistributionSchema.parse(quest.distribution);
  const expanded = expandRoomDistributionForEmbark(template, state.seed, washed.cursor);
  const distribution = expanded.distribution;
  const embarkBlock = roomDistributionEmbarkBlockReason(distribution);
  if (embarkBlock) return rejectBattleCommand(state, embarkBlock);
  const slots = parsedLayout.nodes.filter((n) => n.kind === "room");
  const kinds = distribution.counts.flatMap((c) => Array.from({ length: c.count }, () => c.kind));
  if (kinds.length !== slots.length || parsedLayout.unresolvedMarkers?.length)
    return rejectBattleCommand(state, "下一任务地图/代币不一致，未出征（R-046）");
  const shuffled = shuffleKinds(kinds, state.seed, expanded.cursor);
  const priorDiscarded = d.discardedQuests ?? [];
  const newlyDiscarded = [
    d.questSummary!.questId,
    ...d.nextQuestOffers.filter((id) => id !== optionId),
  ].filter((id) => !priorDiscarded.includes(id));
  const discardedQuests = [...priorDiscarded, ...newlyDiscarded];
  if (new Set(discardedQuests).size !== discardedQuests.length)
    return rejectBattleCommand(state, "任务弃置列表冲突，未出征（R-037）");
  const { last: _last, ...curioBase } = d.curio!;
  void _last;
  const next = {
    layout: parsedLayout,
    mode: d.mode,
    cursor: shuffled.cursor,
    position: "S" as const,
    heroes: applied.heroes,
    resolveCards: d.resolveCards,
    resolveDecks: d.resolveDecks,
    gold: d.gold,
    // R-047 / R-098：保留村庄期间已抽取（如 Pilfer）的 claimed；无池或已放置则新建十枚。
    lootPool: (() => {
      const fresh = { ...createLootState(), gold: d.gold };
      const loot = d.lootPool;
      if (!loot || loot.placed.length) return fresh;
      const canonical = createLootState().available;
      const ids = [...loot.available.map((t) => t.id), ...loot.claimedIds];
      if (
        new Set(ids).size !== ids.length ||
        ids.length !== 10 ||
        ids.some((id) => !canonical.some((t) => t.id === id)) ||
        loot.available.some((t) => !canonical.some((e) => e.id === t.id && e.kind === t.kind))
      )
        return fresh;
      return { ...loot, gold: d.gold, placed: [] };
    })(),
    battleCatalog: d.battleCatalog!,
    conditions: d.conditions!,
    trinkets: washed.pool,
    roomCards: { ...d.roomCards!, active: null },
    monsterPool: {
      ...d.monsterPool!,
      active: null,
    },
    curio: { ...curioBase, active: null },
    rooms: slots.map((n, i) => ({
      id: n.id,
      kind: shuffled.tokens[i]!,
      revealed: false,
    })),
    scoutBonus: false,
    phase: "awaitingProvisions" as const,
    pending: null,
    decision: d.decision + 1,
    exploration: null,
    visited: ["S"],
    campaignLevel,
    // R-124 / R11：换任务保留实际威胁与已击败身份，不能只留下出征计划。
    ...(d.activeBossThreatScriptId ? { activeBossThreatScriptId: d.activeBossThreatScriptId } : {}),
    ...(d.imminentThreatDescriptionCardId
      ? { imminentThreatDescriptionCardId: d.imminentThreatDescriptionCardId }
      : {}),
    ...(d.unregisteredImminentThreatHold
      ? { unregisteredImminentThreatHold: d.unregisteredImminentThreatHold }
      : {}),
    ...(d.defeatedRuinsBossIdentities
      ? { defeatedRuinsBossIdentities: d.defeatedRuinsBossIdentities }
      : {}),
    explorationSetup: {
      dungeonLevel: campaignLevel,
      light: d.nextQuestStartingLight === 4 ? 4 : 5,
      provisions: [],
    },
    rest: { questId: quest.id, used: false },
    questDistribution: {
      ...distribution,
      counts: distribution.counts.map((c) => ({ ...c })),
    }, // 已展开 counts，匹配 storedDistributionMatchesQuest（R-112）
    ...(d.buildingLevels ? { buildingLevels: d.buildingLevels } : {}),
    ...(d.stagecoachXp !== undefined ? { stagecoachXp: d.stagecoachXp } : {}),
    ...(d.waitingHeroTokens !== undefined ? { waitingHeroTokens: d.waitingHeroTokens } : {}),
    ...(d.nextQuestProvisionFaceChoice ? { nextQuestProvisionFaceChoice: true as const } : {}),
    ...(d.nextQuestPartyProvisionDice !== undefined
      ? { nextQuestPartyProvisionDice: d.nextQuestPartyProvisionDice }
      : {}),
    ...(d.nextQuestLostShipment ? { nextQuestLostShipment: true as const } : {}),
    ...(d.nextQuestRoomReveals !== undefined
      ? { nextQuestRoomReveals: d.nextQuestRoomReveals }
      : {}),
    ...(d.deadHeroNames ? { deadHeroNames: d.deadHeroNames } : {}),
    ...(d.deathChoiceCursor !== undefined ? { deathChoiceCursor: d.deathChoiceCursor } : {}),
    ...(d.replacementChoiceCursor !== undefined
      ? { replacementChoiceCursor: d.replacementChoiceCursor }
      : {}),
    discardedQuests,
    hamletMemory: {
      deck: [...d.hamlet!.deck],
      permanentlyRemoved: [...d.hamlet!.permanentlyRemoved],
    },
    ...(faceEmbark.kind === "ok" ? { faceTheThreatEmbarkPlan: faceEmbark.plan } : {}),
  } satisfies DungeonState;
  const lightNote = d.nextQuestStartingLight === 4 ? "；Unsettling Darkness起始光照4" : "";
  const merchantNote = d.nextQuestProvisionFaceChoice ? "；Traveling Merchants待改骰" : "";
  const faceNote =
    faceEmbark.kind === "ok"
      ? `；Face the Threat→${faceEmbark.plan.resolvedScriptId}（${faceEmbark.plan.combatEntry.combatMonsterCardId}；layout hold）`
      : "";
  return {
    state: { ...state, dungeon: next },
    events: [
      {
        type: "dungeonUpdated",
        message: `出征 ${quest.name}：临时技能已装备，游商陈列已洗回，等待开局补给（R12/R33/R34）；未选/已完成任务永久弃置${lightNote}${merchantNote}${faceNote}`,
      },
    ],
  };
}
