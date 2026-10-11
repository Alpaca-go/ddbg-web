import type { RawFile } from "../extract/raw";
import { ROOM_FRONT, ROOM_BACK, roomIdentity, roomFileSchema } from "../room";

export function buildRooms(raw: RawFile) {
  if (raw.category !== "room" || raw.cards.length !== 25)
    throw new Error("需要完整核心盒 Room raw");
  return roomFileSchema.parse({
    schema: "ddbg-room-v1",
    cards: raw.cards.map((card) => {
      const front = card.faces.front;
      if (
        front.file !== ROOM_FRONT ||
        card.faces.back?.file !== ROOM_BACK ||
        card.faces.back.page !== front.page ||
        card.copies !== 1
      )
        throw new Error("Room 来源、页码或份数不一致");
      const lines = front.lines.map((line) => line.text);
      const identity = roomIdentity(front.page);
      // 顶部标题后接数字 / 地点图标；原效果文本与图标 ID 完整保留。
      const title = lines[0]!.replace(/\s*\{icon:[^}]+\}/g, "").trim();
      const name = title.replace(/^\d+\s*[—–-]\s*/, "").trim();
      if (!title.startsWith(`${identity.number}—`)) throw new Error("缺少印刷房间编号");
      return {
        id: card.id,
        name,
        copies: card.copies,
        ...identity,
        printedLines: lines,
        source: { front: front.file, back: card.faces.back.file, page: front.page },
      };
    }),
  });
}
