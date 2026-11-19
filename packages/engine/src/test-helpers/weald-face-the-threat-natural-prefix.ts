import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import type { QuestParty } from "../dungeon-quest-entry";
import type { BasicQuestId } from "../../../data/src/basic-quests";
import { drawInitialQuestOffers } from "../initial-quest-draw";
import { currentHamletHero, hamletActionOptions } from "../hamlet-actions";
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
import { createCampaignQuest } from "../campaign-entry";
import type { HamletQuestDrawOptionId } from "../hamlet-location-quest-draw";
import { readActiveWealdStygianRoom } from "../weald-stygian-room-effects";
import { ensureHagIBossScriptRegistered } from "../expansions/weald/boss/hag-i";
import { ensurePounderIBossScriptRegistered } from "../expansions/weald/boss/pounder-i";
import { ensureShriekerIBossScriptRegistered } from "../expansions/weald/boss/shrieker-i";
import { ensureCampaignBossScriptsRegistered } from "../expansions/register";
import { wealdActReadyFixture } from "./weald-act";
import { pickNaturalReplacementOptionId } from "./natural-replacement";
import { PROVISION_EFFECTS } from "../provision-use";
import { heroSkillSlotCount, ownedHeroSkills } from "../hero-loadout";
import { blacksmithOptions } from "../hamlet-blacksmith";

const packs = ["core", "weald"] as const;
const defaultDrawMode = "hamlet-quest-draw:ruins-two" as const;
const hamletHealFirstServiceIds = ["heal10", "heal5", "tavern6", "tavern3"] as const;
const wealdBossRoomIds = new Set(["room:weald:p010", "room:weald:p011", "room:weald:p012"]);

/** 第十四刀：生产路径 I 幕自然驱动选项；缺省与第十三刀回归矩阵一致。 */
export type WealdNaturalActOneDriveOptions = {
  readonly party?: QuestParty;
  readonly combatProvisions?: boolean;
  readonly currentCampaign?: boolean;
  readonly radiant?: boolean;
  readonly skillFallback?: boolean;
  readonly handleDeaths?: boolean;
  /** 玩家策略战斗打分（R-190 旁路）；默认关闭。 */
  readonly survival?: boolean;
  readonly restThreshold?: number;
  /** 村庄优先可治疗建筑，再回退 Zealous Speech／建筑服务。 */
  readonly hamletHealFirst?: boolean;
  /** V1：只在任一英雄伤口或压力达到阈值时才优先治疗，空出天数给公会／铁匠。 */
  readonly hamletSmartHeal?: boolean;
  readonly hamletHealThreshold?: number;
  /** V1：任一英雄压力较高时优先酒馆减压，再治疗伤口。 */
  readonly hamletStressFirst?: boolean;
  /** V1：本幕两趟普通任务完成后按 Boss 前准备处理，优先把队伍治满。 */
  readonly hamletBossPrep?: boolean;
  /** 英雄有 4 XP＋2 金且未满 III 时优先 visitGuild 升英雄等级（V1）。 */
  readonly hamletGuildLevels?: boolean;
  /** 只让这些英雄优先使用公会（同一天公会只能被一名英雄访问）。 */
  readonly guildPriorityHeroIds?: readonly string[];
  /** 村庄优先用铁匠把已装备技能升到当前等级（1 金/次，V1）。 */
  readonly hamletBlacksmith?: boolean;
  /**
   * 按 hamlet.heroOrder 遍历行动英雄，对带目标村庄技能按 hero-0..3 固定顺序选首个合法目标
   *（对照 plague 医生 Experimental Vapours 核准场景；R-190 旁路）。
   */
  readonly hamletOrderedSkillTargets?: boolean;
  /** 替补优先驿站复活，保留等待英雄代币（R-147–149）。 */
  readonly preferStagecoachRevival?: boolean;
  /** 显式 Weald 生产房间命令版本；默认关闭。 */
  readonly wealdProductionRooms?: boolean;
  /** 正式 Stygian 生产路径（R-272：tasks-v1、stygianRoomRules:full、0 起始金）。 */
  readonly stygian?: boolean;
  /** 首趟／续任务地点抽选；缺省 ruins-two。 */
  readonly drawMode?: HamletQuestDrawOptionId;
};

/** 生产路径 Face the Threat 开局定威胁（显式版本标记；不经 chooseNextQuest 隐式补齐）。 */
export const WEALD_PRODUCTION_ESTABLISH_THREAT: Command = {
  type: "establishImminentThreat",
  locationBosses: true,
  locationSources: true,
  pounderDungeonThreats: true,
  pounderHamletThreats: true,
  pounderBossBattles: true,
  shriekerBossBattles: true,
  wealdHigherBosses: true,
};

function step(game: GameState, command: Command, log: Command[]) {
  const result = applyCommand(game, command);
  const refused = result.events.find((e) => e.type === "commandRefused");
  if (refused) throw new Error(`${command.type}: ${refused.message}`);
  log.push(command);
  return result.state;
}

function settle(game: GameState, log: Command[], options: WealdNaturalActOneDriveOptions = {}) {
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
          optionId: pickNaturalReplacementOptionId(
            d.replacementPreparation.choice,
            options.preferStagecoachRevival === true,
          ),
        },
        log,
      );
      continue;
    }
    if (d.pending?.id.startsWith("hamlet-guild:")) {
      const pick =
        d.pending.options.find((o) => o.id === "upgrade-hero") ??
        d.pending.options.find((o) => o.id === "leave")!;
      state = step(
        state,
        { type: "resolveChoice", choiceId: d.pending.id, optionId: pick.id },
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

const hamletSkillTargetOrder = ["hero-0", "hero-1", "hero-2", "hero-3"] as const;

/** 公会升级后技能槽变宽；在下次出征前补满已拥有技能（R-051）。 */
function normalizeSkillSlots(game: GameState, log: Command[]) {
  let state = game;
  for (const hero of state.dungeon!.heroes) {
    if (hero.dead) continue;
    const slots = heroSkillSlotCount(hero.level!);
    const currentSkillIds = hero.skillIds ?? [];
    if (currentSkillIds.length === slots) continue;
    const owned = ownedHeroSkills(hero, state.dungeon!.battleCatalog!);
    if (!owned) continue;
    const equipped = new Set(currentSkillIds);
    const additions = owned
      .filter((skill) => !equipped.has(skill.id))
      .slice(0, slots - currentSkillIds.length)
      .map((skill) => skill.id);
    const skillIds = [...currentSkillIds, ...additions];
    if (skillIds.length !== slots) continue;
    state = step(state, { type: "setEquippedSkills", actorId: hero.id, skillIds }, log);
  }
  return state;
}

function pickHamletActionCommand(
  state: GameState,
  options: WealdNaturalActOneDriveOptions,
): Command | undefined {
  if (options.hamletGuildLevels) {
    const hero = currentHamletHero(state);
    const d = state.dungeon!;
    const priority = options.guildPriorityHeroIds;
    const eligible = priority?.length
      ? priority.filter((id) => {
          const candidate = d.heroes.find((entry) => entry.id === id);
          return (
            candidate && !candidate.dead && (candidate.level ?? 1) < 3 && (candidate.xp ?? 0) >= 4
          );
        })
      : [];
    const top = eligible[0];
    const allowed = !priority?.length || !top || hero?.id === top;
    if (allowed && hero && (hero.xp ?? 0) >= 4 && d.gold >= 2 && hero.level! < 3) {
      const trial: Command = { type: "visitGuild", actorId: hero.id };
      if (!applyCommand(state, trial).events.some((e) => e.type === "commandRefused")) return trial;
    }
  }
  if (options.hamletOrderedSkillTargets) {
    const hamlet = state.dungeon!.hamlet!;
    const actingIds = hamlet.heroOrder.filter((id) => !hamlet.actedHeroes?.includes(id));
    for (const actorId of actingIds) {
      for (const targetId of hamletSkillTargetOrder) {
        for (const skill of ["experimentalVapours", "darkRitual"] as const) {
          const trial: Command = {
            type: "useHamletSkill",
            actorId,
            skill,
            targetId,
          };
          if (!applyCommand(state, trial).events.some((e) => e.type === "commandRefused"))
            return trial;
        }
      }
    }
  }
  const bossPrep =
    options.hamletBossPrep === true &&
    (state.dungeon!.campaignLevel ?? 1) >= 2 &&
    (state.dungeon!.completedRegularQuests ?? []).filter(
      (quest) => quest.campaignLevel === state.dungeon!.campaignLevel,
    ).length >= 2;
  const needsHeal =
    bossPrep ||
    !options.hamletSmartHeal ||
    state.dungeon!.heroes.some(
      (hero) =>
        !hero.dead &&
        ((hero.wounds ?? 0) >= (options.hamletHealThreshold ?? 6) ||
          (hero.stress ?? 0) >= (options.hamletHealThreshold ?? 6)),
    );
  if (options.hamletStressFirst) {
    const stressHigh = state.dungeon!.heroes.some((hero) => !hero.dead && (hero.stress ?? 0) >= 7);
    const actor = currentHamletHero(state);
    if (stressHigh && actor) {
      const speech: Command = { type: "useHamletSkill", actorId: actor.id, skill: "zealousSpeech" };
      if (!applyCommand(state, speech).events.some((e) => e.type === "commandRefused"))
        return speech;
    }
  }
  if (options.hamletHealFirst && needsHeal) {
    const stressHigh =
      options.hamletStressFirst &&
      state.dungeon!.heroes.some((hero) => !hero.dead && (hero.stress ?? 0) >= 8);
    const serviceOrder = stressHigh
      ? (["tavern6", "tavern3", "heal10", "heal5"] as const)
      : hamletHealFirstServiceIds;
    const buildingOptions = hamletActionOptions(state);
    const ordered = [
      ...buildingOptions.filter((option) => {
        if (option.command.type !== "visitHamletBuilding") return false;
        const serviceId = option.command.serviceId;
        return (serviceOrder as readonly string[]).includes(serviceId);
      }),
      ...buildingOptions,
    ];
    const healFirst = ordered
      .map((option) => option.command)
      .find(
        (command) => !applyCommand(state, command).events.some((e) => e.type === "commandRefused"),
      );
    if (healFirst) return healFirst;
  }
  if (options.hamletBlacksmith) {
    const command = blacksmithOptions(state)[0]?.command;
    if (command) {
      if (!applyCommand(state, command).events.some((e) => e.type === "commandRefused"))
        return command;
    }
  }
  const actorId = currentHamletHero(state)?.id;
  if (!actorId) return undefined;
  const speech: Command = { type: "useHamletSkill", actorId, skill: "zealousSpeech" };
  if (!applyCommand(state, speech).events.some((e) => e.type === "commandRefused")) return speech;
  const service = hamletActionOptions(state)
    .map((o) => o.command)
    .find((c) => c.type === "visitHamletBuilding");
  if (service) return service;
  if (options.skillFallback) {
    return hamletActionOptions(state)
      .map((o) => o.command)
      .find((c) => c.type === "useHamletSkill");
  }
  return undefined;
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
  if (state.dungeon!.bossQuestVictory) return state;
  return prepareHamletDay(state, log, options);
}

function prepareHamletDay(
  game: GameState,
  log: Command[],
  options: WealdNaturalActOneDriveOptions,
) {
  let state = game;
  state = step(state, { type: "drawHamletEvent" }, log);
  state = settle(state, log, options);
  for (let i = 0; i < 100 && state.dungeon!.hamlet!.phase !== "preparationComplete"; i++) {
    if (state.dungeon!.hamlet!.phase === "awaitingCaretaker") {
      state = step(state, { type: "rollHamletCaretaker" }, log);
      state = settle(state, log, options);
      continue;
    }
    const hamletCommand = pickHamletActionCommand(state, options);
    if (!hamletCommand) throw new Error("村庄无可用建筑服务");
    state = step(state, hamletCommand, log);
    state = settle(state, log, options);
  }
  if (state.dungeon!.hamlet!.phase !== "preparationComplete") throw new Error("村庄行动循环超限");
  return state;
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
      state.dungeon!.heroes.find((h) => h.id === actorId)?.heroStatId?.startsWith("hero_stat:p001");
    if (canSpeech) {
      state = step(state, { type: "useHamletSkill", actorId, skill: "zealousSpeech" }, log);
      continue;
    }
    throw new Error("升幕后村庄不能通过 Zealous Speech 收束准备日");
  }
  return state;
}

function expectProductionMarkers(game: GameState) {
  const d = game.dungeon!;
  if (!d.locationBossThreats) throw new Error("缺 locationBossThreats");
  if (!d.wealdHigherBosses) throw new Error("缺 wealdHigherBosses");
  if (!d.bossLocationSources) throw new Error("缺 bossLocationSources");
  if (d.campaignLevel! >= 2 && d.wealdHigherQuestOffers !== "tasks-v1")
    throw new Error("II+ 缺 wealdHigherQuestOffers:tasks-v1");
}

/** I 幕末生产可读回边界（明示夹具边界，不是自然胜仗验收）；仅用于升幕段重放起点。 */
export function wealdFaceTheThreatActOneReadyBoundary(seed: number): GameState {
  ensureHagIBossScriptRegistered();
  ensurePounderIBossScriptRegistered();
  ensureShriekerIBossScriptRegistered();
  ensureCampaignBossScriptsRegistered([...packs]);
  return { ...wealdActReadyFixture(1, "hag"), seed };
}

export type WealdFaceTheThreatActOnePrefix = {
  readonly seed: number;
  readonly firstQuest: string;
  readonly commands: readonly Command[];
  readonly game: GameState;
  readonly start: QuestStart;
  readonly stop: string | null;
  readonly hagVictory: boolean;
  /** I 幕任意 Weald Boss（Hag／Pounder／Shrieker）自然全胜；回村与升幕可读回另由旅程判定。 */
  readonly wealdBossVictory: boolean;
  /** Stygian 模式下目击的 Weald p001–p009 替换 id（R-036：p010–p012 无替换）。 */
  readonly stygianOrdinaryRoomWitnesses?: readonly string[];
  readonly bossRoomWithoutStygianWitness?: boolean;
};

function createProductionFaceTheThreatStart(
  seed: number,
  firstQuest: BasicQuestId,
  options: WealdNaturalActOneDriveOptions,
): { readonly game: GameState; readonly start: QuestStart } {
  const drawMode =
    options.drawMode ?? (options.stygian ? HAMLET_QUEST_DRAW_OPTION.wealdTwo : defaultDrawMode);
  const stygian = options.stygian === true;
  const mode = stygian ? "stygian" : options.radiant ? "radiant" : "standard";
  const party = options.party ?? coreParty;
  const start: QuestStart = {
    seed,
    questId: firstQuest,
    mode,
    party: party.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
    contentPacks: [...packs],
    bossEdgeRooms: true,
    initialQuestDrawMode: drawMode,
    ...(stygian || options.currentCampaign
      ? { stygianRoomRules: "full" as const, wealdHigherQuestOffers: "tasks-v1" as const }
      : {}),
  };
  const game =
    stygian || options.currentCampaign
      ? createCampaignQuest(
          seed,
          firstQuest,
          mode,
          party,
          productionQuestSources,
          [...packs],
          drawMode,
          "tasks-v1",
        )
      : createCoreDungeonQuest(
          seed,
          firstQuest,
          mode,
          party,
          productionQuestSources,
          true,
          null,
          [...packs],
          drawMode,
        );
  return { game, start };
}

/** 自然 I 幕：生产定威胁 → 村庄循环出征（与 hag-i-campaign 同策略）；不宣称全胜。 */
export function useCombatProvisions(state: GameState): Command | undefined {
  const battle = state.battle!;
  const heroes = battle.entities.filter((hero) => hero.side === "hero" && !hero.dead);
  for (const provision of battle.provisions ?? []) {
    for (const effect of PROVISION_EFFECTS[provision.face]) {
      const target = [...heroes]
        .sort((a, b) => b.wounds - a.wounds)
        .find((hero) => {
          switch (effect) {
            case "heal":
              return hero.wounds >= Math.max(2, (hero.life ?? 0) - 5);
            case "clearBleed":
              return (hero.bleed?.length ?? 0) > 0;
            case "clearBlight":
              return (hero.blight?.length ?? 0) > 0;
            case "reduceStress":
              return (hero.stress ?? 0) >= 7;
            case "raiseLight":
              return battle.light < 4;
          }
        });
      if (!target) continue;
      const command = {
        type: "useProvision",
        provisionId: provision.id,
        targetId: target.id,
        effect,
      } as const;
      if (!applyCommand(state, command).events.some((e) => e.type === "commandRefused"))
        return command;
    }
  }
}

function naturalQuestOptionsForActOne(options: WealdNaturalActOneDriveOptions) {
  return {
    ...(options.handleDeaths ? { handleDeaths: true as const } : {}),
    ...(options.preferStagecoachRevival ? { preferStagecoachRevival: true as const } : {}),
    ...(options.survival
      ? { survival: true as const, restThreshold: options.restThreshold ?? 6 }
      : {}),
    ...(options.wealdProductionRooms ? CURRENT_WEALD_ROOM_VERSIONS : {}),
    ...(options.combatProvisions ? { heroAction: useCombatProvisions } : {}),
    ...(options.radiant ? { radiantScouting: true } : {}),
  };
}

/** 自然 I 幕末是否可读回升幕（须 Boss 胜利、回村完成且生产标记齐全）。 */
export function wealdFaceTheThreatNaturalActOneAdvanceReady(game: GameState): boolean {
  return readRuinsActTransitionReadiness(game).kind === "ready";
}

export function wealdFaceTheThreatNaturalActOnePrefix(
  seed: number,
  options: WealdNaturalActOneDriveOptions = {},
): WealdFaceTheThreatActOnePrefix {
  ensureHagIBossScriptRegistered();
  ensurePounderIBossScriptRegistered();
  ensureShriekerIBossScriptRegistered();
  ensureCampaignBossScriptsRegistered([...packs]);
  const drawMode =
    options.drawMode ?? (options.stygian ? HAMLET_QUEST_DRAW_OPTION.wealdTwo : defaultDrawMode);
  const firstQuest = drawInitialQuestOffers(seed, [...packs], drawMode).offers[0]! as BasicQuestId;
  const { game: initial, start } = createProductionFaceTheThreatStart(seed, firstQuest, options);
  let game = initial;
  const commands: Command[] = [];
  const stygianOrdinaryRoomWitnesses = new Set<string>();
  let bossRoomWithoutStygianWitness = false;
  game = step(
    game,
    options.currentCampaign
      ? {
          ...WEALD_PRODUCTION_ESTABLISH_THREAT,
          chainCrowding: true,
          shriekerProvisionSkipRolls: true,
        }
      : WEALD_PRODUCTION_ESTABLISH_THREAT,
    commands,
  );
  if (game.dungeon!.unregisteredImminentThreatHold)
    throw new Error(game.dungeon!.unregisteredImminentThreatHold);

  let stop: string | null = null;
  for (let trip = 0; trip < 3 && !stop; trip++) {
    const questId = game.dungeon!.questDistribution!.questId;
    const run = naturalQuest(seed, questId as typeof firstQuest, true, productionQuestSources, 2, {
      continueFrom: game,
      ...naturalQuestOptionsForActOne(options),
      ...(options.stygian
        ? {
            observe: (state) => {
              const cardId = state.dungeon?.roomCards?.active?.cardId;
              if (!cardId?.startsWith("room:weald:")) return;
              const replacement = readActiveWealdStygianRoom(state.dungeon!);
              if (wealdBossRoomIds.has(cardId)) {
                if (replacement === undefined) bossRoomWithoutStygianWitness = true;
                return;
              }
              if (replacement?.id.startsWith("stygian_room:weald:p00")) {
                stygianOrdinaryRoomWitnesses.add(replacement.id);
              }
            },
          }
        : {}),
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
    if (trip === 2) break;
    game = normalizeSkillSlots(game, commands);
    try {
      game = step(game, { type: "offerNextQuest" }, commands);
      if (game.dungeon!.pending?.id.startsWith("hamlet-quest-draw:")) {
        game = step(
          game,
          { type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId: drawMode },
          commands,
        );
      }
      const offers = game.dungeon!.nextQuestOffers!;
      const pick = offers[0]!;
      game = step(
        game,
        {
          type: "resolveChoice",
          choiceId: game.dungeon!.pending!.id,
          optionId: pick,
          ...(options.currentCampaign ? { bossEdgeRooms: true } : {}),
        },
        commands,
      );
    } catch (error) {
      stop = error instanceof Error ? error.message : String(error);
      break;
    }
  }
  const wealdBossVictory =
    (game.dungeon!.defeatedWealdBossIdentities?.length ?? 0) > 0 &&
    game.dungeon!.bossQuestVictory === true;
  const hagVictory =
    game.dungeon!.defeatedWealdBossIdentities?.includes("hag") === true &&
    game.dungeon!.bossQuestVictory === true;
  return {
    seed,
    firstQuest,
    commands,
    game,
    start,
    stop,
    hagVictory,
    wealdBossVictory,
    ...(options.stygian
      ? {
          stygianOrdinaryRoomWitnesses: [...stygianOrdinaryRoomWitnesses],
          bossRoomWithoutStygianWitness,
        }
      : {}),
  };
}

export type WealdFaceTheThreatCrossActJourney = {
  readonly seed: number;
  readonly actOneReady: GameState;
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
  readonly actOnePrefix: WealdFaceTheThreatActOnePrefix;
  /** true 表示跨幕段从自然 I 幕末重放，而非 wealdActReadyFixture。 */
  readonly naturalActOneBoundary: boolean;
};

/**
 * 自然跨幕 Face the Threat（生产路径）：
 * I 幕自然前缀（含 establishImminentThreat）+ 人工接续 I 幕末可读回边界 + 公开 advanceRuinsAct→II tasks-v1 出征。
 */
export function wealdFaceTheThreatNaturalCrossActJourney(
  seed: number,
  options: WealdNaturalActOneDriveOptions = {},
): WealdFaceTheThreatCrossActJourney {
  const actOnePrefix = wealdFaceTheThreatNaturalActOnePrefix(seed, options);
  const naturalActOneBoundary =
    actOnePrefix.wealdBossVictory && wealdFaceTheThreatNaturalActOneAdvanceReady(actOnePrefix.game);
  const actOneReady = naturalActOneBoundary
    ? actOnePrefix.game
    : wealdFaceTheThreatActOneReadyBoundary(seed);
  const commands: Command[] = [...actOnePrefix.commands];
  let game = actOneReady;

  const manualContinuation = {
    reason: naturalActOneBoundary
      ? "I 幕 Weald Boss 自然全胜且升幕可读回；跨幕段从自然命令日志末态接续（无 wealdActReadyFixture）"
      : actOnePrefix.wealdBossVictory
        ? "I 幕击败 Weald Boss 但升幕可读回未满足（回村／摘要／威胁字段）；升幕段仍从 wealdActReadyFixture(1,hag) 人工接续"
        : `I 幕自然链在「${actOnePrefix.stop ?? "末态"}」停止；升幕段从 wealdActReadyFixture(1,hag) 生产可读回边界人工接续`,
    actOnePrefixCommandCount: actOnePrefix.commands.length,
    actOnePrefixStop: actOnePrefix.stop,
  };

  const readiness = readRuinsActTransitionReadiness(game);
  if (readiness.kind !== "ready") throw new Error(JSON.stringify(readiness));

  game = step(game, { type: "advanceRuinsAct" }, commands);
  expectProductionMarkers(game);
  game = naturalActOneBoundary
    ? prepareHamletDay(game, commands, options)
    : actAdvanceHamlet(game, commands);
  game = normalizeSkillSlots(game, commands);
  game = step(game, { type: "offerNextQuest" }, commands);

  const campaignLevel = game.dungeon!.campaignLevel!;
  if (game.dungeon!.wealdHigherQuestOffers !== "tasks-v1")
    throw new Error("升幕后缺 wealdHigherQuestOffers:tasks-v1");

  const modes = legalHamletQuestDrawModes(
    campaignLevel,
    [...packs],
    "quest:p019",
    game.dungeon!.discardedQuests ?? [],
    "tasks-v1",
  );
  const wealdOpt =
    modes.find((m) => m.optionId === HAMLET_QUEST_DRAW_OPTION.wealdTwo)?.optionId ??
    modes.find((m) => m.optionId.includes("weald"))?.optionId;
  if (!wealdOpt) throw new Error(`II 级无 Weald 抽选：${modes.map((m) => m.optionId).join(",")}`);

  game = step(
    game,
    { type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId: wealdOpt },
    commands,
  );
  const wealdIi = questIdsForLocationDeck("weald", campaignLevel, [...packs], "tasks-v1");
  const offers = game.dungeon!.nextQuestOffers!;
  if (!offers.every((id) => (wealdIi as readonly string[]).includes(id)))
    throw new Error(`候选项不在 tasks-v1 II 池：${offers.join(",")}`);

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
    throw new Error(`II 出征停点：${game.dungeon!.phase}`);

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
  };
  let crossActSave: ReturnType<typeof createQuestSave> | null;
  if (naturalActOneBoundary) {
    crossActSave = createQuestSave(actOnePrefix.start, commands, game, productionQuestSources);
  } else {
    try {
      crossActSave = createQuestSave(crossStart, crossActCommands, game, productionQuestSources);
    } catch {
      crossActSave = null;
    }
  }
  return {
    seed,
    actOneReady,
    commands,
    game,
    start: actOnePrefix.start,
    actOneSave,
    crossActSave,
    manualContinuation,
    actOnePrefix,
    naturalActOneBoundary,
  };
}

export type WealdNaturalActTwoJourney = {
  readonly seed: number;
  readonly commands: readonly Command[];
  readonly game: GameState;
  readonly stop: string | null;
  readonly actTwoSave: ReturnType<typeof createQuestSave> | null;
  readonly actOneJourney: WealdFaceTheThreatCrossActJourney;
};

/**
 * V1：I 幕自然全胜 → II 幕出征，再跑两趟 II 级普通任务 + p019 II 级 Boss，
 * 回村后执行 advanceRuinsAct 进入 III。仍只走公开命令；不筛胜负。
 */
export function wealdNaturalActTwoJourney(
  seed: number,
  options: WealdNaturalActOneDriveOptions = {},
): WealdNaturalActTwoJourney {
  const actOneJourney = wealdFaceTheThreatNaturalCrossActJourney(seed, options);
  let game = actOneJourney.game;
  const commands: Command[] = [...actOneJourney.commands];
  let stop: string | null = null;

  for (let trip = 0; trip < 3 && !stop; trip++) {
    const questId = game.dungeon!.questDistribution!.questId as BasicQuestId;
    const run = naturalQuest(seed, questId, true, productionQuestSources, 2, {
      continueFrom: game,
      ...naturalQuestOptionsForActOne(options),
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
    if (trip === 2) break;
    game = normalizeSkillSlots(game, commands);
    try {
      game = step(game, { type: "offerNextQuest" }, commands);
      const drawMode = HAMLET_QUEST_DRAW_OPTION.wealdTwo;
      if (game.dungeon!.pending?.id.startsWith("hamlet-quest-draw:")) {
        game = step(
          game,
          { type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId: drawMode },
          commands,
        );
      }
      const offers = game.dungeon!.nextQuestOffers!;
      game = step(
        game,
        {
          type: "resolveChoice",
          choiceId: game.dungeon!.pending!.id,
          optionId: offers[0]!,
          ...(options.currentCampaign ? { bossEdgeRooms: true } : {}),
        },
        commands,
      );
    } catch (error) {
      stop = error instanceof Error ? error.message : String(error);
    }
  }

  if (!stop && game.dungeon!.bossQuestVictory && game.dungeon!.campaignLevel === 2) {
    const readiness = readRuinsActTransitionReadiness(game);
    if (readiness.kind === "ready") {
      game = step(game, { type: "advanceRuinsAct" }, commands);
      game = prepareHamletDay(game, commands, options);
    } else {
      stop = readiness.reason;
    }
  } else if (!stop) {
    stop = game.dungeon!.bossQuestVictory ? "II 幕 Boss 未结算" : "II 幕未完成";
  }

  let actTwoSave: ReturnType<typeof createQuestSave> | null = null;
  if (!stop) {
    try {
      actTwoSave = createQuestSave(actOneJourney.start, commands, game, productionQuestSources);
    } catch {
      actTwoSave = null;
    }
  }

  return {
    seed,
    commands,
    game,
    stop,
    actTwoSave,
    actOneJourney,
  };
}
