import { expect, it } from "vitest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import type { CoreQuestSources } from "./dungeon-quest-entry";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import type { QuestStart } from "../../data/src/quest-save";
import type { GameState } from "./command";

const previousTerm = "\u67af\u840e";
function remapMeanings(value: unknown, from: string, to: string): unknown {
  if (Array.isArray(value)) return value.map((item) => remapMeanings(item, from, to));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, field]) => [
        key,
        key === "meaning_zh" && typeof field === "string"
          ? field.replaceAll(from, to)
          : remapMeanings(field, from, to),
      ]),
    );
  return value;
}
const start: QuestStart = {
  seed: 1,
  questId: "quest:p001",
  mode: "radiant",
  party: coreParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
};
function oldSave() {
  const sources = remapMeanings(coreQuestSources, "腐蚀", previousTerm) as CoreQuestSources;
  const game = createCoreDungeonQuest(start.seed, start.questId, start.mode, start.party, sources);
  const save = createQuestSave(start, [], game, sources);
  expect(JSON.stringify(save.snapshot)).toContain(previousTerm);
  return save;
}

it("R-231：旧中文图标说明存档可在新译名目录中严格回放", () => {
  const loaded = loadQuestSave(oldSave(), coreQuestSources);
  expect(loaded.game).toEqual(
    createCoreDungeonQuest(start.seed, start.questId, start.mode, start.party, coreQuestSources),
  );
  expect(JSON.stringify(loaded.game)).not.toContain(previousTerm);
});

it("R-231 只兼容指定译名，不放宽任意说明文字或种子的篡改校验", () => {
  const save = oldSave();
  const badText = remapMeanings(save.snapshot, previousTerm, "被篡改的说明");
  expect(() => loadQuestSave({ ...save, snapshot: badText }, coreQuestSources)).toThrow(/不一致/);
  const snapshot = save.snapshot as unknown as GameState;
  expect(() =>
    loadQuestSave(
      { ...save, snapshot: { ...snapshot, seed: (snapshot.seed + 1) >>> 0 } },
      coreQuestSources,
    ),
  ).toThrow(/不一致/);
});
