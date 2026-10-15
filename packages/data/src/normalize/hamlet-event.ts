import type { RawFile } from "../extract/raw";
import { hamletEventFileSchema } from "../hamlet-event";
// 完整卡面已逐页复核。阈值区分效果行/风味；未批准效果图标仅保留原ID。
const effectY = [95, 94, 95, 101, Infinity, 91, 93, 86, 96, 94, 94, 94, 91, 86, 92, 94];
// R-077：仅Hamlet Event正面左上角。43aaf29bbb的全局occupancy语义保持原样。
const badges: Record<string, string> = {
  ef839b6878: "2",
  "61587999f3": "4",
  "1cdbcf4cc7": "3",
  "43aaf29bbb": "1",
  "9d38361e87": "?",
};
export function buildHamletEvents(raw: RawFile) {
  return hamletEventFileSchema.parse({
    schema: "ddbg-hamlet-event-v1",
    cards: raw.cards.map((card, i) => {
      const front = card.faces.front;
      const match = /^\{icon:([a-f0-9]{10})\} ([1-4?]) (.+)$/.exec(front.lines[0]?.text ?? "");
      if (!match) throw new Error(`村庄事件缺印刷标题/天数：${card.id}`);
      if (badges[match[1]!] !== match[2]) throw new Error(`村庄事件准备天数漂移：${card.id}`);
      const effectLines = front.lines
        .filter((line) => line.bbox[1] >= effectY[i]!)
        .map((line) => line.text);
      return {
        id: card.id,
        name: match[3],
        source: { file: front.file, page: front.page },
        dayBadge: { iconId: match[1], printed: match[2], status: "confirmed", ruling: "R-077" },
        days: match[2] === "?" ? null : Number(match[2]),
        printedLines: front.lines.map((line) => line.text),
        effectLines,
        effectIconIds: [
          ...new Set(
            effectLines.flatMap((line) =>
              [...line.matchAll(/\{icon:([a-f0-9]{10})\}/g)].map((m) => m[1]),
            ),
          ),
        ],
        permanentlyRemoved: effectLines.some((line) => line.includes("permanently")),
        runtime:
          i === 1
            ? "noCaretaker"
            : i === 3
              ? "unsettlingDarkness"
              : i === 4
                ? "none"
                : i === 5
                  ? "laborForce"
                  : i === 6
                    ? "townFair"
                    : i === 7
                      ? "travelingMerchants"
                      : i === 10
                        ? "removeDisease"
                        : i === 11
                          ? "removeQuirks"
                          : i === 12
                            ? "extraBlock"
                            : i === 13
                              ? "inGoodSpirits"
                              : i === 14
                                ? "guildTraining"
                                : "unimplemented",
      };
    }),
  });
}
