import { afterAll, beforeAll, expect, it } from "vitest";
import { battleDataPlugin } from "../../../apps/web/battle-data-plugin";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import type { CoreQuestSources } from "./dungeon-quest-entry";
import { coreQuestSources } from "./test-helpers/core-quest";
import { naturalParty, naturalQuest } from "./test-helpers/natural-quest";
import { currentHamletHero, hamletActionOptions } from "./hamlet-actions";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { replacementHeroCandidates } from "./hero-death-estate";
import { replacementJourneySeed } from "./test-helpers/replacement-journey-seed";
import {
  installGoldenMainCampaignQuestPool,
  restoreCampaignQuestPool,
} from "./test-helpers/golden-quest-pool";

beforeAll(() => installGoldenMainCampaignQuestPool());
afterAll(() => restoreCampaignQuestPool());

for (const nextQuestId of ["quest:p002", "quest:p003"] as const) {
  it(`正式瘟疫医生替补：回村能力→${nextQuestId}自然战斗→再次回村与完整存档`, () => {
    const load = battleDataPlugin().load as (id: string) => string;
    const code = load("\0virtual:quest-battle-data");
    const catalog = JSON.parse(code.slice("export const battleData = ".length, -1));
    const sources: CoreQuestSources = {
      ...coreQuestSources,
      catalog: { ...catalog, trinkets: coreQuestSources.catalog.trinkets },
      resolveCards: catalog.resolveCards,
    };
    const seed = replacementJourneySeed(sources, nextQuestId);
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
    expect(healed.wounds).toBe(0);
    expect(
      game
        .dungeon!.conditions!.quirks.filter((q) => before.quirkIds?.includes(q.id))
        .map((q) => q.name),
    ).toEqual(["Nervous"]);
    expect(healed.stress).toBe(7);
    saved();
    while (game.dungeon!.hamlet!.phase !== "preparationComplete") {
      if (game.dungeon!.hamlet!.phase === "awaitingCaretaker")
        step({ type: "rollHamletCaretaker" });
      step({ type: "useHamletSkill", actorId: "hero-0", skill: "zealousSpeech" });
    }
    step({ type: "setHamletStances", heroIds: ["hero-0", "hero-1", doctor.id, "hero-3"] });
    expect(game.dungeon!.pending).toBeNull();
    saved();
    step({ type: "offerNextQuest" });
    expect(game.dungeon!.nextQuestOffers).toContain(nextQuestId);
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
    const second = naturalQuest(seed, nextQuestId, true, sources, 2, {
      continueFrom: game,
      exitAfterBattles: 1,
      observe(snapshot, command) {
        continued.push(command);
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
    expect(sawBlight).toBe(nextQuestId === "quest:p002");
    expect(
      second.events.flatMap((e) =>
        e.type === "heroSkillResolved" && e.actorId === doctor.id ? [e.resolution.skillId] : [],
      ),
    ).toContain("hero_skill:p127");
    if (nextQuestId === "quest:p003")
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
    expect(second.events.some((e) => e.type === "battleFinished" && e.outcome === "victory")).toBe(
      true,
    );
    commands.push(...second.commands);
    game = second.state;
    for (const checkpoint of observations) saved(checkpoint.snapshot, checkpoint.log);
    saved();
    expect(game.dungeon!.questSummary).toMatchObject(
      nextQuestId === "quest:p002"
        ? { questId: nextQuestId, xpPerHero: 1, stagecoachXp: 1, awarded: false }
        : {
            questId: nextQuestId,
            earlyLeave: true,
            objectiveMet: false,
            donatedGold: 0,
            xpPerHero: 0,
            awarded: false,
          },
    );
    step({ type: "beginReturnToHamlet" });
    settle();
    step({ type: "finishReturnToHamlet" });
    expect(game.dungeon!.heroes).toHaveLength(4);
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
      nextQuestId === "quest:p002" ? 1 : 0,
    );
    const finalSave = saved();
    // 从真实战斗待选和瘟疫医生施加腐蚀后的存档执行剩余公开命令，验证跨战斗/回村续接。
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
