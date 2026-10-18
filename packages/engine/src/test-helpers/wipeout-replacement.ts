import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { endAfterCasualties } from "../encounter";
import { currentHamletHero } from "../hamlet-actions";
import { createQuestSave } from "../quest-save";
import { coreQuestSources } from "./core-quest";
import type { CoreQuestSources } from "../dungeon-quest-entry";
import { naturalParty, naturalQuest } from "./natural-quest";
import { replacementStep } from "./replacement";

/** 正式已核实额外替补（开局四人死后）：赏金猎人、瘟疫医生、盗墓者、神秘学者。 */
export const VERIFIED_EXTRA_IDS = [
  "hero_stat:p005:front",
  "hero_stat:p013:front",
  "hero_stat:p017:front",
  "hero_stat:p019:front",
] as const;

/** 机制夹具：在已部署战斗态上强制标记死者后准备替补。不冒充自然击杀或正式存档日志。 */
export function prepareVerifiedWipeoutReplacements(battleState: GameState): {
  awaiting: GameState;
  prepared: GameState;
  commands: Command[];
} {
  const boundary: GameState = {
    ...battleState,
    dungeon: {
      ...battleState.dungeon!,
      battleCatalog: coreQuestSources.catalog,
      buildingLevels: { stagecoach: 3 },
      waitingHeroTokens: 4,
    },
    battle: {
      ...battleState.battle!,
      entities: battleState.battle!.entities.map((e) =>
        e.side === "hero" ? { ...e, dead: true, wounds: e.life! } : e,
      ),
    },
  };
  const ended = endAfterCasualties({ state: boundary, events: [] })!;
  let game = replacementStep(ended.state, { type: "ping", message: "登记机制夹具死者" });
  while (game.dungeon!.deathTrinketChoice)
    game = replacementStep(game, {
      type: "resolveChoice",
      choiceId: game.dungeon!.deathTrinketChoice!.id,
      optionId: "discard",
    });
  game = replacementStep(game, { type: "finishDungeonBattle" });
  const awaiting = game;
  const commands: Command[] = [];
  const step = (command: Command) => {
    const result = applyCommand(game, command);
    const refused = result.events.find((e) => e.type === "commandRefused");
    if (refused) throw new Error(`${command.type}: ${refused.message}`);
    game = result.state;
    commands.push(command);
  };
  for (const id of VERIFIED_EXTRA_IDS) {
    step({ type: "prepareReplacementHero" });
    step({
      type: "resolveChoice",
      choiceId: game.dungeon!.replacementPreparation!.choice.id,
      optionId: id,
    });
    step({
      type: "resolveChoice",
      choiceId: game.dungeon!.replacementPreparation!.choice.id,
      optionId: "finish-upgrades",
    });
    while (game.dungeon!.replacementPreparation)
      step({
        type: "resolveChoice",
        choiceId: game.dungeon!.replacementPreparation!.choice.id,
        optionId: game.dungeon!.replacementPreparation!.choice.options[0]!.id,
      });
  }
  return { awaiting, prepared: game, commands };
}

function prepareFourVerifiedExtras(game: GameState): {
  prepared: GameState;
  commands: Command[];
} {
  const commands: Command[] = [];
  let state = game;
  const step = (command: Command) => {
    const result = applyCommand(state, command);
    const refused = result.events.find((e) => e.type === "commandRefused");
    if (refused) throw new Error(`${command.type}: ${refused.message}`);
    state = result.state;
    commands.push(command);
  };
  for (const id of VERIFIED_EXTRA_IDS) {
    step({ type: "prepareReplacementHero" });
    step({
      type: "resolveChoice",
      choiceId: state.dungeon!.replacementPreparation!.choice.id,
      optionId: id,
    });
    step({
      type: "resolveChoice",
      choiceId: state.dungeon!.replacementPreparation!.choice.id,
      optionId: "finish-upgrades",
    });
    while (state.dungeon!.replacementPreparation)
      step({
        type: "resolveChoice",
        choiceId: state.dungeon!.replacementPreparation!.choice.id,
        optionId: state.dungeon!.replacementPreparation!.choice.options[0]!.id,
      });
  }
  return { prepared: state, commands };
}

/**
 * 自然公开命令全灭路径（非 dead:true 夹具）：
 * Fundraiser seed2 不捐献攒金 → 驿站 I→II→III（余额4）→ 下一任务 Scout Ahead →
 * preferWipeout 浪费行动至 heroesDefeated → finishDungeonBattle → 准备四名已核实额外。
 * 整段命令可 createQuestSave / loadQuestSave。
 */
export function naturalWipeoutReplacementPath(sources: CoreQuestSources = coreQuestSources) {
  const fund = naturalQuest(2, "quest:p003", false, sources);
  const fundCommands: Command[] = fund.commands.map((c, i) =>
    i === fund.commands.length - 1 && c.type === "resolveChoice" ? { ...c, optionId: "give:0" } : c,
  );
  const start = {
    seed: 2,
    questId: "quest:p003" as const,
    mode: "radiant" as const,
    party: naturalParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
  };
  let game = fund.initial;
  const commands: Command[] = [];
  const step = (command: Command) => {
    const result = applyCommand(game, command);
    const refused = result.events.find((e) => e.type === "commandRefused");
    if (refused) throw new Error(`${command.type}: ${refused.message}`);
    commands.push(command);
    game = result.state;
    return result;
  };
  for (const command of fundCommands) step(command);
  let result = step({ type: "beginReturnToHamlet" });
  while (result.pendingChoice)
    result = step({
      type: "resolveChoice",
      choiceId: result.pendingChoice.id,
      optionId: result.pendingChoice.options[0]!.id,
    });
  step({ type: "finishReturnToHamlet" });
  step({ type: "upgradeHamletBuilding", building: "stagecoach" });
  step({ type: "upgradeHamletBuilding", building: "stagecoach" });
  step({ type: "drawHamletEvent" });
  if (game.dungeon!.pending) {
    const skip =
      game.dungeon!.pending.options.find((o) => o.id === "skip") ??
      game.dungeon!.pending.options[0]!;
    step({ type: "resolveChoice", choiceId: game.dungeon!.pending.id, optionId: skip.id });
  }
  while (game.dungeon!.hamlet!.phase !== "preparationComplete") {
    if (game.dungeon!.hamlet!.phase === "awaitingCaretaker") {
      step({ type: "rollHamletCaretaker" });
      continue;
    }
    const actorId = currentHamletHero(game)?.id;
    const canSpeech =
      actorId &&
      game.dungeon!.heroes.find((h) => h.id === actorId)?.heroStatId?.startsWith("hero_stat:p001");
    if (!canSpeech) throw new Error("当前村庄不能通过 Zealous Speech 结束准备日");
    step({ type: "useHamletSkill", actorId, skill: "zealousSpeech" });
  }
  step({ type: "offerNextQuest" });
  if (!game.dungeon!.nextQuestOffers?.includes("quest:p001"))
    throw new Error(`未抽到 Scout Ahead：${game.dungeon!.nextQuestOffers?.join(",")}`);
  step({
    type: "resolveChoice",
    choiceId: game.dungeon!.pending!.id,
    optionId: "quest:p001",
  });
  const wipe = naturalQuest(2, "quest:p001", false, sources, 2, {
    continueFrom: game,
    preferWipeout: true,
  });
  commands.push(...wipe.commands);
  game = wipe.state;
  if (game.dungeon!.phase !== "awaitingReplacement")
    throw new Error(`期望 awaitingReplacement，实为 ${game.dungeon!.phase}`);
  const awaiting = game;
  const prep = prepareFourVerifiedExtras(game);
  commands.push(...prep.commands);
  game = prep.prepared;
  const save = createQuestSave(start, commands, game, sources);
  return {
    start,
    commands,
    awaiting,
    prepared: game,
    save,
    sources,
  };
}
