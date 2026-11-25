import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cardContentPack } from "../../../src/shared/content-packs";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import { roomCatalogSchema } from "../../../src/core/rooms/room";
import { coveRoomFileSchema } from "../../../src/cove/rooms/room";
import { buildCoveRooms } from "../../../src/cove/rooms/rooms.build";
import { loadNormalizedCoveRooms, writeNormalizedCoveRooms } from "../../../src/shared/write-cove";

const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8")) as unknown;

if (process.env.WRITE_NORMALIZED === "1") writeNormalizedCoveRooms();

const builtRooms = loadNormalizedCoveRooms();

describe("Cove 十二张房间（R-001、R-048、包隔离）", () => {
  it("重建结果与提交的 normalized 文件一致", () => {
    expect(coveRoomFileSchema.parse(read("normalized/extension/cove/room.json"))).toEqual(
      builtRooms,
    );
  });

  it("九张普通房间均属 cove 命名空间，核心目录不接纳", () => {
    const normal = builtRooms.cards.filter((card) => !card.boss);
    expect(normal).toHaveLength(9);
    for (const card of normal) {
      expect(cardContentPack(card)).toBe("cove");
      expect(card.pendingReview[0]).toContain("Q-186");
    }
    expect(roomCatalogSchema.safeParse(normal).success).toBe(false);
  });

  it("三张 Boss 房是 room 卡，poolEligible=false，不进入普通房间牌堆", () => {
    const boss = builtRooms.cards.filter((card) => card.boss);
    expect(boss).toHaveLength(3);
    for (const card of boss) {
      expect(card.poolEligible).toBe(false);
      expect(cardContentPack(card)).toBe("cove");
      expect(card.classificationEvidence.some((line) => line.includes("BOSS"))).toBe(true);
    }
    const normalIds = new Set(builtRooms.cards.filter((c) => !c.boss).map((c) => c.id));
    for (const card of boss) expect(normalIds.has(card.id)).toBe(false);
  });

  it("名称与页码绑定；raw 页码或 BOSS 标签漂移会失败", () => {
    const raw = rawFileSchema.parse(read("extract/extension/cove/raw/room.json"));
    expect(() =>
      buildCoveRooms({
        ...raw,
        cards: raw.cards.map((card) =>
          card.id === "room:cove:p001" ? { ...card, id: "room:cove:p999" } : card,
        ),
      }),
    ).toThrow();
    expect(() =>
      buildCoveRooms({
        ...raw,
        cards: raw.cards.map((card) =>
          card.id === "room:cove:p010"
            ? {
                ...card,
                faces: {
                  ...card.faces,
                  front: {
                    ...card.faces.front,
                    lines: card.faces.front.lines.filter((line) => line.text.trim() !== "BOSS"),
                  },
                },
              }
            : card,
        ),
      }),
    ).toThrow();
  });

  it("逐页登记十二张房间名称", () => {
    expect(builtRooms.cards.map((c) => [c.number, c.name])).toEqual([
      [1, "Eldritch Augmentation"],
      [2, "Flooded Room"],
      [3, "The Hoarders"],
      [4, "Buried Treasures"],
      [5, "Twin Idols"],
      [6, "Lairs in Tunnels"],
      [7, "Shipwreck"],
      [8, "Sea Rites"],
      [9, "Temple of the Deep One"],
      [10, "Siren’s Room"],
      [11, "Shambler’s Room"],
      [12, "Drowned Crew Room"],
    ]);
  });
});
