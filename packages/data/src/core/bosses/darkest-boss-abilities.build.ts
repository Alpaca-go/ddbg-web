import { readBossAbilityFront } from "./boss-ability-source.build";
import type { RawFile } from "../../shared/extract/raw";
import { darkestBossAbilitiesSchema } from "./darkest-boss-abilities";

const darkestBossAbilityManifest = [
  [26, "Templar Warlord", 2],
  [28, "Templar Impaler", 2],
  [30, "Mammoth Cyst", 2],
  [31, "White Cell Stalk", 2],
  [33, "Shuffling Horror", 2],
  [34, "Ancestor 1st Form", "special"],
  [35, "Ancestor 2nd Form", 2],
  [36, "Gestating Heart", 1],
  [37, "Heart of Darkness", 2],
] as const;

/** 印刷稿仅提供文字；原始图标保持占位符，不推断效果。 */
export function buildDarkestBossAbilities(raw: RawFile) {
  if (raw.category !== "boss_ability") throw new Error("能力卡来源类别不符");
  return darkestBossAbilitiesSchema.parse({
    schema: "ddbg-darkest-boss-abilities-v1",
    cards: darkestBossAbilityManifest.map(([page, name, actionsPerRound]) => {
      const { id, front, textLines } = readBossAbilityFront(
        raw,
        page,
        name,
        actionsPerRound,
        "最暗能力卡身份或行动数漂移",
      );
      return {
        id,
        name,
        sourceFile: front.file,
        sourcePage: page,
        actionsPerRound,
        textLines,
        combatReady: true,
      };
    }),
  });
}
