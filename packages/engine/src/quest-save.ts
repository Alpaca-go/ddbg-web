import { questSaveSchema, questStartSchema } from "../../data/src/quest-save";
import type { QuestSave, QuestStart } from "../../data/src/quest-save";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import type { CoreQuestSources } from "./dungeon-quest-entry";
import { applyCommand } from "./command";
import type { Command, GameEvent, GameState } from "./command";

/** 忽略JSON键顺序及不可序列化的undefined；保留数组/牌堆顺序。 */
function canonical(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === "object")
      return Object.fromEntries(
        Object.entries(v)
          .filter(([, field]) => field !== undefined)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, field]) => [key, sort(field)]),
      );
    return v;
  };
  return JSON.stringify(sort(value));
}
function replay(start: QuestStart, commands: readonly Command[], sources: CoreQuestSources) {
  let game = createCoreDungeonQuest(start.seed, start.questId, start.mode, start.party, sources);
  let events: readonly GameEvent[] = [];
  for (const [index, command] of commands.entries()) {
    const result = applyCommand(game, command);
    const refused = result.events.find((e) => e.type === "commandRefused");
    if (refused) throw new Error(`存档第${index + 1}条命令无法回放：${refused.message}`);
    game = result.state;
    events = result.events;
  }
  return { game, events };
}
function replayCommands(commands: QuestSave["commands"]): Command[] {
  return commands.map((command): Command => {
    if (command.type === "playHeroSkill") {
      const { face, shuffleChoice, ...base } = command;
      return {
        ...base,
        ...(face === undefined ? {} : { face }),
        ...(shuffleChoice === undefined ? {} : { shuffleChoice }),
      };
    }
    if (command.type === "playHeroSkillTargets") {
      const { shuffleChoice, ...base } = command;
      return { ...base, ...(shuffleChoice === undefined ? {} : { shuffleChoice }) };
    }
    if (command.type === "playMonsterSkill") {
      const { shuffleChoice, shuffleChoices, ...base } = command;
      return {
        ...base,
        ...(shuffleChoice === undefined ? {} : { shuffleChoice }),
        ...(shuffleChoices === undefined ? {} : { shuffleChoices }),
      };
    }
    return command;
  });
}
/** #186的购买待选仅新增出售按钮/提示；旧快照其他字段仍须逐项匹配回放。 */
function upgradeNomadPrompt(snapshot: unknown, restored: GameState): unknown {
  const old = snapshot as GameState | null;
  const pending = old?.dungeon?.pending,
    current = restored.dungeon?.pending;
  if (
    !pending?.id.startsWith("hamlet-nomad:shop:") ||
    pending.prompt !== "游商马车I：可购买一件陈列饰品；出售继续开发（R33）" ||
    old!.dungeon!.hamlet?.nomadSold !== undefined ||
    !current ||
    current.id !== pending.id ||
    current.actorId !== pending.actorId ||
    canonical(pending.options) !==
      canonical(current.options.filter((o) => !o.id.startsWith("sell:")))
  )
    return snapshot;
  return {
    ...old,
    dungeon: {
      ...old!.dungeon!,
      pending: {
        ...pending,
        prompt: current.prompt,
        options: current.options,
      },
    },
  };
}
/** 大纲§3.3 / Phase4：种子+日志+版本快照；纯函数，不依赖浏览器存储。 */
export function createQuestSave(
  start: QuestStart,
  commands: readonly Command[],
  game: GameState,
  sources: CoreQuestSources,
): QuestSave {
  const save = questSaveSchema.parse({
    format: "ddbg-core-quest",
    version: 1,
    rulesVersion: "core-quest-2026-10-14",
    start: questStartSchema.parse(start),
    commands,
    snapshot: JSON.parse(JSON.stringify(game)),
  });
  const restored = replay(save.start, replayCommands(save.commands), sources);
  if (canonical(restored.game) !== canonical(save.snapshot))
    throw new Error("当前状态与任务入口及命令日志不一致，未保存");
  return save;
}
export function loadQuestSave(
  input: unknown,
  sources: CoreQuestSources,
  previousSources?: CoreQuestSources,
) {
  const parsed = questSaveSchema.safeParse(input);
  if (!parsed.success) throw new Error("存档格式、版本或命令参数不受支持");
  const save = parsed.data;
  const commands = replayCommands(save.commands);
  const restored = replay(save.start, commands, sources);
  if (canonical(restored.game) !== canonical(upgradeNomadPrompt(save.snapshot, restored.game))) {
    if (!previousSources)
      throw new Error("存档快照与回放不一致，或游戏数据版本已变化；未替换当前进度");
    // 仅由调用方提供可信旧目录；先完整验证旧快照，再允许目录字段更新。
    // 玩家状态、牌池、待选、RNG和命令结果仍须与新目录回放逐项一致。
    const previous = loadQuestSave(input, previousSources).game;
    const upgraded = {
      ...previous,
      ...(previous.dungeon && restored.game.dungeon
        ? { dungeon: { ...previous.dungeon, battleCatalog: restored.game.dungeon.battleCatalog } }
        : {}),
      ...(previous.battle && restored.game.battle
        ? {
            battle: {
              ...previous.battle,
              heroStats: restored.game.battle.heroStats,
              skills: restored.game.battle.skills,
            },
          }
        : {}),
    };
    if (canonical(upgraded) !== canonical(restored.game))
      throw new Error("旧存档的目录更新改变了游戏结果；未替换当前进度");
  }
  return { ...restored, start: save.start, commands };
}
