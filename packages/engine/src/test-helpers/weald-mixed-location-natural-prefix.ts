import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { drawInitialQuestOffers } from "../initial-quest-draw";
import {
  HAMLET_QUEST_DRAW_OPTION,
  legalHamletQuestDrawModes,
  questIdsForLocationDeck,
} from "../hamlet-location-quest-draw";
import { readRuinsActTransitionReadiness } from "../act-transition-readiness";
import { CURRENT_WEALD_ROOM_VERSIONS, naturalQuest } from "./natural-quest";
import { coreParty } from "./core-quest";
import { wealdTaskSources as productionQuestSources } from "./weald-task-battle";
import { createQuestSave } from "../quest-save";
import type { QuestStart } from "../../../data/src/quest-save";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import type { BasicQuestId } from "../../../data/src/basic-quests";
import {
  WEALD_PRODUCTION_ESTABLISH_THREAT,
  type WealdNaturalActOneDriveOptions,
} from "./weald-face-the-threat-natural-prefix";
import { currentHamletHero } from "../hamlet-actions";
import { wealdMixedActReadyFixture } from "./weald-act";
import { RUINS_COMBAT_LEVELS } from "../core/bosses/ruins-combat-levels";
import { getBossScript } from "../core/bosses/registry";
import type { RuinsBossIdentity } from "../core/bosses/threat-description-catalog";
import type { WealdBossIdentity } from "../weald/catalog";
import { ensureHagIBossScriptRegistered } from "../weald/bosses/hag-i";
import { ensurePounderIBossScriptRegistered } from "../weald/bosses/pounder-i";
import { ensureShriekerIBossScriptRegistered } from "../weald/bosses/shrieker-i";
import { ensureCampaignBossScriptsRegistered } from "../registry";
import { hamletActionOptions } from "../hamlet-actions";

const packs = ["core", "weald"] as const;
const mixedDrawMode = HAMLET_QUEST_DRAW_OPTION.splitOneEach;
/** 第十五刀：混合地点固定种子（生产 split-one-each + 明示 II 末边界）。 */
export const WEALD_MIXED_LOCATION_NATURAL_SEED = 3 as const;

function step(game: GameState, command: Command, log: Command[]) {
  const result = applyCommand(game, command);
  const refused = result.events.find((e) => e.type === "commandRefused");
  if (refused) throw new Error(`${command.type}: ${refused.message}`);
  log.push(command);
  return result.state;
}

function settle(
  game: GameState,
  log: Command[],
  options: { readonly handleDeaths?: boolean } = {},
) {
  let state = game;
  for (let guard = 0; guard < 400; guard++) {
    const d = state.dungeon!;
    if (d.deathTrinketChoice) {
      state = step(
        state,
        { type: "resolveChoice", choiceId: d.deathTrinketChoice.id, optionId: "discard" },
        log,
      );
      continue;
    }
    if (options.handleDeaths && d.replacementPreparation) {
      state = step(
        state,
        {
          type: "resolveChoice",
          choiceId: d.replacementPreparation.choice.id,
          optionId: d.replacementPreparation.choice.options[0]!.id,
        },
        log,
      );
      continue;
    }
    if (!d.pending) break;
    state = step(
      state,
      { type: "resolveChoice", choiceId: d.pending.id, optionId: d.pending.options[0]!.id },
      log,
    );
  }
  if (state.dungeon!.pending) throw new Error("待选循环超限");
  return state;
}

function prepareHamlet(
  game: GameState,
  log: Command[],
  options: WealdNaturalActOneDriveOptions = {},
) {
  let state = step(game, { type: "beginReturnToHamlet" }, log);
  state = settle(state, log, options);
  for (
    let i = 0;
    options.handleDeaths && i < 30 && state.dungeon!.hamletReturn!.phase === "awaitingReplacement";
    i++
  ) {
    state = step(
      state,
      state.dungeon!.preparedReplacements?.length
        ? { type: "joinPreparedReplacements" }
        : { type: "prepareReplacementHero" },
      log,
    );
    state = settle(state, log, options);
  }
  if (state.dungeon!.hamletReturn!.phase !== "provisions")
    throw new Error(`回村暂停：${state.dungeon!.hamletReturn!.phase}`);
  state = step(state, { type: "finishReturnToHamlet" }, log);
  state = step(state, { type: "drawHamletEvent" }, log);
  state = settle(state, log, options);
  for (let i = 0; i < 100 && state.dungeon!.hamlet!.phase !== "preparationComplete"; i++) {
    if (state.dungeon!.hamlet!.phase === "awaitingCaretaker") {
      state = step(state, { type: "rollHamletCaretaker" }, log);
      state = settle(state, log, options);
      continue;
    }
    const actorId = currentHamletHero(state)?.id;
    if (!actorId) throw new Error(`村庄暂停：${state.dungeon!.hamlet!.phase}`);
    const speech: Command = { type: "useHamletSkill", actorId, skill: "zealousSpeech" };
    const legal = !applyCommand(state, speech).events.some((e) => e.type === "commandRefused");
    const service = hamletActionOptions(state)
      .map((o) => o.command)
      .find((c) => c.type === "visitHamletBuilding");
    const fallback = options.skillFallback
      ? hamletActionOptions(state)
          .map((o) => o.command)
          .find((c) => c.type === "useHamletSkill")
      : undefined;
    if (legal) state = step(state, speech, log);
    else if (service) state = step(state, service, log);
    else if (fallback) state = step(state, fallback, log);
    else throw new Error("村庄无可用建筑服务");
    state = settle(state, log, options);
  }
  if (state.dungeon!.hamlet!.phase !== "preparationComplete") throw new Error("村庄行动循环超限");
  return state;
}

function questLocation(questId: string): "ruins" | "weald" | "other" {
  if (questId.startsWith("quest:weald:")) return "weald";
  if (questId.startsWith("quest:p")) return "ruins";
  return "other";
}

function pickOffer(offers: readonly string[], prefer?: "ruins" | "weald"): string {
  if (prefer) {
    const match = offers.find((id) => questLocation(id) === prefer);
    if (match) return match;
  }
  return offers[0]!;
}

export type WealdMixedLocationActOnePrefix = {
  readonly seed: number;
  readonly firstQuest: string;
  readonly commands: readonly Command[];
  readonly game: GameState;
  readonly start: QuestStart;
  readonly stop: string | null;
  readonly completedRuinsQuests: readonly string[];
  readonly completedWealdQuests: readonly string[];
};

/** I 幕混合地点自然前缀：split-one-each，至多四趟出征，不宣称 Boss 全胜。 */
export function wealdMixedLocationNaturalActOnePrefix(
  seed: number,
  options: WealdNaturalActOneDriveOptions = {},
): WealdMixedLocationActOnePrefix {
  ensureHagIBossScriptRegistered();
  ensurePounderIBossScriptRegistered();
  ensureShriekerIBossScriptRegistered();
  ensureCampaignBossScriptsRegistered([...packs]);
  const firstQuest = drawInitialQuestOffers(seed, [...packs], mixedDrawMode)
    .offers[0]! as BasicQuestId;
  const start: QuestStart = {
    seed,
    questId: firstQuest,
    mode: "standard",
    party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
    contentPacks: [...packs],
    bossEdgeRooms: true,
    initialQuestDrawMode: mixedDrawMode,
  };
  let game = createCoreDungeonQuest(
    seed,
    firstQuest,
    "standard",
    coreParty,
    productionQuestSources,
    true,
    null,
    [...packs],
    mixedDrawMode,
  );
  const commands: Command[] = [];
  game = step(game, WEALD_PRODUCTION_ESTABLISH_THREAT, commands);
  if (game.dungeon!.unregisteredImminentThreatHold)
    throw new Error(game.dungeon!.unregisteredImminentThreatHold);
  expectNoBossExpeditionRegion(game);

  let stop: string | null = null;
  let lastLocation: "ruins" | "weald" | "other" = questLocation(firstQuest);
  for (let trip = 0; trip < 4 && !stop; trip++) {
    const questId = game.dungeon!.questDistribution!.questId;
    const run = naturalQuest(seed, questId as typeof firstQuest, true, productionQuestSources, 2, {
      continueFrom: game,
      ...(options.handleDeaths ? { handleDeaths: true as const } : {}),
      ...(options.survival
        ? { survival: true as const, restThreshold: options.restThreshold ?? 6 }
        : {}),
      ...(options.wealdProductionRooms ? CURRENT_WEALD_ROOM_VERSIONS : {}),
    });
    commands.push(...run.commands);
    game = run.state;
    if (run.stopReason) {
      stop = run.stopReason;
      break;
    }
    if (game.dungeon!.campaignFailure) {
      stop = game.dungeon!.campaignFailure;
      break;
    }
    game = prepareHamlet(game, commands, options);
    if (trip === 3) break;
    try {
      game = step(game, { type: "offerNextQuest" }, commands);
      if (game.dungeon!.pending?.id.startsWith("hamlet-quest-draw:")) {
        game = step(
          game,
          {
            type: "resolveChoice",
            choiceId: game.dungeon!.pending!.id,
            optionId: mixedDrawMode,
          },
          commands,
        );
      }
      const offers = game.dungeon!.nextQuestOffers!;
      const prefer: "ruins" | "weald" = lastLocation === "ruins" ? "weald" : "ruins";
      const pick = pickOffer(
        offers,
        offers.some((id) => questLocation(id) === prefer) ? prefer : undefined,
      );
      lastLocation = questLocation(pick);
      game = step(
        game,
        { type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId: pick },
        commands,
      );
    } catch (error) {
      stop = error instanceof Error ? error.message : String(error);
      break;
    }
  }
  const completed = game.dungeon!.completedRegularQuests ?? [];
  return {
    seed,
    firstQuest,
    commands,
    game,
    start,
    stop,
    completedRuinsQuests: completed
      .map((r) => r.questId)
      .filter((id) => questLocation(id) === "ruins"),
    completedWealdQuests: completed
      .map((r) => r.questId)
      .filter((id) => questLocation(id) === "weald"),
  };
}

function expectNoBossExpeditionRegion(game: GameState) {
  if (game.dungeon!.bossExpeditionRegion)
    throw new Error("混合生产路径不应写 bossExpeditionRegion");
}

/**
 * II 幕末混合升幕来源边界（无 bossExpeditionRegion；最近击败为遗迹 Necromancer II）。
 * 明示夹具，不冒充自然 II 幕全胜。
 */
export function wealdMixedLocationActTwoReadyBoundary(
  seed: number,
  ruinsBoss: RuinsBossIdentity = "necromancer",
  wealdBoss: WealdBossIdentity = "brigandPounder",
): GameState {
  ensureCampaignBossScriptsRegistered([...packs]);
  const mixed = wealdMixedActReadyFixture(ruinsBoss, wealdBoss);
  const entry = RUINS_COMBAT_LEVELS[ruinsBoss][1]!;
  const { bossExpeditionRegion: _region, ...dungeonWithoutRegion } = mixed.dungeon!;
  void _region;
  return {
    ...mixed,
    seed,
    dungeon: {
      ...dungeonWithoutRegion,
      bossCombatThreatCeased: entry.script,
      imminentThreatDescriptionCardId: entry.description,
      faceTheThreatEmbarkPlan: {
        questId: "quest:p019",
        resolvedScriptId: entry.script,
        combatEntry: { ...getBossScript(entry.script)!.combatEntry! },
        rulesRef: ["R35", "W3"],
        layoutWiringHold: "混合 II 遗迹最近击败（明示边界）",
      },
    },
  };
}

function actAdvanceHamlet(game: GameState, log: Command[]) {
  let state = step(game, { type: "drawHamletEvent" }, log);
  state = settle(state, log);
  if (state.dungeon!.hamlet!.phase === "awaitingCaretaker") {
    state = step(state, { type: "rollHamletCaretaker" }, log);
    state = settle(state, log);
  }
  for (let i = 0; i < 100 && state.dungeon!.hamlet!.phase !== "preparationComplete"; i++) {
    if (state.dungeon!.hamlet!.phase === "awaitingCaretaker") {
      state = step(state, { type: "rollHamletCaretaker" }, log);
      state = settle(state, log);
      continue;
    }
    const actorId = currentHamletHero(state)?.id;
    const canSpeech =
      actorId &&
      state
        .dungeon!.heroes.find((h) => h.id === actorId)
        ?.heroStatId?.startsWith("hero_stat:core:h01:");
    if (canSpeech) {
      state = step(state, { type: "useHamletSkill", actorId, skill: "zealousSpeech" }, log);
      continue;
    }
    throw new Error("升幕后村庄不能通过 Zealous Speech 收束准备日");
  }
  return state;
}

export type WealdMixedLocationCrossActJourney = {
  readonly seed: number;
  readonly actTwoReady: GameState;
  readonly commands: readonly Command[];
  readonly game: GameState;
  readonly start: QuestStart;
  readonly actOneSave: ReturnType<typeof createQuestSave>;
  readonly crossActSave: ReturnType<typeof createQuestSave> | null;
  readonly manualContinuation: {
    readonly reason: string;
    readonly actOnePrefixCommandCount: number;
    readonly actOnePrefixStop: string | null;
  };
  readonly actOnePrefix: WealdMixedLocationActOnePrefix;
  readonly naturalActTwoBoundary: boolean;
};

/**
 * 混合地点自然跨幕（II→III）：
 * I 幕 split-one-each 自然前缀 + 明示 II 末混合可读回边界 + advanceRuinsAct→III tasks-v1。
 */
export function wealdMixedLocationNaturalCrossActJourney(
  seed: number,
  options: WealdNaturalActOneDriveOptions = {},
): WealdMixedLocationCrossActJourney {
  const actOnePrefix = wealdMixedLocationNaturalActOnePrefix(seed, options);
  const naturalActTwoBoundary =
    readRuinsActTransitionReadiness(actOnePrefix.game).kind === "ready" &&
    actOnePrefix.game.dungeon!.campaignLevel === 2;
  const actTwoReady = naturalActTwoBoundary
    ? actOnePrefix.game
    : wealdMixedLocationActTwoReadyBoundary(seed);
  const commands: Command[] = [...actOnePrefix.commands];
  let game = actTwoReady;

  const manualContinuation = {
    reason: naturalActTwoBoundary
      ? "I 幕自然混合链达到 II 幕末升幕可读回；跨幕段从自然末态接续"
      : `I 幕自然混合链在「${actOnePrefix.stop ?? "末态"}」停止（遗迹完成 ${actOnePrefix.completedRuinsQuests.length}、Weald 完成 ${actOnePrefix.completedWealdQuests.length}）；II→III 从 wealdMixedActReadyFixture 生产可读回边界人工接续（夹具≠自然胜仗）`,
    actOnePrefixCommandCount: actOnePrefix.commands.length,
    actOnePrefixStop: actOnePrefix.stop,
  };

  const readiness = readRuinsActTransitionReadiness(game);
  if (readiness.kind !== "ready") throw new Error(JSON.stringify(readiness));
  expectNoBossExpeditionRegion(game);

  game = step(game, { type: "advanceRuinsAct" }, commands);
  if (game.dungeon!.wealdHigherQuestOffers !== "tasks-v1")
    throw new Error("升幕后缺 wealdHigherQuestOffers:tasks-v1");
  game = actAdvanceHamlet(game, commands);
  game = step(game, { type: "offerNextQuest" }, commands);

  const campaignLevel = game.dungeon!.campaignLevel!;
  const modes = legalHamletQuestDrawModes(
    campaignLevel,
    [...packs],
    "quest:p019",
    game.dungeon!.discardedQuests ?? [],
    "tasks-v1",
  );
  const drawOpt =
    modes.find((m) => m.optionId === HAMLET_QUEST_DRAW_OPTION.ruinsTwo)?.optionId ??
    modes[0]?.optionId;
  if (!drawOpt) throw new Error(`III 级无抽选：${modes.map((m) => m.optionId).join(",")}`);

  game = step(
    game,
    { type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId: drawOpt },
    commands,
  );
  const pool = questIdsForLocationDeck(
    drawOpt.includes("weald") ? "weald" : "ruins",
    campaignLevel,
    [...packs],
    "tasks-v1",
  );
  const offers = game.dungeon!.nextQuestOffers!;
  if (!offers.every((id) => (pool as readonly string[]).includes(id)))
    throw new Error(`候选项不在 tasks-v1 III 池：${offers.join(",")}`);

  game = step(
    game,
    { type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId: offers[0]! },
    commands,
  );

  if (game.dungeon!.phase === "awaitingProvisions") {
    game = step(game, { type: "rollDungeonProvisions" }, commands);
    game = settle(game, commands, options);
  }
  if (game.dungeon!.phase !== "ready" && game.dungeon!.phase !== "awaitingProvisions")
    throw new Error(`III 出征停点：${game.dungeon!.phase}`);

  const crossActCommands = commands.slice(actOnePrefix.commands.length);
  const actOneSave = createQuestSave(
    actOnePrefix.start,
    actOnePrefix.commands,
    actOnePrefix.game,
    productionQuestSources,
  );
  const crossStart: QuestStart = {
    seed,
    questId: "quest:p019",
    mode: "standard",
    party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
    contentPacks: [...packs],
    bossEdgeRooms: true,
    wealdHigherQuestOffers: "tasks-v1",
  };
  let crossActSave: ReturnType<typeof createQuestSave> | null;
  try {
    crossActSave = createQuestSave(crossStart, crossActCommands, game, productionQuestSources);
  } catch {
    crossActSave = null;
  }
  return {
    seed,
    actTwoReady,
    commands,
    game,
    start: actOnePrefix.start,
    actOneSave,
    crossActSave,
    manualContinuation,
    actOnePrefix,
    naturalActTwoBoundary,
  };
}
