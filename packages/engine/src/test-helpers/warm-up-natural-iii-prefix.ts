import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { currentHamletHero } from "../hamlet-actions";
import { RUINS_BOSS_IDENTITIES, type RuinsBossIdentity } from "../boss/threat-description-catalog";
import { basicQuests, type BasicQuestId } from "../../../data/src/basic-quests";
import { coreParty, coreQuestSources } from "./core-quest";
import { guildQuest } from "./guild-quest";
import { ruinsActInitial, ruinsActReadyFixture } from "./ruins-act";
import { switchRuinsActPools } from "../act-transition-pools";
import { naturalParty } from "./natural-quest";
import { createQuestSave } from "../quest-save";
import type { QuestStart } from "../../../data/src/quest-save";

/** 与 II 自然重放 / hamlet-ii-embark 相同的准备日收束；不进命令日志。 */
export function preparationReadyForEmbark(game: GameState): GameState {
  const d = game.dungeon!,
    h = d.hamlet!;
  return {
    ...game,
    dungeon: {
      ...d,
      pending: null,
      hamlet: {
        ...h,
        phase: "preparationComplete",
        remainingDays: 0,
        actedHeroes: [],
        visitedBuildings: [],
        heroOrder: [],
        caretaker: null,
        blockedBuildings: h.weekBlockedBuildings ?? [],
        active: null,
      },
    },
  };
}

function step(game: GameState, command: Command, log: Command[]) {
  const result = applyCommand(game, command);
  const refused = result.events.find((e) => e.type === "commandRefused");
  if (refused) throw new Error(`${command.type}: ${refused.message}`);
  log.push(command);
  return result.state;
}

function settle(game: GameState, log: Command[]) {
  let state = game;
  while (state.dungeon!.pending) {
    state = step(
      state,
      {
        type: "resolveChoice",
        choiceId: state.dungeon!.pending!.id,
        optionId: state.dungeon!.pending!.options[0]!.id,
      },
      log,
    );
  }
  return state;
}

/** 升幕后首次抽村庄事件并收束到 preparationComplete（公开命令；不含 advanceRuinsAct 前的 hamlet）。 */
function hamletAfterActAdvance(game: GameState, log: Command[]) {
  let state = step(game, { type: "drawHamletEvent" }, log);
  settle(state, log);
  if (state.dungeon!.hamlet!.phase === "awaitingCaretaker")
    state = step(state, { type: "rollHamletCaretaker" }, log);
  while (state.dungeon!.hamlet!.phase !== "preparationComplete") {
    if (state.dungeon!.hamlet!.phase === "awaitingCaretaker") {
      state = step(state, { type: "rollHamletCaretaker" }, log);
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

function finishWarmUpTorchChoices(game: GameState, log: Command[]) {
  let state = game;
  while (state.dungeon!.pending?.id.startsWith("dungeon-warm-up-provision-torch:")) {
    const pending = state.dungeon!.pending!;
    const torch = pending.options.find((o) => o.id.startsWith("torch:"));
    const optionId = torch?.id ?? "skip";
    state = step(state, { type: "resolveChoice", choiceId: pending.id, optionId }, log);
  }
  return state;
}

function finishStartingProvisionChoices(game: GameState, log: Command[]) {
  let state = game;
  while (state.dungeon!.pending?.id.startsWith("dungeon-starting-provisions:")) {
    state = step(
      state,
      {
        type: "resolveChoice",
        choiceId: state.dungeon!.pending!.id,
        optionId: "food",
      },
      log,
    );
  }
  return state;
}

function ruinsActReadyForAdvance(level: 1 | 2, boss: RuinsBossIdentity): GameState {
  const original = ruinsActReadyFixture(level, boss);
  if (level === 1) return original;
  const pools = switchRuinsActPools(
    1,
    original.dungeon!.monsterPool!,
    original.dungeon!.trinkets!,
    original.dungeon!.heroes,
  );
  if (pools.kind !== "ready") throw new Error(pools.reason);
  return {
    ...original,
    dungeon: {
      ...original.dungeon!,
      monsterPool: pools.monsterPool,
      trinkets: pools.trinkets,
      explorationSetup: { ...original.dungeon!.explorationSetup!, dungeonLevel: 2 },
    },
  };
}

export type WarmUpNaturalIiiEmbarkJourney = {
  readonly seed: number;
  readonly boss: RuinsBossIdentity;
  readonly actReady: GameState;
  readonly alternateOffer: BasicQuestId;
  readonly commands: readonly Command[];
  readonly game: GameState;
  readonly start: QuestStart;
  readonly save: ReturnType<typeof createQuestSave> | null;
};

/** II 幕末机制夹具 + 公开 `advanceRuinsAct` 至 III 级并出征 quest:p011，含 Warm Up 改 Torch。 */
export function warmUpNaturalIiiEmbarkJourneyForBoss(
  boss: RuinsBossIdentity,
  seed = ruinsActInitial.seed,
): WarmUpNaturalIiiEmbarkJourney {
  const actReady: GameState = { ...ruinsActReadyForAdvance(2, boss), seed };
  const commands: Command[] = [];
  let game = step(actReady, { type: "advanceRuinsAct" }, commands);
  game = hamletAfterActAdvance(game, commands);
  game = step(game, { type: "offerNextQuest" }, commands);
  const offers = game.dungeon!.nextQuestOffers!;
  if (!offers.includes("quest:p011")) throw new Error(`III 候选项不含 p011：${offers.join(",")}`);
  const alternateOffer = offers.find((id) => id !== "quest:p011");
  if (!alternateOffer) throw new Error("III 候选项缺少与 p011 配对的另一张任务");
  const alternateQuest = basicQuests.find((quest) => quest.id === alternateOffer);
  if (!alternateQuest) throw new Error("候选任务不在已知目录中");

  game = step(
    game,
    {
      type: "resolveChoice",
      choiceId: game.dungeon!.pending!.id,
      optionId: "quest:p011",
    },
    commands,
  );
  if (!game.dungeon!.warmUpStartingProvisionTorchChoice)
    throw new Error("出征 p011 未写入 Warm Up 改 Torch 标记");

  game = step(game, { type: "rollDungeonProvisions" }, commands);
  game = finishStartingProvisionChoices(game, commands);
  if (!game.dungeon!.pending?.id.startsWith("dungeon-warm-up-provision-torch:"))
    throw new Error("开局补给后未进入 Warm Up 改 Torch 停点");
  game = finishWarmUpTorchChoices(game, commands);
  if (game.dungeon!.phase !== "ready" || game.dungeon!.warmUpStartingProvisionTorchChoice)
    throw new Error("Warm Up 改 Torch 未正常结束");

  const start: QuestStart = {
    seed,
    questId: "quest:p019",
    mode: "radiant",
    party: coreParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
  };
  let save: ReturnType<typeof createQuestSave> | null;
  try {
    save = createQuestSave(start, commands, game, coreQuestSources);
  } catch {
    save = null;
  }
  return { seed, boss, actReady, alternateOffer: alternateQuest.id, commands, game, start, save };
}

export function warmUpNaturalIiiEmbarkJourney(
  seedStart = 0,
  tries = 512,
): WarmUpNaturalIiiEmbarkJourney {
  let last: Error | undefined;
  for (let seed = seedStart; seed < seedStart + tries; seed++)
    for (const boss of RUINS_BOSS_IDENTITIES) {
      try {
        return warmUpNaturalIiiEmbarkJourneyForBoss(boss, seed);
      } catch (error) {
        last = error instanceof Error ? error : new Error(String(error));
      }
    }
  throw last ?? new Error(`未找到 III 升幕后 offer 含 p011 的 seed（${seedStart}+）`);
}

/** 无 Warm Up 的 III 级候选项回归：同升幕与村庄收束，选非 p011 时不写改 Torch 标记。 */
export function warmUpFreeIiiEmbarkChoice(
  journey: WarmUpNaturalIiiEmbarkJourney,
  questId: BasicQuestId,
): GameState {
  const commands: Command[] = [];
  let game = step(journey.actReady, { type: "advanceRuinsAct" }, commands);
  game = hamletAfterActAdvance(game, commands);
  game = step(game, { type: "offerNextQuest" }, commands);
  if (!game.dungeon!.nextQuestOffers!.includes(questId)) throw new Error(`候选项不含 ${questId}`);
  return step(
    game,
    {
      type: "resolveChoice",
      choiceId: game.dungeon!.pending!.id,
      optionId: questId,
    },
    commands,
  );
}

/** guildQuest 自然 I 级前缀存档；与 Warm Up SPECIAL 正交回归。 */
export function warmUpNaturalIiiGuildPrefix(seed = 11) {
  return guildQuest(coreQuestSources, seed);
}

export const warmUpNaturalIiiNaturalPartyStart = (seed: number): QuestStart => ({
  seed,
  questId: "quest:p001",
  mode: "radiant",
  party: naturalParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
});
