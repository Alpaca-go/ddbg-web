import type { RawFile } from "../extract/raw";
import {
  stygianRoomIdentity,
  stygianRoomsSchema,
  validateStygianRoomNames,
} from "../stygian-rooms";
import { buildRooms } from "./room";

/** 仅转录文字与已裁定替换身份，不把图标或布局解释为获批效果/几何。 */
export function buildStygianRooms(raw: RawFile, standardRaw: RawFile) {
  if (raw.category !== "stygian_room" || raw.cards.length !== 17)
    throw new Error("需要完整17张Stygian房间卡");
  const file = stygianRoomsSchema.parse({
    schema: "ddbg-stygian-rooms-v1",
    cards: [...raw.cards]
      .sort((a, b) => a.faces.front.page - b.faces.front.page)
      .map((card) => {
        const front = card.faces.front,
          back = card.faces.back;
        const identity = stygianRoomIdentity(front.page);
        if (card.source_set !== "base" || card.copies !== 1 || !back || back.page !== front.page)
          throw new Error("Stygian房间来源/份数/双面页码不一致");
        const lines = front.lines.map((l) => l.text);
        const titles = lines
          .map((l) => l.replace(/\{icon:[^}]+\}/g, "").trim())
          .filter((l) => /^\d+—/.test(l));
        if (titles.length !== 1 || !titles[0]!.startsWith(`${identity.number}—`))
          throw new Error("Stygian房间标题编号不一致");
        return {
          id: card.id,
          name: titles[0]!.replace(/^\d+—/, "").trim(),
          copies: 1,
          ...identity,
          printedLines: lines,
          source: { front: front.file, back: back.file, page: front.page },
        };
      }),
  });
  validateStygianRoomNames(file, buildRooms(standardRaw));
  return file;
}
