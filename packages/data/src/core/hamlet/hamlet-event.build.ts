import { printSourceIcon, printIcon, printLine } from "../../shared/print-icons";
import type { RawFile } from "../../shared/extract/raw";
import { hamletEventFileSchema } from "./hamlet-event";
// 完整卡面已逐页复核。阈值区分效果行/风味；未批准效果图标仅保留原ID。
const effectY = [95, 94, 95, 101, Infinity, 91, 93, 86, 96, 94, 94, 94, 91, 86, 92, 94];
// R-077：仅Hamlet Event正面左上角。occupancy_pips（词典 324）的全局occupancy语义保持原样。
const badges: Record<string, string> = {
  [printIcon("preparation_days", 307)]: "2",
  [printSourceIcon("corebox/raw/hamlet_event.json:hamlet_event:p003:front:0")]: "4",
  [printIcon("preparation_days", 315)]: "3",
  [printIcon("occupancy_pips", 324)]: "1",
  [printSourceIcon("corebox/raw/hamlet_event.json:hamlet_event:p016:front:0")]: "?",
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
          match[1] !== printIcon("preparation_days", 307) ||
          match[2] !== "2" ||
          match[3] !== "Supply Run" ||
          JSON.stringify(effectLines) !==
            JSON.stringify([
              printLine(
                "Party gains +2 {extract:corebox/raw/hamlet_board.json:hamlet_board:p001:front:51}",
              ),
              "before the next Quest.",
            ]))
      )
        throw new Error("Supply Run身份或完整效果行漂移（R-048/R-085）");
      if (
        i === 15 &&
        (card.id !== "hamlet_event:p016" ||
          front.page !== 16 ||
          match[1] !== printSourceIcon("corebox/raw/hamlet_event.json:hamlet_event:p016:front:0") ||
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
          match[1] !== printIcon("preparation_days", 307) ||
          match[2] !== "2" ||
          match[3] !== "Gypsy Trail" ||
          JSON.stringify(effectLines) !==
            JSON.stringify([
              printLine(
                "Heroes gain +5 {extract:corebox/raw/hamlet_event.json:hamlet_event:p009:front:1} when",
              ),
              "selling Trinkets.",
            ]))
      )
        throw new Error("Gypsy Trail身份或完整效果行漂移（R-048/R-085）");
      if (
        i === 9 &&
        (card.id !== "hamlet_event:p010" ||
          front.page !== 10 ||
          match[1] !== printIcon("occupancy_pips", 324) ||
          match[2] !== "1" ||
          match[3] !== "The Feast" ||
          JSON.stringify(effectLines) !==
            JSON.stringify([
              "Each Hero can choose to",
              printLine(
                "fully restore either {print:stress@29} or {extract:corebox/raw/hamlet_event.json:hamlet_event:p010:front:2} .",
              ),
            ]))
      )
        throw new Error("The Feast身份或完整效果行漂移（R-048/R-085/R-086）");
      if (
        i === 2 &&
        (card.id !== "hamlet_event:p003" ||
          front.page !== 3 ||
          match[1] !== printSourceIcon("corebox/raw/hamlet_event.json:hamlet_event:p003:front:0") ||
          match[2] !== "4" ||
          match[3] !== "Lost Shipment" ||
          JSON.stringify(effectLines) !==
            JSON.stringify([
              printLine(
                "Party rolls -2 {extract:corebox/raw/hamlet_board.json:hamlet_board:p001:front:51}",
              ),
              "before the next Quest.",
            ]))
      )
        throw new Error("Lost Shipment身份或完整效果行漂移（R-048/R-085/R-087）");
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
              : i === 2
                ? "lostShipment"
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
                            : i === 9
                              ? "feast"
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
