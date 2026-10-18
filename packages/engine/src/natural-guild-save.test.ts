import { beforeAll, expect, it } from "vitest";
import { battleDataPlugin } from "../../../apps/web/battle-data-plugin";
import { applyCommand } from "./command";
import type { Command } from "./command";
import type { CoreQuestSources } from "./dungeon-quest-entry";
import { coreQuestSources } from "./test-helpers/core-quest";
import { twoQuestGuildPath } from "./test-helpers/two-quest-guild";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { currentHamletHero } from "./hamlet-actions";
import { ownedHeroSkills } from "./hero-loadout";

let baseline: ReturnType<typeof twoQuestGuildPath>;
let sources: CoreQuestSources;
beforeAll(() => {
  const load = battleDataPlugin().load as (id: string) => string;
  const catalog = JSON.parse(
    load("\0virtual:quest-battle-data").slice("export const battleData = ".length, -1),
  );
  sources = {
    ...coreQuestSources,
    catalog: { ...catalog, trinkets: coreQuestSources.catalog.trinkets },
    resolveCards: catalog.resolveCards,
  };
  baseline = twoQuestGuildPath(sources);
}, 120000);

function journey() {
  let game = loadQuestSave(JSON.parse(JSON.stringify(baseline.save)), sources).game;
  const commands: Command[] = [...baseline.commands];
  const step = (command: Command) => {
    const result = applyCommand(game, command);
    expect(
      result.events.filter((e) => e.type === "commandRefused"),
      JSON.stringify(result.events),
    ).toEqual([]);
    game = result.state;
    commands.push(command);
  };
  const choose = (optionId: string) =>
    step({ type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId });
  const save = () => {
    const saved = createQuestSave(baseline.start, commands, game, sources);
    const loaded = loadQuestSave(JSON.parse(JSON.stringify(saved)), sources);
    expect(loaded.game).toEqual(game);
    game = loaded.game;
    return saved;
  };
  return {
    get game() {
      return game;
    },
    commands,
    step,
    choose,
    save,
  };
}

it.each([
  ["hero-0", "hero_stat:p001:back", 24, 1, "hero_skill:p007"],
  ["hero-1", "hero_stat:p003:back", 18, 2, "hero_skill:p025"],
  ["hero-2", "hero_stat:p007:back", 17, 2, "hero_skill:p070"],
  ["hero-3", "hero_stat:p009:back", 17, 1, "hero_skill:p091"],
] as const)(
  "自然4XP后%s升II、装备四技能并正式保存续接",
  (actorId, statId, life, dodge, extraSkill) => {
    const run = journey();
    expect(run.game.dungeon!.heroes.map((h) => h.xp)).toEqual([4, 4, 4, 4]);
    expect(run.game.dungeon!.stagecoachXp).toBe(4);
    expect(run.game.dungeon!.campaignLevel).toBe(1);
    run.step({
      type: "setHamletStances",
      heroIds: [
        actorId,
        ...run.game.dungeon!.heroes.filter((h) => h.id !== actorId).map((h) => h.id),
      ],
    });
    expect(currentHamletHero(run.game)?.id).toBe(actorId);
    const before = structuredClone(run.game),
      d = before.dungeon!,
      hero = d.heroes.find((h) => h.id === actorId)!;
    run.step({ type: "visitGuild", actorId });
    const choiceSave = run.save();
    const choiceCommands = [...run.commands];
    run.choose("upgrade-hero");
    expect(run.game.dungeon!.heroes.find((h) => h.id === actorId)).toMatchObject({
      heroStatId: statId,
      level: 2,
      life,
      xp: 0,
      wounds: hero.wounds,
      stress: hero.stress,
      skillIds: hero.skillIds,
      quirkIds: hero.quirkIds ?? [],
    });
    const upgraded = run.game.dungeon!.heroes.find((h) => h.id === actorId)!;
    expect(upgraded.diseaseId).toBe(hero.diseaseId);
    expect(upgraded.resolveCardId).toBe(hero.resolveCardId);
    expect(upgraded.statusStacks).toEqual(hero.statusStacks);
    if (upgraded.combat)
      expect(upgraded.combat).toMatchObject({ heroStatId: statId, heroLevel: 2, life, dodge });
    expect(run.game.dungeon!.gold).toBe(d.gold - 2);
    expect(run.game.dungeon!.stagecoachXp).toBe(4);
    expect(run.game.dungeon!.cursor).toBe(d.cursor);
    expect(run.game.dungeon!.heroes.filter((h) => h.id !== actorId)).toEqual(
      d.heroes.filter((h) => h.id !== actorId),
    );
    run.save();
    expect(
      applyCommand(run.game, {
        type: "resolveChoice",
        choiceId: run.game.dungeon!.pending!.id,
        optionId: "upgrade-hero",
      }).state,
    ).toBe(run.game);
    run.choose("leave");
    run.save();
    const skills = [...hero.skillIds!, extraSkill];
    run.step({ type: "setEquippedSkills", actorId, skillIds: skills });
    const finalSave = run.save();
    expect(run.game.dungeon!.heroes.find((h) => h.id === actorId)?.skillIds).toEqual(skills);
    expect(run.game.dungeon!.hamlet!.actedHeroes).toContain(actorId);
    let resumed = loadQuestSave(choiceSave, sources).game;
    for (const command of run.commands.slice(choiceCommands.length)) {
      const result = applyCommand(resumed, command);
      expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
      resumed = result.state;
    }
    expect(resumed).toEqual(run.game);
    const forged = JSON.parse(JSON.stringify(finalSave));
    forged.snapshot.dungeon.heroes.find((h: { id: string }) => h.id === actorId).life = life + 1;
    expect(() => loadQuestSave(forged, sources)).toThrow(/不一致/);
  },
  120000,
);

it("同一自然4XP基线可永久升级两次技能，旧卡退出拥有/装备目录且存档恢复一致", () => {
  const run = journey(),
    actorId = currentHamletHero(run.game)!.id;
  const hero = run.game.dungeon!.heroes.find((h) => h.id === actorId)!;
  const first = hero.skillIds![0]!;
  const original = sources.catalog.skills.find((s) => s.id === first)!;
  const next = sources.catalog.skills.find(
    (s) => s.hero === original.hero && s.name === original.name && s.level === 2,
  )!;
  const third = sources.catalog.skills.find(
    (s) => s.hero === original.hero && s.name === original.name && s.level === 3,
  )!;
  const gold = run.game.dungeon!.gold;
  run.step({ type: "visitGuild", actorId });
  run.choose(`upgrade:${first}`);
  run.save();
  run.choose(`upgrade:${next.id}`);
  run.save();
  const upgraded = run.game.dungeon!.heroes.find((h) => h.id === actorId)!;
  expect(upgraded).toMatchObject({ level: 1, xp: 0, permanentlyRemovedSkillIds: [first, next.id] });
  expect(upgraded.skillIds).toContain(third.id);
  expect(ownedHeroSkills(upgraded, sources.catalog)!.map((s) => s.id)).not.toContain(first);
  expect(ownedHeroSkills(upgraded, sources.catalog)!.map((s) => s.id)).not.toContain(next.id);
  expect(run.game.dungeon!.gold).toBe(gold - 2);
  expect(run.game.dungeon!.pending).toBeNull();
}, 120000);
