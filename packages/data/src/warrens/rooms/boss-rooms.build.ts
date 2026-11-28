import type { RawFile } from "../../shared/extract/raw";
import { WARRENS_ROOM_BACK, WARRENS_ROOM_FRONT } from "../print";
import { warrensBossRoomFileSchema, type WarrensBossRoomCard } from "./room";

const BOSS_PENDING = "Warrens Boss 房留待专属 Boss 刀核准；不得进入普通房间牌堆";

function stripIcons(line: string) {
  return line.replace(/\{icon:[^}]+\}/g, "").trim();
}

const EFFECTS: Record<
  number,
  { name: string; summary: string; pendingQuestions: readonly string[] }
> = {
  10: {
    name: "Poisonous Waters",
    summary: "英雄进入本房间区域时 suffer 1 + 未核实持续效果（OCR 3t）",
    pendingQuestions: ["Q-WARRENS-26"],
  },
  11: {
    name: "Flesh Room",
    summary: "Flesh Boss 房：印刷面无额外房间效果文案（规则书 Room+Tile 部署）",
    pendingQuestions: ["Q-WARRENS-27"],
  },
  12: {
    name: "Barricades",
    summary: "英雄进入区域时 suffer 2/Dungeon Level（图标语义待印核）",
    pendingQuestions: ["Q-WARRENS-28"],
  },
};

/** 从完整 room raw（含 p1–p12）构建 Boss 房 normalized；普通房由 #838 切片另行输出。 */
export function buildWarrensBossRooms(raw: RawFile) {
  if (raw.category !== "room" || raw.cards.length < 12)
    throw new Error("需要 Warrens Room raw 含 p10–p12（十二面）");
  const cards: WarrensBossRoomCard[] = [10, 11, 12].map((page) => {
    const card = raw.cards.find((entry) => entry.faces.front.page === page);
    if (!card) throw new Error(`raw 缺少 Warrens Boss 房 p${page}`);
    const front = card.faces.front;
    const back = card.faces.back;
    if (
      front.file !== WARRENS_ROOM_FRONT ||
      back?.file !== WARRENS_ROOM_BACK ||
      back.page !== front.page ||
      card.copies !== 1 ||
      card.id !== `room:warrens:p${String(front.page).padStart(3, "0")}`
    )
      throw new Error(`Warrens Boss 房 p${page} 来源、页码或 raw ID 不一致`);
    const lines = front.lines.map((line) => line.text);
    const plain = lines.map(stripIcons).filter((line) => line.length > 0);
    if (!plain.some((line) => line === "BOSS"))
      throw new Error(`Warrens p${page} 缺少印刷 BOSS 标签`);
    const titleLine = plain.find((line) => new RegExp(`^${page}\\s*[—–-]`).test(line)) ?? plain[0]!;
    const name = titleLine
      .replace(/^\d+\s*[—–-]\s*/, "")
      .replace(/\s+Room$/, "")
      .trim();
    const meta = EFFECTS[page]!;
    return {
      id: `room:warrens:${String(page).padStart(2, "0")}` as WarrensBossRoomCard["id"],
      name,
      copies: 1 as const,
      location: "warrens" as const,
      number: page,
      boss: true as const,
      poolEligible: false as const,
      printedLines: [...lines],
      source: { front: WARRENS_ROOM_FRONT, back: WARRENS_ROOM_BACK, page },
      verifiedEffect: {
        ruling: "R-001" as const,
        summary: meta.summary,
        runtimeReady: false as const,
        effectAreaBinding: "pending" as const,
        pendingQuestions: [...meta.pendingQuestions],
      },
      classificationEvidence: [
        `印刷正文含独立一行「BOSS」（FRONT p${page}）`,
        `标题解析为「${titleLine}」`,
        // 与未合并 #838 共存：该 PR normalized 仅含 p1–p9，Boss 房使用 room:warrens:10–12 而非 p010 旧草稿。
      ],
      pendingReview: [BOSS_PENDING, ...meta.pendingQuestions],
    };
  });
  return warrensBossRoomFileSchema.parse({ schema: "ddbg-warrens-boss-room-v0", cards });
}
