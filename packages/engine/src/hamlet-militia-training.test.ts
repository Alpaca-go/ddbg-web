import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources as sources } from "./test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { ownedHeroSkills } from "./hero-loadout";
import { createRng } from "./rng";
import events from "../../data/normalized/corebox/hamlet_event.json";
import raw from "../../data/extract/corebox/raw/hamlet_event.json";
import { rawFileSchema } from "../../data/src/extract/raw";
import { buildHamletEvents } from "../../data/src/normalize/hamlet-event";
import { hamletEventFileSchema, approvedHamletEffectIcons } from "../../data/src/hamlet-event";

const cards = hamletEventFileSchema.parse(events).cards;
const seed = Array.from({ length: 300 }, (_, i) => i + 1).find((seed) => {
  const rng = createRng(seed),
    deck = cards.map((c) => c.id);
  for (let i = 0; i < 11; i++) rng.next();
  for (let i = 15; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck[0] === "hamlet_event:p016";
})!;
function ok(s: GameState, c: Command) {
  const r = applyCommand(s, c);
  expect(
    r.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toEqual([]);
  return r;
}
const choose = (s: GameState, optionId: string): Command => ({
  type: "resolveChoice",
  choiceId: s.dungeon!.pending!.id,
  optionId,
});
function returned() {
  let game = createCoreDungeonQuest(seed, "quest:p001", "radiant", coreParty, sources);
  const commands: Command[] = [];
  const step = (c: Command) => {
    commands.push(c);
    const r = ok(game, c);
    game = r.state;
    return r;
  };
  let r = step({ type: "rollDungeonProvisions" });
  while (r.pendingChoice) r = step(choose(game, r.pendingChoice.options[0]!.id));
  step({ type: "leaveDungeon" });
  step(choose(game, "agree"));
  step({ type: "summarizeDungeonQuest" });
  step({ type: "beginReturnToHamlet" });
  step({ type: "finishReturnToHamlet" });
  return { game, commands };
}
const start = {
  seed,
  questId: "quest:p001" as const,
  mode: "radiant" as const,
  party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
};
it("Abomination自然返村抽Militia免费升级Transform，待选和升级后正式存档均可回放", () => {
  const party = coreParty.map((h, i) =>
    i === 0
      ? {
          ...h,
          heroStatId: "hero_stat:p021:front",
          skillIds: ["hero_skill:p211", "hero_skill:p214", "hero_skill:p220"],
        }
      : { ...h, skillIds: [...h.skillIds] },
  );
  let game = createCoreDungeonQuest(seed, "quest:p001", "radiant", party, sources);
  const commands: Command[] = [];
  const step = (c: Command) => {
    commands.push(c);
    game = ok(game, c).state;
  };
  const verifySave = () =>
    expect(
      loadQuestSave(
        JSON.parse(JSON.stringify(createQuestSave({ ...start, party }, commands, game, sources))),
        sources,
      ).game,
    ).toEqual(game);
  step({ type: "rollDungeonProvisions" });
  const pending = () => game.dungeon!.pending;
  while (pending()) step(choose(game, pending()!.options[0]!.id));
  step({ type: "leaveDungeon" });
  step(choose(game, "agree"));
  step({ type: "summarizeDungeonQuest" });
  step({ type: "beginReturnToHamlet" });
  step({ type: "finishReturnToHamlet" });
  step({ type: "drawHamletEvent" });
  expect(game.dungeon!.hamlet!.active).toBe("hamlet_event:p016");
  step(choose(game, "train"));
  verifySave();
  const gold = game.dungeon!.gold,
    xp = game.dungeon!.heroes.map((h) => h.xp);
  step(choose(game, "upgrade:hero_skill:p220"));
  expect(game.dungeon!.heroes[0]!.skillIds).toContain("hero_skill:p221");
  expect(ownedHeroSkills(game.dungeon!.heroes[0]!, game.dungeon!.battleCatalog!)).toHaveLength(7);
  verifySave();
  while (pending()) step(choose(game, pending()!.options[0]!.id));
  expect(game.dungeon!.gold).toBe(gold);
  expect(game.dungeon!.heroes.map((h) => h.xp)).toEqual(xp);
  verifySave();
}, 30000);
function roundTrip(game: GameState, commands: Command[]) {
  return loadQuestSave(
    JSON.parse(JSON.stringify(createQuestSave(start, commands, game, sources))),
    sources,
  ).game;
}

it("R-077 Militia无未审图标且完整行守门；R-085仅四卡效果映射，十六事件均已启用", () => {
  expect(cards[15]).toMatchObject({
    name: "Militia Training",
    days: null,
    effectIconIds: [],
    runtime: "militiaTraining",
    permanentlyRemoved: false,
  });
  expect(Object.keys(approvedHamletEffectIcons)).toEqual([
    "hamlet_event:p001",
    "hamlet_event:p003",
    "hamlet_event:p009",
    "hamlet_event:p010",
  ]);
  expect(cards.filter((c) => c.runtime === "unimplemented")).toEqual([]);
  const changed = structuredClone(rawFileSchema.parse(raw));
  changed.cards[15]!.faces.front.lines.at(-1)!.text = "do, 0 days. Else 4 days.";
  expect(() => buildHamletEvents(changed)).toThrow("完整效果行漂移");
});

it("完整16张自然抽Militia，拒绝升级保留3天、无技能/金币/XP变更，洗回后看守人及存档正常", () => {
  const base = returned(),
    before = structuredClone(base.game);
  const drawn = ok(base.game, { type: "drawHamletEvent" }).state;
  expect(drawn.dungeon!.hamlet).toMatchObject({
    active: "hamlet_event:p016",
    phase: "eventBlocked",
    preparationDays: null,
  });
  expect(drawn.dungeon!.hamlet!.deck).toHaveLength(15);
  const c = choose(drawn, "decline"),
    done = ok(drawn, c).state;
  expect(done.dungeon!.heroes).toEqual(drawn.dungeon!.heroes);
  expect(done.dungeon!.gold).toBe(drawn.dungeon!.gold);
  expect(done.dungeon!.hamlet).toMatchObject({
    active: null,
    phase: "awaitingCaretaker",
    preparationDays: 3,
    permanentlyRemoved: [],
  });
  expect(done.dungeon!.cursor).toBe(drawn.dungeon!.cursor + 15);
  expect(done.dungeon!.hamlet!.deck).toHaveLength(16);
  expect(roundTrip(done, [...base.commands, { type: "drawHamletEvent" }, c])).toEqual(done);
  expect(ok(done, { type: "rollHamletCaretaker" }).state.dungeon!.hamlet!.phase).toBe(
    "heroActions",
  );
  expect(base.game).toEqual(before);
});

it("全员逐名免费升I→II，可选未装备技能；中途/完成正式存档续接，0天直接出征且只洗回一次", () => {
  const base = returned(),
    commands: Command[] = [...base.commands];
  let game = base.game;
  const step = (c: Command) => {
    commands.push(c);
    game = ok(game, c).state;
  };
  step({ type: "drawHamletEvent" });
  expect(roundTrip(game, commands)).toEqual(game);
  step(choose(game, "train"));
  const gold = game.dungeon!.gold,
    xp = game.dungeon!.heroes.map((h) => h.xp);
  for (let i = 0; i < 4; i++) {
    const p = game.dungeon!.pending!,
      hero = game.dungeon!.heroes.find((h) => h.id === p.actorId)!;
    expect(p.actorId).toBe(`hero-${i}`);
    expect(p.options.some((o) => o.id === "skip")).toBe(false);
    const option = p.options.find(
      (o) => i !== 0 || !hero.skillIds!.includes(o.id.replace("upgrade:", "")),
    )!;
    const oldId = option.id.replace("upgrade:", ""),
      oldSkills = hero.skillIds;
    const cursor = game.dungeon!.cursor;
    step(choose(game, option.id));
    const upgraded = game.dungeon!.heroes.find((h) => h.id === hero.id)!;
    expect(upgraded.permanentlyRemovedSkillIds).toContain(oldId);
    expect(
      ownedHeroSkills(upgraded, game.dungeon!.battleCatalog!)!.filter((s) => s.level === 2),
    ).toHaveLength(1);
    if (i === 0) expect(upgraded.skillIds).toEqual(oldSkills);
    expect(game.dungeon!.cursor).toBe(cursor + (i === 3 ? 15 : 0));
    expect(roundTrip(game, commands)).toEqual(game);
  }
  expect(game.dungeon!.gold).toBe(gold);
  expect(game.dungeon!.heroes.map((h) => h.xp)).toEqual(xp);
  expect(game.dungeon!.hamlet).toMatchObject({
    phase: "preparationComplete",
    preparationDays: 0,
    remainingDays: 0,
    active: null,
    permanentlyRemoved: [],
  });
  expect(game.dungeon!.hamlet!.deck).toHaveLength(16);
  expect(applyCommand(game, { type: "rollHamletCaretaker" }).state).toBe(game);
  step({ type: "offerNextQuest" });
  step(choose(game, game.dungeon!.pending!.options[0]!.id));
  expect(game.dungeon!.phase).toBe("awaitingProvisions");
  expect(roundTrip(game, commands)).toEqual(game);
}, 30000);

it("集体/逐英雄待选冻结其他命令，非法/跳过/过期选择不付效果或RNG", () => {
  const drawn = ok(returned().game, { type: "drawHamletEvent" }).state;
  const trained = ok(drawn, choose(drawn, "train")).state;
  for (const state of [drawn, trained]) {
    const before = structuredClone(state);
    for (const c of [
      { type: "drawHamletEvent" },
      { type: "rollHamletCaretaker" },
      { type: "offerNextQuest" },
      choose(state, "skip"),
      choose(state, "upgrade:hero_skill:p002"),
    ] as Command[])
      expect(applyCommand(state, c).state).toBe(state);
    expect(state).toEqual(before);
  }
  const old = choose(trained, trained.dungeon!.pending!.options[0]!.id);
  const next = ok(trained, old).state;
  expect(applyCommand(next, old).state).toBe(next);
});

it("一名英雄已无I级拥有技能时仅提供3天选项，不升级其他三名", () => {
  const base = returned().game,
    d = base.dungeon!,
    hero = d.heroes[0]!;
  // 独立拥有集边界夹具：七项均已永久升II，不修改牌序或资源。
  const owned = ownedHeroSkills(hero, d.battleCatalog!)!;
  const upgraded = {
    ...hero,
    permanentlyRemovedSkillIds: owned.map((s) => s.id),
    skillIds: hero.skillIds!.map((id) => {
      const old = owned.find((s) => s.id === id)!;
      return d.battleCatalog!.skills.find(
        (s) => s.hero === old.hero && s.name === old.name && s.level === 2,
      )!.id;
    }),
  };
  const fixture = { ...base, dungeon: { ...d, heroes: [upgraded, ...d.heroes.slice(1)] } };
  const drawn = ok(fixture, { type: "drawHamletEvent" }).state;
  expect(drawn.dungeon!.pending!.options.map((o) => o.id)).toEqual(["decline"]);
  expect(applyCommand(drawn, choose(drawn, "train")).state).toBe(drawn);
  expect(ok(drawn, choose(drawn, "decline")).state.dungeon!.heroes).toEqual(drawn.dungeon!.heroes);
});

it("复用永久升级与R-080：铁匠临时III归还卡更新为II，保持临时III计划", () => {
  const base = returned().game,
    d = base.dungeon!;
  const fixture = {
    ...base,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) =>
        i === 0
          ? {
              ...h,
              nextQuestSkillUpgrades: [
                { originalSkillId: "hero_skill:p001", temporarySkillId: "hero_skill:p003" },
              ],
            }
          : h,
      ),
    },
  };
  const drawn = ok(fixture, { type: "drawHamletEvent" }).state;
  const trained = ok(drawn, choose(drawn, "train")).state;
  const upgraded = ok(trained, choose(trained, "upgrade:hero_skill:p001")).state;
  expect(upgraded.dungeon!.heroes[0]!.nextQuestSkillUpgrades).toEqual([
    { originalSkillId: "hero_skill:p002", temporarySkillId: "hero_skill:p003" },
  ]);
});
