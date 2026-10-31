import type { RawFile } from "../extract/raw";
import { ruinsBossAbilitiesSchema, ruinsBossAbilityManifest } from "../ruins-boss-abilities";

/** 原始图标保留为占位符；不由印刷文本推断执行规则。 */
export function buildRuinsBossAbilities(raw: RawFile) {
  if (raw.category !== "boss_ability") throw new Error("能力卡来源类别不符");
  return ruinsBossAbilitiesSchema.parse({
    schema: "ddbg-ruins-boss-abilities-v1",
    textOnly: true,
    cards: ruinsBossAbilityManifest.map(([page, bossId, name, level, actionsPerRound]) => {
      const id = `boss_ability:p${String(page).padStart(3, "0")}`;
      const matches = raw.cards.filter((c) => c.id === id);
      const card = matches[0];
      const front = card?.faces.front;
      const back = card?.faces.back;
      const lines = front?.lines.map((l) => l.text) ?? [];
      const label = `ACTIONS / Round: ${actionsPerRound}`;
      const roman = ["I", "II", "III"][level - 1];
      if (
        matches.length !== 1 ||
        card?.source_set !== "base" ||
        front?.page !== page ||
        back?.page !== page ||
        !lines.includes(name) ||
        !lines.includes(label) ||
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
        front: { sourceFile: front.file, textLines: lines.slice(lines.indexOf(label) + 1) },
        back: { sourceFile: back.file, textLines: back.lines.slice(1).map((l) => l.text) },
      };
    }),
  });
}
