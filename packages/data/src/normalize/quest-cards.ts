import type { RawFile } from "../extract/raw";
import { basicQuests } from "../basic-quests";
import { questCardsSchema } from "../quest-cards";

/** R15 / QUEST：休息点与既有出征定义交叉核对，图标仍保留原始占位。 */
export function buildQuestCards(raw: RawFile) {
  if (raw.category !== "quest" || raw.cards.length !== 19) throw new Error("需要完整核心盒任务卡");
  return questCardsSchema.parse({
    schema: "ddbg-quest-cards-v1",
    cards: [...raw.cards]
      .sort((a, b) => a.faces.front.page - b.faces.front.page)
      .map((card) => {
        const front = card.faces.front,
          back = card.faces.back;
        const lines = front.lines.map((l) => l.text);
        const titleIndex = lines.findIndex((l) => /^\d+(?:\s|$)/.test(l));
        const title = lines[titleIndex]?.match(/^(\d+)\s*(.*)$/);
        const name = title?.[2] || lines[titleIndex + 1];
        const restPoints = Number(title?.[1]);
        const roman = lines[0]?.match(/\} (III|II|I)(?: |$)/)?.[1];
        const level = roman ? { I: 1, II: 2, III: 3 }[roman] : null;
        const existing = basicQuests.find((q) => q.id === card.id);
        const expectedName = existing?.name.replace(/ (III|II|I)$/, "");
        if (
          !existing ||
          name !== expectedName ||
          restPoints !== existing.restPoints ||
          (front.page !== 19 && level !== existing.level) ||
          (front.page === 19 && level !== null) ||
          card.source_set !== "base" ||
          card.copies !== 1 ||
          !back ||
          back.page !== front.page
        )
          throw new Error(`任务卡名称/休息点/等级/来源漂移：${card.id}`);
        const start = lines.indexOf("SPECIAL RULES"),
          end = lines.indexOf("XP");
        return {
          id: card.id,
          name,
          level,
          restPoints,
          printedLines: lines,
          specialRuleLines: start < 0 ? [] : lines.slice(start + 1, end),
          source: { front: front.file, back: back.file, page: front.page },
        };
      }),
  });
}
