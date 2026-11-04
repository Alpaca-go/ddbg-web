import { applyCommand } from "../command";
import type { Command, GameEvent, PendingChoice } from "../command";
import type { CoreQuestSources } from "../dungeon-quest-entry";
import type { BasicQuestId } from "../../../data/src/basic-quests";
import { currentHamletHero, hamletActionOptions } from "../hamlet-actions";
import { naturalQuest, type NaturalQuestOptions } from "./natural-quest";

export type NaturalFinalBattleOptions = NaturalQuestOptions & {
  readonly questId?: BasicQuestId;
  /** `deployed`：含 `deployFinalBattleForm`；`battleStarted`：再含 `startBattle`。默认仅到 `prepareFinalBattleForms`。 */
  readonly through?: "deploymentReady" | "deployed" | "battleStarted";
};

/** 最暗任务自然胜利回村 → 最后四天 → 最终战补给与形态 → 可选部署/开战；仅公开命令。 */
export function naturalFinalBattle(
  seed: number,
  sources: CoreQuestSources,
  options: NaturalFinalBattleOptions = {},
) {
  const questId = options.questId ?? ("quest:p018" as const);
  const initialRun = naturalQuest(seed, questId, true, sources, 2, options);
  if (initialRun.stopReason) throw new Error(initialRun.stopReason);
  let state = initialRun.state;
  const commands: Command[] = [...initialRun.commands];
  const events: GameEvent[] = [...initialRun.events];
  const step = (command: Command) => {
    const result = applyCommand(state, command);
    const refused = result.events.find((e) => e.type === "commandRefused");
    if (refused) throw new Error(`${command.type}: ${refused.message}`);
    commands.push(command);
    events.push(...result.events);
    state = result.state;
    options.observe?.(state, command);
    return result;
  };
  const choice = () => state.battle?.pending?.choice ?? state.dungeon?.pending;
  const pickProvision = (pending: PendingChoice) =>
    pending.options.find((o) => o.id === "torch")?.id ??
    pending.options.find((o) => o.id.startsWith("use:"))?.id ??
    pending.options[0]!.id;
  const settle = () => {
    for (let guard = 0; guard < 200; guard++) {
      const pending = choice();
      if (pending) {
        step({
          type: "resolveChoice",
          choiceId: pending.id,
          optionId: pickProvision(pending),
        });
        continue;
      }
      return;
    }
    throw new Error("choice loop");
  };
  for (const type of ["beginReturnToHamlet", "finishReturnToHamlet"] as const) step({ type });
  step({ type: "beginFinalPreparation" });
  for (let guard = 0; guard < 200; guard++) {
    const h = state.dungeon!.hamlet!;
    if (h.phase === "preparationComplete") break;
    if (h.phase === "awaitingCaretaker") {
      step({ type: "rollHamletCaretaker" });
      continue;
    }
    if (h.phase !== "heroActions") throw new Error(`hamlet halted ${h.phase}`);
    const actor = currentHamletHero(state);
    const isFirst = !h.actedHeroes?.length;
    const crusader = actor?.heroStatId?.startsWith("hero_stat:p001");
    if (isFirst && crusader && actor) {
      step({ type: "useHamletSkill", actorId: actor.id, skill: "zealousSpeech" });
      continue;
    }
    const option = hamletActionOptions(state)[0];
    if (!option) throw new Error("最后四天准备缺少可用村庄行动");
    step(option.command);
    settle();
  }
  if (state.dungeon!.hamlet!.phase !== "preparationComplete") throw new Error("最后四天准备未完成");
  step({ type: "beginFinalBattleProvisions" });
  step({ type: "rollDungeonProvisions" });
  settle();
  if (state.dungeon!.finalBattleProvisions !== "ready") throw new Error("最终战补给未就绪");
  step({ type: "prepareFinalBattleForms" });
  const through = options.through ?? "deploymentReady";
  if (through !== "deploymentReady") {
    step({ type: "deployFinalBattleForm" });
    if (through === "battleStarted") step({ type: "startBattle" });
  }
  return { initial: initialRun.initial, state, commands, events, questId, seed };
}
