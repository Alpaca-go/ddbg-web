import { expect, it } from "vitest";
import { basicQuests } from "../../data/src/basic-quests";
import { ruinsMonsterPool } from "../../data/src/monster-pool";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { applyCommand } from "./command";
import type { Command } from "./command";

it.each(basicQuests)("$name：真实完整入口、开局八颗、起点禁侦察与相同命令回放", (quest) => {
  for (const mode of ["standard", "radiant"] as const) {
    const before = structuredClone(coreQuestSources);
    const initial = createCoreDungeonQuest(31, quest.id, mode, coreParty, coreQuestSources),
      d = initial.dungeon!;
    expect(d.position).toBe("S");
    expect(d.visited).toEqual(["S"]);
    expect(d.phase).toBe("awaitingProvisions");
    expect(d.gold).toBe(0);
    expect(d.rooms.every((r) => !r.revealed && !r.cleared)).toBe(true);
    expect(
      d.heroes.every(
        (h) => h.wounds === 0 && h.stress === 0 && h.level === 1 && h.skillIds!.length === 3,
      ),
    ).toBe(true);
    expect(d.questDistribution).toEqual(quest.distribution);
    expect(d.layout.review).toBe("confirmed");
    expect(d.roomCards!.cards.filter((c) => c.location === "ruins" && !c.boss)).toHaveLength(9);
    expect(ruinsMonsterPool(d.monsterPool!.cards, 1)).toHaveLength(42);
    expect(d.curio!.cards).toHaveLength(24);
    expect(d.conditions!.quirks).toHaveLength(35);
    expect(d.conditions!.diseases).toHaveLength(11);
    expect(d.resolveCards).toHaveLength(10);
    expect(d.trinkets!.cards).toHaveLength(14);
    expect(d.explorationSetup!.provisions).toEqual([]);
    const log: Command[] = [{ type: "rollDungeonProvisions" }];
    let r = applyCommand(initial, log[0]!);
    while (r.pendingChoice) {
      const c: Command = { type: "resolveChoice", choiceId: r.pendingChoice.id, optionId: "torch" };
      log.push(c);
      r = applyCommand(r.state, c);
    }
    expect(r.state.dungeon!.phase).toBe("ready");
    expect(r.state.dungeon!.explorationSetup!.provisions).toHaveLength(8);
    expect(applyCommand(r.state, { type: "scoutDungeon" }).state).toBe(r.state);
    expect(applyCommand(r.state, { type: "rollDungeonProvisions" }).state).toBe(r.state);
    expect(
      log.reduce(
        (s, c) => applyCommand(s, c).state,
        createCoreDungeonQuest(31, quest.id, mode, coreParty, coreQuestSources),
      ),
    ).toEqual(r.state);
    expect(coreQuestSources).toEqual(before);
  }
});
it("拒绝重复英雄／姿态／技能、越级技能、缩减来源与非法种子", () => {
  const start = (party = coreParty, sources = coreQuestSources, seed = 1) =>
    createCoreDungeonQuest(seed, "quest:p001", "standard", party, sources);
  for (const seed of [-1, 1.1, NaN, 4294967296])
    expect(() => start(coreParty, coreQuestSources, seed)).toThrow();
  for (const party of [
    coreParty.slice(1),
    coreParty.map((h, i) => (i ? h : { ...h, heroStatId: coreParty[1]!.heroStatId })),
    coreParty.map((h) => ({ ...h, stance: "aggressive" as const })),
    coreParty.map((h, i) =>
      i ? h : { ...h, skillIds: [h.skillIds[0]!, h.skillIds[0]!, h.skillIds[1]!] },
    ),
    coreParty.map((h, i) =>
      i
        ? h
        : {
            ...h,
            skillIds: [
              ...h.skillIds.slice(0, 2),
              coreQuestSources.catalog.skills.find((s) => s.hero === "CRUSADER" && s.level === 2)!
                .id,
            ],
          },
    ),
  ])
    expect(() => start(party)).toThrow();
  for (const sources of [
    { ...coreQuestSources, rooms: coreQuestSources.rooms.slice(1) },
    { ...coreQuestSources, monsters: coreQuestSources.monsters.slice(1) },
    { ...coreQuestSources, curios: coreQuestSources.curios.slice(1) },
    { ...coreQuestSources, resolveCards: coreQuestSources.resolveCards.slice(1) },
  ])
    expect(() => start(coreParty, sources)).toThrow();
});
