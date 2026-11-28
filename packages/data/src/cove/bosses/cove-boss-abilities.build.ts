import type { RawFile } from "../../shared/extract/raw";
import {
  COVE_BOSS_ABILITIES_BACK,
  COVE_BOSS_ABILITIES_FRONT,
  coveBossAbilitiesSchema,
  coveBossAbilityManifest,
  type CoveBossId,
} from "./cove-boss-abilities";

function lineTexts(card: RawFile["cards"][number], face: "front" | "back") {
  return card.faces[face]?.lines.map((line) => line.text) ?? [];
}

function requireCard(raw: RawFile, page: number) {
  const id = `boss_ability:cove:p${String(page).padStart(3, "0")}`;
  const matches = raw.cards.filter((card) => card.id === id);
  if (matches.length !== 1 || matches[0]?.source_set !== "extension")
    throw new Error(`Cove 能力卡漂移：${id}`);
  const card = matches[0];
  const front = card.faces.front;
  const back = card.faces.back;
  if (front.page !== page || back?.page !== page) throw new Error(`Cove 能力卡页码漂移：${id}`);
  if (front.file !== COVE_BOSS_ABILITIES_FRONT || back?.file !== COVE_BOSS_ABILITIES_BACK)
    throw new Error(`Cove 能力卡来源漂移：${id}`);
  return card;
}

function sliceAfterName(lines: readonly string[], name: string) {
  const nameIndex = lines.findIndex((line) => line === name);
  if (nameIndex < 0) throw new Error(`Cove 能力卡缺少名称行：${name}`);
  return lines.slice(nameIndex + 1);
}

/** 仅核对印刷文字与身份；不推断图标含义或战斗规则。 */
export function buildCoveBossAbilities(raw: RawFile) {
  if (raw.category !== "boss_ability") throw new Error("能力卡来源类别不符");
  return coveBossAbilitiesSchema.parse({
    schema: "ddbg-cove-boss-abilities-v1",
    textOnly: true,
    cards: coveBossAbilityManifest.map((row) => {
      const [page, bossId, name, level, cardRole] = row;
      const actionsPerRound = row.length === 6 ? row[5] : null;
      const card = requireCard(raw, page);
      const frontLines = lineTexts(card, "front");
      const backLines = lineTexts(card, "back");
      if (!frontLines.includes(name))
        throw new Error(
          `Cove 能力卡 FRONT 缺名称：boss_ability:cove:p${String(page).padStart(3, "0")}`,
        );

      let frontBody: string[];
      if (cardRole === "description") {
        frontBody = sliceAfterName(frontLines, name);
      } else {
        const label = `ACTIONS / Round: ${actionsPerRound}`;
        const actionIndex = frontLines.indexOf(label);
        if (actionIndex < 0)
          throw new Error(
            `Cove 能力卡缺行动标签：boss_ability:cove:p${String(page).padStart(3, "0")}`,
          );
        frontBody = frontLines.slice(actionIndex + 1);
      }

      const backBody = backLines.length > 1 ? backLines.slice(1) : backLines;

      return {
        id: card.id,
        bossId: bossId as CoveBossId,
        name,
        level,
        cardRole,
        actionsPerRound,
        sourcePage: page,
        boss: true as const,
        poolEligible: false as const,
        combatReady: false as const,
        front: { sourceFile: COVE_BOSS_ABILITIES_FRONT, textLines: frontBody },
        back: { sourceFile: COVE_BOSS_ABILITIES_BACK, textLines: backBody },
      };
    }),
  });
}
