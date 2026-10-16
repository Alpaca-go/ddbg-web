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
      if (
        i === 0 &&
        (card.id !== "hamlet_event:p001" ||
          front.page !== 1 ||
          match[1] !== "ef839b6878" ||
          match[2] !== "2" ||
          match[3] !== "Supply Run" ||
          JSON.stringify(effectLines) !==
            JSON.stringify(["Party gains +2 {icon:d712688f15}", "before the next Quest."]))
      )
        throw new Error("Supply Run身份或完整效果行漂移（R-048/R-085）");
      if (
        i === 15 &&
        (card.id !== "hamlet_event:p016" ||
          front.page !== 16 ||
          match[1] !== "9d38361e87" ||
          match[2] !== "?" ||
          match[3] !== "Militia Training" ||
          JSON.stringify(effectLines) !==
            JSON.stringify([
              "All Heroes can Level Up",
              "one Lvl 1 Skill. If they",
              "do, 0 days. Else 3 days.",
            ]))
      )
        throw new Error("Militia Training身份或完整效果行漂移（R-048/R-077）");
      if (
        i === 8 &&
        (card.id !== "hamlet_event:p009" ||
          front.page !== 9 ||
          match[1] !== "ef839b6878" ||
          match[2] !== "2" ||
          match[3] !== "Gypsy Trail" ||
          JSON.stringify(effectLines) !==
            JSON.stringify(["Heroes gain +5 {icon:08a25c05cf} when", "selling Trinkets."]))
      )
        throw new Error("Gypsy Trail身份或完整效果行漂移（R-048/R-085）");
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
          i === 0
            ? "supplyRun"
            : i === 1
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
                        : i === 8
                          ? "gypsyTrail"
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
                                    : i === 15
                                      ? "militiaTraining"
                                      : "unimplemented",
      };
    }),
  });
}
