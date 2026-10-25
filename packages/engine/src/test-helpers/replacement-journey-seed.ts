import { applyCommand } from "../command";
import type { CoreQuestSources } from "../dungeon-quest-entry";
import { naturalQuest } from "./natural-quest";
import { hamletActionOptions } from "../hamlet-actions";
import { scoutThenOfferSeed } from "./quest-offer-seed";
import { SCENARIO_SEED_SEARCH_LIMIT } from "./scenario-seed-search";

const cachedReplacementJourneySeed = new Map<string, number>();

/** 瘟疫医生替补场景：种子需能完成第二周村庄并轮到 Experimental Vapours。 */
export function replacementJourneySeed(
  sources: CoreQuestSources,
  nextQuestId: "quest:p002" | "quest:p003",
  start = 14,
  tries = SCENARIO_SEED_SEARCH_LIMIT,
): number {
  const cached = cachedReplacementJourneySeed.get(nextQuestId);
  if (cached !== undefined) return cached;
  for (let seed = start; seed < start + tries; seed++) {
    try {
      if (scoutThenOfferSeed(sources, nextQuestId, "quest:p001", seed, 1) !== seed) continue;
      const run = naturalQuest(seed, "quest:p001", true, sources, 2, {
        observe(game) {
          if (!game.battle && game.dungeon!.phase === "ready" && game.dungeon!.position !== "S")
            throw new Error("observed-room");
        },
      });
      if (run.stopReason !== "observed-room") continue;
      let game = run.state;
      const step = (command: Parameters<typeof applyCommand>[1]) => {
        const r = applyCommand(game, command);
        if (r.events.some((e) => e.type === "commandRefused")) throw new Error("refused");
        game = r.state;
      };
      const choose = (optionId: string) => {
        const choice =
          game.dungeon!.replacementPreparation?.choice ??
          game.dungeon!.deathTrinketChoice ??
          game.dungeon!.pending!;
        step({ type: "resolveChoice", choiceId: choice.id, optionId });
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
      for (;;) {
        const pending = game.dungeon!.pending;
        if (!pending) break;
        choose(pending.options[0]!.id);
      }
      step({ type: "finishReturnToHamlet" });
      step({ type: "drawHamletEvent" });
      for (;;) {
        const pending = game.dungeon!.pending;
        if (!pending) break;
        choose(pending.options[0]!.id);
      }
      if (game.dungeon!.hamlet!.phase === "awaitingCaretaker")
        step({ type: "rollHamletCaretaker" });
      const doctor = game.dungeon!.heroes.find((h) => h.heroStatId === "hero_stat:p013:front");
      if (!doctor) continue;
      step({ type: "useHamletSkill", actorId: "hero-0", skill: "zealousSpeech" });
      step({ type: "rollHamletCaretaker" });
      const service = hamletActionOptions(game).find(
        (o) =>
          o.command.type === "visitHamletBuilding" &&
          ["heal5", "tavern3", "survivalist1"].includes(o.command.serviceId),
      );
      if (!service) continue;
      step(service.command);
      step({ type: "useHamletSkill", actorId: "hero-1", skill: "sharpenSpear" });
      step({ type: "useHamletSkill", actorId: "hero-3", skill: "chant" });
      const target = game.dungeon!.heroes.find((h) => h.id === "hero-1");
      if (!target || (target.wounds ?? 0) < 1) continue;
      const trial = applyCommand(game, {
        type: "useHamletSkill",
        actorId: doctor.id,
        skill: "experimentalVapours",
        targetId: "hero-1",
      });
      if (trial.events.some((e) => e.type === "commandRefused")) continue;
      cachedReplacementJourneySeed.set(nextQuestId, seed);
      return seed;
    } catch {
      /* try next seed */
    }
  }
  throw new Error(
    `未找到瘟疫医生替补村庄种子：${nextQuestId}（已搜索 ${start}..${start + tries - 1}）`,
  );
}
