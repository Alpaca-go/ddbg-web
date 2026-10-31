import { expect, it } from "vitest";
import { applyCommand, type Command } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { savedCommandSchema, type QuestStart } from "../../data/src/quest-save";
import { coreQuestSources } from "./test-helpers/core-quest";
import { naturalParty, naturalQuest } from "./test-helpers/natural-quest";

const command = { type: "establishImminentThreat" } as const;
const start = (seed: number): QuestStart => ({
  seed,
  questId: "quest:p001",
  mode: "radiant",
  party: naturalParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
});
function initial(seed: number) {
  return createCoreDungeonQuest(seed, "quest:p001", "radiant", naturalParty, coreQuestSources);
}

it("四Boss初始威胁及开局补给待选可严格保存恢复，重复抽取不消耗游标", () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 32 && seen.size < 4; seed++) {
    const base = initial(seed),
      established = applyCommand(base, command);
    expect(established.events.some((e) => e.type === "commandRefused")).toBe(false);
    const boss = established.state.dungeon!.activeBossThreatScriptId!;
    if (seen.has(boss)) continue;
    seen.add(boss);
    const commands: Command[] = [command];
    const saved = createQuestSave(start(seed), commands, established.state, coreQuestSources);
    const restored = loadQuestSave(JSON.parse(JSON.stringify(saved)), coreQuestSources);
    expect(restored.game).toEqual(established.state);
    expect(applyCommand(restored.game, command).state).toBe(restored.game);
    const roll = { type: "rollDungeonProvisions" } as const;
    const originalRoll = applyCommand(established.state, roll);
    expect(applyCommand(restored.game, roll)).toEqual(originalRoll);
    const provisionSave = createQuestSave(
      start(seed),
      [...commands, roll],
      originalRoll.state,
      coreQuestSources,
    );
    const loaded = loadQuestSave(JSON.parse(JSON.stringify(provisionSave)), coreQuestSources);
    expect(loaded.game).toEqual(originalRoll.state);
    if (originalRoll.pendingChoice) {
      const choice: Command = {
        type: "resolveChoice",
        choiceId: originalRoll.pendingChoice.id,
        optionId: originalRoll.pendingChoice.options[0]!.id,
      };
      expect(applyCommand(loaded.game, choice)).toEqual(applyCommand(originalRoll.state, choice));
    }
    expect(() => loadQuestSave({ ...saved, commands: [] }, coreQuestSources)).toThrow();
    const altered = structuredClone(saved);
    altered.snapshot = JSON.parse(
      JSON.stringify({
        ...established.state,
        dungeon: {
          ...established.state.dungeon!,
          imminentThreatDescriptionCardId: "boss_ability:p999",
        },
      }),
    );
    expect(() => loadQuestSave(altered, coreQuestSources)).toThrow();
  }
  expect(seen.size).toBe(4);
  expect(
    savedCommandSchema.safeParse({ ...command, scriptId: "boss:ruins:necromancer:1" }).success,
  ).toBe(false);
}, 30000);

it("真实开局威胁前缀接自然任务日志，不靠状态注入保存", () => {
  const seed = 1,
    first = applyCommand(initial(seed), command);
  const run = naturalQuest(seed, "quest:p001", false, coreQuestSources, 2, {
    continueFrom: first.state,
  });
  expect(run.commands.some((c) => c.type === "startDungeonBattle")).toBe(true);
  const saved = createQuestSave(
    start(seed),
    [command, ...run.commands],
    run.state,
    coreQuestSources,
  );
  const restored = loadQuestSave(JSON.parse(JSON.stringify(saved)), coreQuestSources);
  expect(restored.game).toEqual(run.state);
  expect(restored.game.dungeon!.imminentThreatDescriptionCardId).toBe(
    first.state.dungeon!.imminentThreatDescriptionCardId,
  );
}, 60000);
