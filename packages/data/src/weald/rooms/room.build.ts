import type { RawFile } from "../../shared/extract/raw";
import { WEALD_ROOM_FRONT, WEALD_ROOM_BACK, wealdRoomFileSchema } from "./room";

const BOSS_PENDING = "Weald Boss 房留待专属 Boss 刀核准；不得进入普通房间牌堆";

const EFFECTS: Record<
  number,
  {
    summary: string;
    binding: "pending" | "partial" | "confirmed";
    ruling: "R-234" | "R-237" | "R-238" | "R-239";
  }
> = {
  1: {
    summary: "Toxic Mushrooms: 攻击未命中时该区域英雄 1 腐蚀 2t",
    binding: "confirmed",
    ruling: "R-239",
  },
  2: {
    summary: "Unprepared!: 战斗开始英雄减益 2t",
    binding: "confirmed",
    ruling: "R-234",
  },
  4: {
    summary: "Precious: 怪物在 D 结束回合使其他怪物增益 2t ×2",
    binding: "confirmed",
    ruling: "R-237",
  },
  5: {
    summary: "Poisonous Roots: 英雄在 B/D/E/G 结束回合 2 腐蚀 2t",
    binding: "confirmed",
    ruling: "R-238",
  },
  8: {
    summary: "Abyssal Puff: 本房间真菌被摧毁时所有怪物增益 2t",
    binding: "confirmed",
    ruling: "R-234",
  },
  9: {
    summary: "Ours! + Clearing（B 绿星绑定）",
    binding: "confirmed",
    ruling: "R-238",
  },
};

export function buildWealdRooms(raw: RawFile) {
  if (raw.category !== "room" || raw.cards.length !== 12)
    throw new Error("需要完整 Weald Room raw（12 面）");
  const cards = raw.cards
    .map((card) => {
      const front = card.faces.front;
      if (
        front.file !== WEALD_ROOM_FRONT ||
        card.faces.back?.file !== WEALD_ROOM_BACK ||
        card.faces.back.page !== front.page ||
        card.copies !== 1 ||
        card.id !== `room:weald:p${String(front.page).padStart(3, "0")}`
      )
        throw new Error("Weald 房间来源、页码或 ID 不一致");
      const lines = front.lines.map((line) => line.text);
      const titleLine =
        lines.find((line) =>
          new RegExp(`^\\s*(?:\\{icon:[^}]+\\}\\s*)*${front.page}[—–-]`).test(line),
        ) ?? lines[0]!;
      const title = titleLine.replace(/\s*\{icon:[^}]+\}/g, "").trim();
      const name = title.replace(/^\d+\s*[—–-]\s*/, "").trim();
      if (!name) throw new Error(`Weald 房间 p${front.page} 无法从印刷行解析名称`);
      const meta = EFFECTS[front.page];
      const base = {
        id: `room:weald:${String(front.page).padStart(2, "0")}`,
        name,
        copies: card.copies as 1,
        location: "weald" as const,
        number: front.page,
        printedLines: lines,
        source: { front: WEALD_ROOM_FRONT, back: WEALD_ROOM_BACK, page: front.page },
        verifiedEffect: meta
          ? {
              ruling: meta.ruling,
              summary: meta.summary,
              runtimeReady: false as const,
              effectAreaBinding: meta.binding,
            }
          : null,
      };
      if (front.page <= 9)
        return {
          ...base,
          boss: false as const,
          pendingReview: [],
        };
      const plain = lines.map((line) => line.replace(/\{icon:[^}]+\}/g, "").trim());
      if (!plain.some((line) => line === "BOSS"))
        throw new Error(`Weald p${front.page} 缺少印刷 BOSS 标签，不能归类为 Boss 房`);
      return {
        ...base,
        boss: true as const,
        poolEligible: false as const,
        classificationEvidence: [
          `印刷正文含独立一行「BOSS」（FRONT p${front.page}）`,
          `标题解析为「${name}」（p${front.page} 破折号标题行）`,
        ],
        pendingReview: [BOSS_PENDING],
      };
    })
    .sort((a, b) => a.number - b.number);
  return wealdRoomFileSchema.parse({ schema: "ddbg-weald-room-v1", cards });
}
