import type { RawFile } from "../../shared/extract/raw";
import {
  WARRENS_STYGIAN_ROOM_BACK,
  WARRENS_STYGIAN_ROOM_FRONT,
  validateWarrensStygianRoomNames,
  warrensStygianPendingReview,
  warrensStygianRoomIdentity,
  warrensStygianRoomsSchema,
} from "./stygian-rooms";

function assertPrintedDrift(page: number, printed: string, cardId: string) {
  const checks: Partial<Record<number, () => boolean>> = {
    1: () =>
      printed.includes("Infectious Mucus") &&
      printed.includes("discard a Provision") &&
      printed.includes("+1."),
    2: () =>
      printed.includes("Toxic Sewage") && printed.includes("suffer 2") && printed.includes("3t."),
    3: () =>
      printed.includes("Trash Search") &&
      printed.includes("Spend 1 action") &&
      printed.includes("4 Provisions"),
    4: () =>
      printed.includes("First wounded Monster") &&
      printed.includes("fully heal") &&
      printed.includes("2t") &&
      !printed.match(/[A-Za-z]+:\s*First wounded/),
    5: () =>
      printed.includes("Putrid Sewerage") &&
      printed.includes("Shinies") &&
      printed.includes("draw a Trinket"),
    6: () =>
      printed.includes("Infected Weaponry") && printed.includes("+3") && printed.includes("3t."),
    7: () =>
      printed.includes("Rotten Food Store") && printed.includes("3t") && printed.includes("2t."),
    8: () =>
      printed.includes("Blighted Water") && printed.includes("suffer 4") && printed.includes("2t."),
    9: () =>
      printed.includes("Sneak Attack") &&
      printed.includes("Corrupting Aura") &&
      printed.includes("Negative Quirk"),
  };
  const check = checks[page];
  if (check && !check()) throw new Error(`Warrens Stygian 房间核准效果的来源文字漂移：${cardId}`);
}

/** 保留印刷转录；结构化效果未接通，reviewedEffect 恒为 null。 */
export function buildWarrensStygianRooms(raw: RawFile) {
  if (raw.category !== "stygian_room" || raw.cards.length !== 9)
    throw new Error("需要完整 9 张 Warrens Stygian 房间 raw");
  const file = warrensStygianRoomsSchema.parse({
    schema: "ddbg-warrens-stygian-rooms-v1",
    cards: [...raw.cards]
      .sort((a, b) => a.faces.front.page - b.faces.front.page)
      .map((card) => {
        const front = card.faces.front;
        const back = card.faces.back;
        const identity = warrensStygianRoomIdentity(front.page);
        if (
          card.source_set !== "extension" ||
          card.copies !== 1 ||
          front.file !== WARRENS_STYGIAN_ROOM_FRONT ||
          !back ||
          back.file !== WARRENS_STYGIAN_ROOM_BACK ||
          back.page !== front.page ||
          card.id !== `stygian_room:warrens:p${String(front.page).padStart(3, "0")}`
        )
          throw new Error("Warrens Stygian 房间来源/份数/双面页码或 ID 不一致");
        const lines = front.lines.map((l) => l.text);
        const titleLine =
          lines.find((line) =>
            new RegExp(`^\\s*(?:\\{icon:[^}]+\\}\\s*)*${front.page}[—–-]`).test(line),
          ) ?? lines.find((line) => /^\d+[—–-]/.test(line.replace(/\{icon:[^}]+\}/g, "").trim()));
        if (!titleLine) throw new Error(`Warrens Stygian 房间 p${front.page} 无法解析标题`);
        const title = titleLine.replace(/\{icon:[^}]+\}/g, "").trim();
        const name = title.replace(/^\d+\s*[—–-]\s*/, "").trim();
        if (!name) throw new Error(`Warrens Stygian 房间 p${front.page} 无法解析名称`);
        const printed = lines.join(" ");
        assertPrintedDrift(front.page, printed, card.id);
        return {
          id: `stygian_room:warrens:${String(front.page).padStart(2, "0")}`,
          name,
          copies: 1 as const,
          ...identity,
          printedLines: lines,
          reviewedEffect: null,
          pendingReview: [...(warrensStygianPendingReview[front.page] ?? [])],
          source: {
            front: WARRENS_STYGIAN_ROOM_FRONT,
            back: WARRENS_STYGIAN_ROOM_BACK,
            page: front.page,
          },
        };
      }),
  });
  validateWarrensStygianRoomNames(file);
  return file;
}
