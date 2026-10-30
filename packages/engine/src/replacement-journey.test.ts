import { expect, it } from "vitest";
import { questsForCampaignLevel } from "../../data/src/basic-quests";
import { battleDataPlugin } from "../../../apps/web/battle-data-plugin";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import type { CoreQuestSources } from "./dungeon-quest-entry";
import { coreQuestSources } from "./test-helpers/core-quest";
import { naturalParty, naturalQuest } from "./test-helpers/natural-quest";
import { currentHamletHero, hamletActionOptions } from "./hamlet-actions";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { replacementHeroCandidates } from "./hero-death-estate";

// 完整当前目录、公开命令与独立固定种子；不搜索种子或注入资源 / 牌序。
const journeys = [
  {
    label: "清剿腐蚀",
    seed: 14,
    nextQuestId: "quest:p002",
    offers: ["quest:p002", "quest:p004"],
    stress: [3, 7],
    quirk: "Nervous",
    blacksmith: false,
    blight: true,
    medicine: false,
    skill: "hero_skill:p127",
    summary: { xpPerHero: 1, stagecoachXp: 1 },
  },
  {
    label: "捐款腐蚀与治疗、支付升级后不捐献",
    seed: 47,
    nextQuestId: "quest:p003",
    offers: ["quest:p003", "quest:p002"],
    stress: [3, 6],
    quirk: "Off Guard",
    blacksmith: true,
    blight: true,
    medicine: true,
    skill: "hero_skill:p127",
    summary: {
      earlyLeave: false,
      objectiveMet: true,
      lairClearedCount: 1,
      donatedGold: 0,
      xpPerHero: 0,
      stagecoachXp: 0,
    },
  },
  {
    label: "捐款目标未达成、提前退出",
    seed: 41,
    nextQuestId: "quest:p003",
    offers: ["quest:p003", "quest:p005"],
    stress: [2, 5],
    quirk: "Shocker",
    blacksmith: false,
    blight: false,
    medicine: false,
    skill: "hero_skill:p136",
    summary: {
      earlyLeave: true,
      objectiveMet: false,
      lairClearedCount: 0,
      donatedGold: 0,
      xpPerHero: 0,
      stagecoachXp: 0,
    },
  },
] as const;

for (const fixture of journeys) {
  const { seed, nextQuestId } = fixture;
  it(`正式瘟疫医生替补：${fixture.label}→再次回村与完整存档`, () => {
    const load = battleDataPlugin().load as (id: string) => string;
    const code = load("\0virtual:quest-battle-data");
    const catalog = JSON.parse(code.slice("export const battleData = ".length, -1));
    const sources: CoreQuestSources = {
      ...coreQuestSources,
      catalog: { ...catalog, trinkets: coreQuestSources.catalog.trinkets },
      resolveCards: catalog.resolveCards,
    };
    expect(questsForCampaignLevel(1)).toHaveLength(5);
    const run = naturalQuest(seed, "quest:p001", true, sources, 2, {
      observe(game) {
        if (!game.battle && game.dungeon!.phase === "ready" && game.dungeon!.position !== "S")
          throw new Error("observed-room");
      },
    });
    expect(run.stopReason).toBe("observed-room");
    let game = run.state;
    const commands: Command[] = [...run.commands];
    const step = (command: Command) => {
      const result = applyCommand(game, command);
      const refused = result.events.find((e) => e.type === "commandRefused");
      if (refused) throw new Error(`${command.type}: ${refused.message}`);
      game = result.state;
      commands.push(command);
      return result;
    };
    const choose = (optionId: string) => {
      const choice =
        game.dungeon!.replacementPreparation?.choice ??
        game.dungeon!.deathTrinketChoice ??
        game.dungeon!.pending!;
      return step({ type: "resolveChoice", choiceId: choice.id, optionId });
    };
    const settle = () => {
      while (game.dungeon!.pending) choose(game.dungeon!.pending!.options[0]!.id);
    };
    const saved = (snapshot = game, log: readonly Command[] = commands) => {
      const start = {
        seed,
        questId: "quest:p001" as const,
        mode: "radiant" as const,
        party: naturalParty,
      };
      const save = createQuestSave(start, log, snapshot, sources);
      const loaded = loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game;
      expect(loaded).toEqual(snapshot);
      if (snapshot === game && log === commands) game = loaded;
      return save;
    };
    for (let n = 0; !game.dungeon!.heroes.some((h) => h.dead) && n < 25; n++) {
      step({ type: "scoutDungeon" });
      choose("agree");
    }
    while (game.dungeon!.deathTrinketChoice) choose("discard");
    step({ type: "prepareReplacementHero" });
    choose("hero_stat:p013:front");
    choose("finish-upgrades");
    for (const id of ["hero_skill:p136", "hero_skill:p127", "hero_skill:p139"]) choose(id);
    step({ type: "joinPreparedReplacements" });
    step({ type: "leaveDungeon" });
    choose("agree");
    step({ type: "summarizeDungeonQuest" });
    step({ type: "beginReturnToHamlet" });
    settle();
    step({ type: "finishReturnToHamlet" });
    if (fixture.blacksmith) {
      const beforeUpgrade = game.dungeon!;
      expect(beforeUpgrade.buildingLevels?.blacksmith ?? 1).toBe(1);
      step({ type: "upgradeHamletBuilding", building: "blacksmith" });
      expect(game.dungeon!.gold).toBe(beforeUpgrade.gold - 10);
      expect(game.dungeon!.buildingLevels?.blacksmith).toBe(2);
      expect(game.dungeon!.cursor).toBe(beforeUpgrade.cursor);
    }
    saved();
    step({ type: "drawHamletEvent" });
    settle();
    if (game.dungeon!.hamlet!.phase === "awaitingCaretaker") step({ type: "rollHamletCaretaker" });
    const doctor = game.dungeon!.heroes.find((h) => h.heroStatId === "hero_stat:p013:front")!;
    expect(game.dungeon!.deadHeroNames).toHaveLength(1);
    expect(game.dungeon!.waitingHeroTokens).toBe(1);
    expect(doctor.skillIds).toEqual(["hero_skill:p136", "hero_skill:p127", "hero_skill:p139"]);
    step({ type: "useHamletSkill", actorId: "hero-0", skill: "zealousSpeech" });
    step({ type: "rollHamletCaretaker" });
    const service = hamletActionOptions(game).find(
      (o) =>
        o.command.type === "visitHamletBuilding" &&
        ["heal5", "tavern3", "survivalist1"].includes(o.command.serviceId),
    );
    expect(service).toBeDefined();
    step(service!.command);
    step({ type: "useHamletSkill", actorId: "hero-1", skill: "sharpenSpear" });
    step({ type: "useHamletSkill", actorId: "hero-3", skill: "chant" });
    expect(currentHamletHero(game)?.id).toBe(doctor.id);
    const before = game.dungeon!.heroes.find((h) => h.id === "hero-1")!;
    step({
      type: "useHamletSkill",
      actorId: doctor.id,
      skill: "experimentalVapours",
      targetId: "hero-1",
    });
    const healed = game.dungeon!.heroes.find((h) => h.id === "hero-1")!;
    expect(before.wounds).toBe(2);
    expect(before.stress).toBe(fixture.stress[0]);
    expect(healed.wounds).toBe(0);
    expect(
      game
        .dungeon!.conditions!.quirks.filter((q) => before.quirkIds?.includes(q.id))
        .map((q) => q.name),
    ).toEqual([fixture.quirk]);
    expect(healed.stress).toBe(fixture.stress[1]);
    saved();
    while (game.dungeon!.hamlet!.phase !== "preparationComplete") {
      if (game.dungeon!.hamlet!.phase === "awaitingCaretaker")
        step({ type: "rollHamletCaretaker" });
      step({ type: "useHamletSkill", actorId: "hero-0", skill: "zealousSpeech" });
    }
    step({ type: "setHamletStances", heroIds: ["hero-0", "hero-1", doctor.id, "hero-3"] });
    expect(game.dungeon!.pending).toBeNull();
    saved();
    const offerCursor = game.dungeon!.cursor;
    step({ type: "offerNextQuest" });
    expect(game.dungeon!.cursor).toBe(offerCursor + 3);
    expect(game.dungeon!.nextQuestOffers).toEqual(fixture.offers);
    choose(nextQuestId);
    expect(game.dungeon!.heroes.find((h) => h.id === doctor.id)).toMatchObject({
      heroStatId: doctor.heroStatId,
      skillIds: doctor.skillIds,
      stance: "ranged",
    });
    saved();
    const observations: { snapshot: GameState; log: readonly Command[] }[] = [];
    const continued: Command[] = [];
    let sawBattle = false,
      sawDoctor = false,
      sawBlight = false;
    const donationOptions: string[][] = [];
    const second = naturalQuest(seed, nextQuestId, true, sources, 2, {
      continueFrom: game,
      exitAfterBattles: 1,
      observe(snapshot, command) {
        continued.push(command);
        if (
          command.type === "summarizeDungeonQuest" &&
          snapshot.dungeon!.pending?.id.startsWith("dungeon-fundraiser:")
        ) {
          donationOptions.push(snapshot.dungeon!.pending.options.map((o) => o.id));
          expect(snapshot.dungeon!.gold).toBe(11);
          observations.push({ snapshot, log: [...commands, ...continued] });
        }
        const doctorBlight =
          command.type === "playHeroSkill" &&
          command.actorId === doctor.id &&
          command.skillId === "hero_skill:p127" &&
          snapshot.battle?.entities.some(
            (e) => e.side === "monster" && e.statusStacks?.some((s) => s.kind === "blight"),
          );
        const doctorSkill = command.type === "playHeroSkill" && command.actorId === doctor.id;
        if (
          (!sawBattle && snapshot.battle?.pending) ||
          (!sawDoctor && doctorSkill) ||
          (!sawBlight && doctorBlight)
        ) {
          if (snapshot.battle?.pending) sawBattle = true;
          if (doctorSkill) sawDoctor = true;
          if (doctorBlight) sawBlight = true;
          observations.push({ snapshot, log: [...commands, ...continued] });
        }
      },
    });
    expect(second.stopReason).toBeNull();
    expect(sawBattle).toBe(true);
    expect(sawDoctor).toBe(true);
    expect(sawBlight).toBe(fixture.blight);
    expect(
      second.events.flatMap((e) =>
        e.type === "heroSkillResolved" && e.actorId === doctor.id ? [e.resolution.skillId] : [],
      ),
    ).toContain(fixture.skill);
    if (fixture.medicine)
      expect(
        second.events.some(
          (e) =>
            e.type === "heroSkillResolved" &&
            e.actorId === doctor.id &&
            e.resolution.skillId === "hero_skill:p139" &&
            e.resolution.effect === "heal" &&
            e.resolution.outcome === "hit",
        ),
      ).toBe(true);
    expect(donationOptions).toEqual(
      fixture.blacksmith ? [[...Array.from({ length: 12 }, (_, n) => `give:${n}`), "cancel"]] : [],
    );
    expect(
      second.commands.flatMap((c) =>
        c.type === "resolveChoice" && c.choiceId.startsWith("dungeon-fundraiser:")
          ? [c.optionId]
          : [],
      ),
    ).toEqual(fixture.blacksmith ? ["give:0"] : []);
    expect(second.events.some((e) => e.type === "battleFinished" && e.outcome === "victory")).toBe(
      true,
    );
    commands.push(...second.commands);
    game = second.state;
    for (const checkpoint of observations) saved(checkpoint.snapshot, checkpoint.log);
    saved();
    expect(game.dungeon!.questSummary).toMatchObject({
      questId: nextQuestId,
      awarded: false,
      ...fixture.summary,
    });
    step({ type: "beginReturnToHamlet" });
    settle();
    step({ type: "finishReturnToHamlet" });
    expect(game.dungeon!.heroes).toHaveLength(4);
    expect(game.dungeon!.heroes.every((h) => !h.dead)).toBe(true);
    if (fixture.blacksmith) expect(game.dungeon!.buildingLevels?.blacksmith).toBe(2);
    expect(game.dungeon!.deadHeroNames).toHaveLength(1);
    expect(game.dungeon!.waitingHeroTokens).toBe(1);
    expect(
      replacementHeroCandidates(game.dungeon!)
        .map((s) => s.name)
        .sort(),
    ).toEqual(
      [
        "ABOMINATION",
        "ANTIQUARIAN",
        "ARBALEST",
        "BOUNTY HUNTER",
        "FLAGELLANT",
        "GRAVE ROBBER",
        "HOUNDMASTER",
        "JESTER",
        "LEPER",
        "MAN-AT-ARMS",
        "MUSKETEER",
        "OCCULTIST",
        "SHIELDBREAKER",
      ].sort(),
    );
    expect(game.dungeon!.heroes.find((h) => h.id === doctor.id)?.skillIds).toEqual(doctor.skillIds);
    expect(game.dungeon!.heroes.find((h) => h.id === doctor.id)?.xp).toBe(
      fixture.summary.xpPerHero,
    );
    const finalSave = saved();
    // 从真实战斗 / 技能 / 捐献待选存档执行剩余公开命令，验证跨战斗与回村续接。
    for (const checkpoint of observations) {
      let restored = loadQuestSave(saved(checkpoint.snapshot, checkpoint.log), sources).game;
      for (const command of commands.slice(checkpoint.log.length)) {
        const result = applyCommand(restored, command);
        expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
        restored = result.state;
      }
      expect(restored).toEqual(game);
    }
    const forged = JSON.parse(JSON.stringify(finalSave));
    forged.snapshot.dungeon.heroes.find((h: { id: string }) => h.id === doctor.id).xp = 99;
    expect(() => loadQuestSave(forged, sources)).toThrow(/不一致/);
  }, 60000);
}
