import type { RawFile } from "../extract/raw";
import { darkestBossAbilitiesSchema } from "../darkest-boss-abilities";

/** 印刷稿仅提供文字；原始图标保持占位符，不推断效果。 */
export function buildDarkestBossAbilities(raw: RawFile) {
  const rows = [
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
  if (raw.category !== "boss_ability") throw new Error("能力卡来源类别不符");
  return darkestBossAbilitiesSchema.parse({
    schema: "ddbg-darkest-boss-abilities-v1",
    cards: rows.map(([page, name, actionsPerRound]) => {
      const id = `boss_ability:p${String(page).padStart(3, "0")}`;
      const matches = raw.cards.filter((c) => c.id === id);
      const card = matches[0];
      const front = card?.faces.front;
      const lines = front?.lines.map((l) => l.text) ?? [];
      const label = `ACTIONS / Round: ${actionsPerRound === "special" ? "Special" : actionsPerRound}`;
      if (
        matches.length !== 1 ||
        card?.source_set !== "base" ||
        front?.page !== page ||
        !lines.includes(name) ||
        !lines.includes(label)
      )
        throw new Error(`最暗能力卡身份或行动数漂移：${id}`);
      return {
        id,
        name,
        sourceFile: front.file,
        sourcePage: page,
        actionsPerRound,
        textLines: lines.slice(lines.indexOf(label) + 1),
        combatReady: false,
      };
    }),
  });
}
