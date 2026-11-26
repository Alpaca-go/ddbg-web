import { readBossAbilityFront } from "./boss-ability-source.build";
import type { RawFile } from "../../shared/extract/raw";
import { ruinsBossAbilitiesSchema, ruinsBossAbilityManifest } from "./ruins-boss-abilities";

/** 原始图标保留为占位符；不由印刷文本推断执行规则。 */
export function buildRuinsBossAbilities(raw: RawFile) {
  if (raw.category !== "boss_ability") throw new Error("能力卡来源类别不符");
  return ruinsBossAbilitiesSchema.parse({
    schema: "ddbg-ruins-boss-abilities-v1",
    textOnly: true,
    cards: ruinsBossAbilityManifest.map(([page, bossId, name, level, actionsPerRound]) => {
      const { id, card, front, lines, textLines } = readBossAbilityFront(
        raw,
        page,
        name,
        actionsPerRound,
        "遗迹能力卡身份/等级/双面页码漂移",
      );
      const back = card.faces.back;
      const roman = ["I", "II", "III"][level - 1];
      if (
        back?.page !== page ||
        !lines[0]?.endsWith(`} ${roman}`) ||
        !back.lines[0]?.text.endsWith(`} ${roman}`)
      )
        throw new Error(`遗迹能力卡身份/等级/双面页码漂移：${id}`);
      return {
        id,
        bossId,
        name,
        level,
        actionsPerRound,
        sourcePage: page,
        front: { sourceFile: front.file, textLines },
        back: { sourceFile: back.file, textLines: back.lines.slice(1).map((l) => l.text) },
      };
    }),
  });
}
