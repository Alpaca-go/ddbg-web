import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cardContentPack } from "../content-packs";
import { rawFileSchema } from "../extract/raw";
import { roomCatalogSchema } from "../room";
import { coveBossRoomSourceFileSchema, coveRoomFileSchema } from "../cove-room";
import { buildCoveBossRoomSources, buildCoveRooms } from "./cove-rooms";
import {
  loadNormalizedCoveBossRoomSources,
  loadNormalizedCoveRooms,
  writeNormalizedCoveRooms,
} from "./write-cove";

const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../${file}`, import.meta.url), "utf8")) as unknown;

if (process.env.WRITE_NORMALIZED === "1") writeNormalizedCoveRooms();

const builtRooms = loadNormalizedCoveRooms();
const builtBossSources = loadNormalizedCoveBossRoomSources();

describe("Cove 普通房间与 Boss 来源（R-001、R-048、包隔离）", () => {
  it("重建结果与提交的 normalized 文件一致", () => {
    expect(coveRoomFileSchema.parse(read("normalized/extension/cove/room.json"))).toEqual(
      builtRooms,
    );
    expect(
      coveBossRoomSourceFileSchema.parse(read("normalized/extension/cove/boss_room_sources.json")),
    ).toEqual(builtBossSources);
  });

  it("九张普通房间均属 cove 命名空间，核心目录不接纳", () => {
    for (const card of builtRooms.cards) {
      expect(cardContentPack(card)).toBe("cove");
      expect(card.boss).toBe(false);
      expect(card.pendingReview[0]).toContain("Q-186");
    }
    expect(roomCatalogSchema.safeParse(builtRooms.cards).success).toBe(false);
  });

  it("Boss 房仅登记来源，poolEligible=false，不进入九房目录", () => {
    for (const card of builtBossSources.cards) {
      expect(card.boss).toBe(true);
      expect(card.poolEligible).toBe(false);
      expect(cardContentPack(card)).toBe("cove");
      expect(card.classificationEvidence.some((line) => line.includes("BOSS"))).toBe(true);
    }
    const normalIds = new Set(builtRooms.cards.map((c) => c.id));
    for (const boss of builtBossSources.cards) expect(normalIds.has(boss.id)).toBe(false);
  });

  it("名称与页码绑定；raw 页码漂移会失败", () => {
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
      buildCoveBossRoomSources({
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

  it("逐页登记九张普通房间名称", () => {
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
    ]);
  });
});
