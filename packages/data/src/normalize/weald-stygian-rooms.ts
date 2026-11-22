import type { RawFile } from "../extract/raw";
import {
  WEALD_STYGIAN_ROOM_BACK,
  WEALD_STYGIAN_ROOM_FRONT,
  validateWealdStygianRoomNames,
  wealdStygianReviewedEffects,
  wealdStygianRoomIdentity,
  wealdStygianRoomsSchema,
} from "../weald-stygian-rooms";
import type { z } from "zod";
import { wealdRoomFileSchema } from "../weald-room";

type WealdRoomFile = z.infer<typeof wealdRoomFileSchema>;

function assertPrintedDrift(page: number, printed: string, cardId: string) {
  const checks: Partial<Record<number, () => boolean>> = {
    1: () => printed.includes("Toxic Mushrooms") && printed.includes("3t"),
    2: () => printed.includes("Unprepared!") && printed.includes("3t"),
    4: () =>
      printed.includes("Precious:") && printed.includes("3t, {icon:") && printed.includes("3t."),
    5: () => printed.includes("Poisonous Roots") && printed.includes("3t"),
    8: () =>
      printed.includes("Abyssal Puff") &&
      printed.includes("2t, {icon:") &&
      printed.includes("2t.") &&
      !printed.includes("3t"),
    9: () =>
      printed.includes("Ours!") &&
      printed.includes("3t.") &&
      !printed.includes("1t,") &&
      !printed.includes("{icon:e66649ddb5}"),
  };
  const check = checks[page];
  if (check && !check()) throw new Error(`Weald Stygian 房间核准效果的来源文字漂移：${cardId}`);
}

/** 保留印刷转录，并附加审阅结构化效果（有运行时接线的效果 runtimeReady 为 true）。 */
export function buildWealdStygianRooms(raw: RawFile, standardRooms: WealdRoomFile) {
  if (raw.category !== "stygian_room" || raw.cards.length !== 9)
    throw new Error("需要完整 9 张 Weald Stygian 房间 raw");
  const file = wealdStygianRoomsSchema.parse({
    schema: "ddbg-weald-stygian-rooms-v1",
    cards: [...raw.cards]
      .sort((a, b) => a.faces.front.page - b.faces.front.page)
      .map((card) => {
        const front = card.faces.front;
        const back = card.faces.back;
        const identity = wealdStygianRoomIdentity(front.page);
        if (
          card.source_set !== "extension" ||
          card.copies !== 1 ||
          front.file !== WEALD_STYGIAN_ROOM_FRONT ||
          !back ||
          back.file !== WEALD_STYGIAN_ROOM_BACK ||
          back.page !== front.page ||
          card.id !== `stygian_room:weald:p${String(front.page).padStart(3, "0")}`
        )
          throw new Error("Weald Stygian 房间来源/份数/双面页码或 ID 不一致");
        const lines = front.lines.map((l) => l.text);
        const titleLine =
          lines.find((line) =>
            new RegExp(`^\\s*(?:\\{icon:[^}]+\\}\\s*)*${front.page}[—–-]`).test(line),
          ) ?? lines.find((line) => /^\d+[—–-]/.test(line.replace(/\{icon:[^}]+\}/g, "").trim()));
        if (!titleLine) throw new Error(`Weald Stygian 房间 p${front.page} 无法解析标题`);
        const title = titleLine.replace(/\{icon:[^}]+\}/g, "").trim();
        const name = title.replace(/^\d+\s*[—–-]\s*/, "").trim();
        if (!name) throw new Error(`Weald Stygian 房间 p${front.page} 无法解析名称`);
        const reviewedEffect = wealdStygianReviewedEffects[front.page] ?? null;
        const printed = lines.join(" ");
        assertPrintedDrift(front.page, printed, card.id);
        return {
          id: `stygian_room:weald:${String(front.page).padStart(2, "0")}`,
          name,
          copies: 1 as const,
          ...identity,
          printedLines: lines,
          reviewedEffect,
          pendingReview: [],
          source: {
            front: WEALD_STYGIAN_ROOM_FRONT,
            back: WEALD_STYGIAN_ROOM_BACK,
            page: front.page,
          },
        };
      }),
  });
  validateWealdStygianRoomNames(file, standardRooms);
  return file;
}
