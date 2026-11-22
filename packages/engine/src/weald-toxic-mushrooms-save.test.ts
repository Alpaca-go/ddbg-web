import { expect, it } from "vitest";
import { applyCommand } from "./command";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { toxicMushroomsQuest } from "./test-helpers/toxic-mushrooms-quest";

it("seed4 Patrol 自然触发前后严格回放，删版本标记拒绝（R-234／R-239）", () => {
  const { start, before, after, attack, commands, sources } = toxicMushroomsQuest();
  expect(attack).toMatchObject({ type: "resolveShuffles" });
  expect([...commands].reverse().find((c) => c.type === "playMonsterSkill")).toMatchObject({
    toxicMushrooms: true,
  });
  expect(before.dungeon!.roomCards!.active!.cardId).toBe("room:weald:01");
  expect(applyCommand(before, attack).state).toEqual(after);
  for (const [game, log] of [
    [before, commands],
    [after, [...commands, attack]],
  ] as const) {
    const save = createQuestSave(start, [...log], game, sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(game);
  }
  const tampered = createQuestSave(start, [...commands, attack], after, sources);
  const last = [...tampered.commands].reverse().find((c) => c.type === "playMonsterSkill")!;
  if (last.type !== "playMonsterSkill") throw new Error("缺攻击命令");
  delete last.toxicMushrooms;
  expect(() => loadQuestSave(JSON.parse(JSON.stringify(tampered)), sources)).toThrow(/不一致/);
}, 120000);
