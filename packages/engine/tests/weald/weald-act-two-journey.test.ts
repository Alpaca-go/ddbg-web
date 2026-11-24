import { expect, it } from "vitest";
import { WEALD_NATURAL_ACT_TWO_CAMPAIGN_DRIVE } from "../../src/test-helpers/weald-face-the-threat-natural-seed-scan";
import { wealdNaturalActTwoJourney } from "../../src/test-helpers/weald-face-the-threat-natural-prefix";

/**
 * V1 基线：从已验收的 I 幕末态继续跑完整 II 幕（两趟 II 级任务 + p019）。
 * 当前驱动含公会升级、铁匠与阈值治疗；本快照只记录停点，不是 II 幕验收。
 */
const cases = [
  { seed: 7, mode: "radiant" as const },
  { seed: 13, mode: "radiant" as const },
  { seed: 56, mode: "radiant" as const },
  { seed: 90, mode: "standard" as const },
  { seed: 20, mode: "stygian" as const },
];

it("V1 Act II 自然链基线（非验收）", () => {
  const rows = cases.map(({ seed, mode }) => {
    const journey = wealdNaturalActTwoJourney(seed, {
      ...WEALD_NATURAL_ACT_TWO_CAMPAIGN_DRIVE,
      radiant: mode === "radiant",
      ...(mode === "stygian" ? { stygian: true } : {}),
    });
    const d = journey.game.dungeon!;
    return {
      seed,
      mode,
      stop: journey.stop,
      campaignLevel: d.campaignLevel ?? null,
      completedRegularQuests: d.completedRegularQuests?.length ?? 0,
      guildVisits: journey.commands.filter((command) => command.type === "visitGuild").length,
      blacksmithVisits: journey.commands.filter((command) => command.type === "visitBlacksmith")
        .length,
      heroes: d.heroes.map((hero) => ({
        id: hero.id,
        level: hero.level,
        dead: hero.dead ?? false,
      })),
    };
  });
  expect(rows).toMatchSnapshot();
}, 600_000);
