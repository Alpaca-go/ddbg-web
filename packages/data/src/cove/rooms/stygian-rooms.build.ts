import type { RawFile } from "../../shared/extract/raw";
import type { z } from "zod";
import { coveRoomFileSchema } from "./room";
import {
  COVE_STYGIAN_PENDING,
  COVE_STYGIAN_ROOM_FRONT,
  coveStygianRoomIdentity,
  coveStygianRoomsSchema,
  validateCoveStygianRoomNames,
} from "./stygian-rooms";

type CoveRoomFile = z.infer<typeof coveRoomFileSchema>;

function stripIcons(line: string) {
  return line.replace(/\{icon:[^}]+\}/g, "").trim();
}

function parsePrintedName(lines: readonly string[], page: number): string {
  const cleaned = lines.map(stripIcons).filter((line) => line.length > 0);
  const titleLine =
    cleaned.find((line) => new RegExp(`^${page}\\s*[—–-]`).test(line)) ??
    cleaned.find((line) => /[—–-]/.test(line)) ??
    cleaned[0];
  if (!titleLine) throw new Error(`Cove Stygian 房间 p${page} 无法解析标题`);
  const name = titleLine.replace(/^\d+\s*[—–-]\s*/, "").trim();
  if (!name) throw new Error(`Cove Stygian 房间 p${page} 无法解析名称`);
  return name;
}

/** 保留印刷转录；效果未核准，一律 Q-186 停点；`source.back` 为 null（印刷包无 Stygian BACK）。 */
export function buildCoveStygianRooms(raw: RawFile, standardRooms: CoveRoomFile) {
  if (raw.category !== "stygian_room" || raw.cards.length !== 9)
    throw new Error("需要完整 9 张 Cove Stygian 房间 raw");
  if (!raw.sources.some((source) => source.back === null && source.back_pages === null))
    throw new Error("Cove Stygian raw 须登记 FRONT-only 来源（back 为 null）");
  const file = coveStygianRoomsSchema.parse({
    schema: "ddbg-cove-stygian-rooms-v1",
    cards: [...raw.cards]
      .sort((a, b) => a.faces.front.page - b.faces.front.page)
      .map((card) => {
        const front = card.faces.front;
        const identity = coveStygianRoomIdentity(front.page);
        if (
          card.source_set !== "extension" ||
          card.copies !== 1 ||
          front.file !== COVE_STYGIAN_ROOM_FRONT ||
          card.faces.back !== undefined ||
          card.id !== `stygian_room:cove:p${String(front.page).padStart(3, "0")}`
        )
          throw new Error("Cove Stygian 房间来源/份数/FRONT-only 或 ID 不一致");
        const lines = front.lines.map((line) => line.text);
        const name = parsePrintedName(lines, front.page);
        return {
          id: `stygian_room:cove:${String(front.page).padStart(2, "0")}`,
          name,
          copies: 1 as const,
          ...identity,
          printedLines: lines,
          pendingReview: [COVE_STYGIAN_PENDING],
          expeditionRoomPoolEligible: false as const,
          source: {
            front: COVE_STYGIAN_ROOM_FRONT,
            back: null,
            page: front.page,
          },
        };
      }),
  });
  validateCoveStygianRoomNames(file, standardRooms);
  return file;
}
