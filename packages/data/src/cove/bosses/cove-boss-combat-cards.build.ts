import type { RawFile } from "../../shared/extract/raw";
import {
  COVE_BOSS_LARGE_FRONT,
  COVE_BOSS_MEDIUM_FRONT,
  coveBossCombatCardManifest,
  coveBossCombatCardsSchema,
} from "./cove-boss-combat-cards";

const PENDING = "Q-186：Cove Boss 战斗／召唤卡未核准，不得进入 I 级普通怪物牌堆";

function printedName(lines: readonly string[]) {
  const raw = lines[0] ?? "";
  return raw.replace(/\{icon:[^}]+\}/g, "").trim();
}

function printedType(lines: readonly string[]) {
  return lines.find((line) => line.includes(" - ")) ?? "";
}

function requireMonsterCard(raw: RawFile, id: string, sourceFile: string) {
  const matches = raw.cards.filter((card) => card.id === id);
  if (matches.length !== 1 || matches[0]?.source_set !== "extension")
    throw new Error(`Cove Boss 战斗卡漂移：${id}`);
  const card = matches[0];
  const front = card.faces.front;
  if (front.file !== sourceFile) throw new Error(`Cove Boss 战斗卡来源漂移：${id}`);
  return card;
}

/** Boss 大型卡与专属召唤物：仅登记印刷身份与正文，不接 parsed 技能核准。 */
export function buildCoveBossCombatCards(mediumRaw: RawFile, largeRaw: RawFile) {
  if (mediumRaw.category !== "monster_medium" || largeRaw.category !== "monster_large")
    throw new Error("Cove Boss 战斗卡来源类别不符");

  return coveBossCombatCardsSchema.parse({
    schema: "ddbg-cove-boss-combat-cards-v1",
    textOnly: true,
    cards: coveBossCombatCardManifest.map((entry) => {
      const sourceFile = entry.size === "large" ? COVE_BOSS_LARGE_FRONT : COVE_BOSS_MEDIUM_FRONT;
      const raw = entry.size === "large" ? largeRaw : mediumRaw;
      const card = requireMonsterCard(raw, entry.id, sourceFile);
      const frontLines = card.faces.front.lines.map((line) => line.text);
      const name = printedName(frontLines);
      if (name !== entry.name)
        throw new Error(`Cove Boss 战斗卡名称漂移：${entry.id}（印刷「${name}」）`);
      const roman = ["I", "II", "III"][entry.level - 1] ?? "";
      if (!roman || !frontLines.some((line) => line.includes(roman)))
        throw new Error(`Cove Boss 战斗卡等级漂移：${entry.id}`);

      return {
        id: entry.id,
        bossId: entry.bossId,
        name: entry.name,
        level: entry.level,
        size: entry.size,
        role: entry.role,
        ...("roomId" in entry ? { roomId: entry.roomId } : {}),
        printedType: printedType(frontLines),
        sourcePage: card.faces.front.page,
        sourceFile,
        printedLines: frontLines,
        boss: true as const,
        poolEligible: false as const,
        combatReady: false as const,
        pendingReview: [PENDING],
      };
    }),
  });
}
